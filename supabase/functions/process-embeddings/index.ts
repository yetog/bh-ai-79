import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const IONOS_API_KEY = Deno.env.get('IONOS_API_KEY')
const IONOS_EMBEDDINGS_URL = 'https://openai.inference.de-txl.ionos.com/v1/embeddings'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { contentId } = await req.json()

    if (!contentId) {
      throw new Error('Content ID is required')
    }

    // Get content from database
    const { data: content, error: contentError } = await supabaseClient
      .from('content')
      .select('*')
      .eq('id', contentId)
      .single()

    if (contentError || !content) {
      throw new Error('Content not found')
    }

    // Update processing job status
    await supabaseClient
      .from('processing_jobs')
      .update({ status: 'processing', started_at: new Date().toISOString() })
      .eq('content_id', contentId)
      .eq('job_type', 'embedding')

    // Generate embeddings using IONOS Model Hub
    const embeddingResponse = await fetch(IONOS_EMBEDDINGS_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${IONOS_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: content.content_text,
        model: 'text-embedding-ada-002'
      }),
    })

    if (!embeddingResponse.ok) {
      throw new Error(`Embedding generation failed: ${embeddingResponse.statusText}`)
    }

    const embeddingData = await embeddingResponse.json()
    const embedding = embeddingData.data[0].embedding

    // Update content with embedding
    const { error: updateError } = await supabaseClient
      .from('content')
      .update({
        embedding: embedding,
        processed_at: new Date().toISOString()
      })
      .eq('id', contentId)

    if (updateError) {
      throw updateError
    }

    // Mark processing job as completed
    await supabaseClient
      .from('processing_jobs')
      .update({
        status: 'completed',
        progress: 100,
        completed_at: new Date().toISOString()
      })
      .eq('content_id', contentId)
      .eq('job_type', 'embedding')

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Embeddings generated successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error in process-embeddings function:', error)
    
    // Mark processing job as failed
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    const { contentId } = await req.json().catch(() => ({}))
    if (contentId) {
      await supabaseClient
        .from('processing_jobs')
        .update({
          status: 'failed',
          error_message: error.message,
          completed_at: new Date().toISOString()
        })
        .eq('content_id', contentId)
        .eq('job_type', 'embedding')
    }

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