import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const IONOS_API_KEY = Deno.env.get('IONOS_API_KEY')
const IONOS_CHAT_URL = 'https://openai.inference.de-txl.ionos.com/v1/chat/completions'

serve(async (req) => {
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

    const { timeframe = 'week', insight_type = 'weekly_recap' } = await req.json()

    // Calculate date range
    const now = new Date()
    let dateFrom = new Date()
    switch (timeframe) {
      case 'week':
        dateFrom.setDate(now.getDate() - 7)
        break
      case 'month':
        dateFrom.setMonth(now.getMonth() - 1)
        break
      case 'quarter':
        dateFrom.setMonth(now.getMonth() - 3)
        break
      default:
        dateFrom.setDate(now.getDate() - 7)
    }

    // Get user's content from the specified timeframe
    const { data: content, error: contentError } = await supabaseClient
      .from('content')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', dateFrom.toISOString())
      .order('created_at', { ascending: true })

    if (contentError) {
      throw contentError
    }

    if (!content || content.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          insight: {
            title: 'No Content Found',
            summary: `No content was found in the selected ${timeframe} timeframe. Upload some files or add content to get personalized insights.`,
            confidence_score: 0,
            related_content_ids: []
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Prepare content for AI analysis
    const contentSummary = content.map(item => ({
      id: item.id,
      title: item.title,
      type: item.content_type,
      source: item.source,
      date: item.created_at,
      preview: item.content_text ? item.content_text.substring(0, 500) + '...' : '',
    }))

    // Generate insights using IONOS Model Hub
    const systemPrompt = `You are an AI assistant specialized in analyzing personal knowledge and generating meaningful insights. Your task is to analyze the user's uploaded content and conversations to identify patterns, themes, and actionable insights.

Key analysis areas:
1. Recurring themes and topics
2. Communication patterns and relationships
3. Personal growth and learning areas
4. Productivity patterns and habits
5. Emotional patterns and sentiment trends
6. Knowledge gaps and learning opportunities

Generate insights that are:
- Personal and relevant to the user
- Actionable and specific
- Based on actual patterns in the data
- Encouraging and constructive
- Privacy-conscious (don't repeat sensitive details)

Format your response as a structured insight with:
- A compelling title
- A detailed summary (2-3 paragraphs)
- Key takeaways or recommendations
- Confidence level (0-100)
`

    const userPrompt = `Analyze the following content from the user's ${timeframe} and generate meaningful insights:

Content Summary:
${JSON.stringify(contentSummary, null, 2)}

Please provide a comprehensive analysis focusing on patterns, themes, and actionable insights. Be specific about what you observed and provide concrete recommendations for the user.`

    const aiResponse = await fetch(IONOS_CHAT_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${IONOS_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.1-8b-instruct',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 1000,
        temperature: 0.7
      }),
    })

    if (!aiResponse.ok) {
      throw new Error(`AI insight generation failed: ${aiResponse.statusText}`)
    }

    const aiData = await aiResponse.json()
    const insightText = aiData.choices[0].message.content

    // Parse and structure the insight
    const insight = {
      title: extractTitle(insightText) || `${timeframe.charAt(0).toUpperCase() + timeframe.slice(1)} Insights`,
      summary: insightText,
      confidence_score: calculateConfidenceScore(content.length),
      related_content_ids: content.map(item => item.id),
      metadata: {
        timeframe,
        content_count: content.length,
        generated_at: new Date().toISOString(),
        content_types: [...new Set(content.map(item => item.content_type))],
        sources: [...new Set(content.map(item => item.source))]
      }
    }

    // Save insight to database
    const { data: savedInsight, error: insertError } = await supabaseClient
      .from('insights')
      .insert({
        user_id: user.id,
        type: insight_type,
        title: insight.title,
        summary: insight.summary,
        confidence_score: insight.confidence_score,
        related_content_ids: insight.related_content_ids,
        metadata: insight.metadata
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error saving insight:', insertError)
      // Continue even if saving fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        insight: savedInsight || insight
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error in generate-insights function:', error)
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

function extractTitle(text: string): string | null {
  // Try to extract a title from the AI response
  const titlePatterns = [
    /^#+\s*(.+)$/m,
    /^(.+):\s*$/m,
    /^(.+)\s*-\s*Insights?$/m,
    /^(.{10,50})/
  ]
  
  for (const pattern of titlePatterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      return match[1].trim()
    }
  }
  
  return null
}

function calculateConfidenceScore(contentCount: number): number {
  // Calculate confidence based on amount of data available
  if (contentCount === 0) return 0
  if (contentCount < 3) return 30
  if (contentCount < 10) return 60
  if (contentCount < 50) return 80
  return 95
}