import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

import { IONOS_CONFIG, IONOS_HEADERS } from '../_shared/ionos-config.ts'

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

    const { query, filters = {}, limit = 10 } = await req.json()

    if (!query) {
      throw new Error('Search query is required')
    }

    // Generate embedding for the search query
    const embeddingResponse = await fetch(IONOS_CONFIG.EMBEDDINGS_URL, {
      method: 'POST',
      headers: IONOS_HEADERS,
      body: JSON.stringify({
        input: query,
        model: IONOS_CONFIG.EMBEDDING_MODEL
      }),
    })

    if (!embeddingResponse.ok) {
      throw new Error('Failed to generate query embedding')
    }

    const embeddingData = await embeddingResponse.json()
    const queryEmbedding = embeddingData.data[0].embedding

    // Build the query with filters
    let searchQuery = supabaseClient
      .from('content')
      .select('*')
      .eq('user_id', user.id)
      .not('embedding', 'is', null)

    // Apply filters if provided
    if (filters.content_type) {
      searchQuery = searchQuery.eq('content_type', filters.content_type)
    }
    if (filters.source) {
      searchQuery = searchQuery.eq('source', filters.source)
    }
    if (filters.date_from) {
      searchQuery = searchQuery.gte('created_at', filters.date_from)
    }
    if (filters.date_to) {
      searchQuery = searchQuery.lte('created_at', filters.date_to)
    }

    // Get all content for similarity search (we'll do client-side similarity for now)
    const { data: allContent, error: searchError } = await searchQuery

    if (searchError) {
      throw searchError
    }

    // Calculate similarity scores and sort
    const results = allContent
      .map(content => ({
        ...content,
        similarity: calculateCosineSimilarity(queryEmbedding, content.embedding),
        relevance_score: Math.round(calculateCosineSimilarity(queryEmbedding, content.embedding) * 100)
      }))
      .filter(item => item.similarity > 0.3) // Filter out very low similarity items
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)

    // Format results for frontend
    const formattedResults = results.map(result => ({
      id: result.id,
      title: result.title,
      content_text: result.content_text,
      content_type: result.content_type,
      source: result.source,
      created_at: result.created_at,
      relevance_score: result.relevance_score,
      metadata: result.metadata
    }))

    return new Response(
      JSON.stringify({
        success: true,
        results: formattedResults,
        total: formattedResults.length,
        query: query
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error in semantic-search function:', error)
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

function calculateCosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length')
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  normA = Math.sqrt(normA)
  normB = Math.sqrt(normB)

  if (normA === 0 || normB === 0) {
    return 0
  }

  return dotProduct / (normA * normB)
}