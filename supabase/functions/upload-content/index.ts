import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    const contentType = formData.get('contentType') as string
    const source = formData.get('source') as string || 'manual'

    if (!file) {
      throw new Error('No file provided')
    }

    // Generate unique file path
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('content-files')
      .upload(fileName, file)

    if (uploadError) {
      throw uploadError
    }

    // Extract text content based on file type
    let contentText = ''
    const fileType = file.type

    if (fileType.includes('text/') || fileExt === 'txt') {
      contentText = await file.text()
    } else if (fileExt === 'json') {
      // Handle chat export files
      const jsonContent = JSON.parse(await file.text())
      contentText = extractChatContent(jsonContent)
    } else {
      // For other file types, we'll process them later
      contentText = `[File: ${file.name}] - Content will be processed`
    }

    // Save content metadata to database
    const { data: contentData, error: contentError } = await supabaseClient
      .from('content')
      .insert({
        user_id: user.id,
        title: file.name,
        content_text: contentText,
        content_type: contentType || 'document',
        source: source,
        file_path: uploadData.path,
        file_size: file.size,
        metadata: {
          original_name: file.name,
          mime_type: file.type,
          uploaded_at: new Date().toISOString()
        }
      })
      .select()
      .single()

    if (contentError) {
      throw contentError
    }

    // Create a processing job for AI analysis
    const { error: jobError } = await supabaseClient
      .from('processing_jobs')
      .insert({
        user_id: user.id,
        content_id: contentData.id,
        job_type: 'embedding',
        status: 'pending'
      })

    if (jobError) {
      console.error('Error creating processing job:', jobError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        content: contentData,
        message: 'File uploaded successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error in upload-content function:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

function extractChatContent(jsonData: any): string {
  // Handle different chat export formats
  let messages: string[] = []

  if (jsonData.messages && Array.isArray(jsonData.messages)) {
    // WhatsApp format
    messages = jsonData.messages.map((msg: any) => {
      const timestamp = msg.timestamp || msg.date || ''
      const sender = msg.sender || msg.from || 'Unknown'
      const text = msg.text || msg.message || ''
      return `[${timestamp}] ${sender}: ${text}`
    })
  } else if (Array.isArray(jsonData)) {
    // Generic array format
    messages = jsonData.map((item: any, index: number) => {
      if (typeof item === 'string') return item
      if (item.text || item.message) return item.text || item.message
      return `Message ${index + 1}: ${JSON.stringify(item)}`
    })
  } else {
    // Fallback: stringify the entire object
    messages = [JSON.stringify(jsonData, null, 2)]
  }

  return messages.join('\n')
}