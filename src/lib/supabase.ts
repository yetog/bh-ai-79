import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for our database
export interface Profile {
  id: string
  email: string | null
  full_name: string | null
  created_at: string
  updated_at: string
}

export interface Content {
  id: string
  user_id: string
  title: string
  content_text: string | null
  content_type: string
  source: string | null
  file_path: string | null
  file_size: number | null
  metadata: any
  embedding: number[] | null
  processed_at: string | null
  created_at: string
}

export interface Insight {
  id: string
  user_id: string
  type: string
  title: string
  summary: string
  confidence_score: number
  related_content_ids: string[]
  metadata: any
  created_at: string
}

export interface ProcessingJob {
  id: string
  user_id: string
  content_id: string | null
  job_type: string
  status: string
  progress: number
  error_message: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
}