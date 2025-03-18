
// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://zdfwczmxucakglnyedrh.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkZndjem14dWNha2dsbnllZHJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE4OTI0MTAsImV4cCI6MjA1NzQ2ODQxMH0.95qxGNi8DGT_-IDmBGbWkr5cIzr_sD-Wx7klBej8pOQ";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// Function to increment video views
export const incrementVideoView = async (videoId: string, userId?: string) => {
  if (!videoId) return;

  // Update video views count using RPC function
  const { error } = await supabase.rpc('increment_count', { row_id: videoId });

  if (error) {
    console.error('Error incrementing view count:', error);
    return;
  }

  // If user is authenticated, add to watch history
  if (userId) {
    const { error: historyError } = await supabase
      .from('watch_history')
      .upsert(
        { 
          user_id: userId, 
          video_id: videoId,
          watched_at: new Date().toISOString()
        },
        { onConflict: 'user_id,video_id' }
      );

    if (historyError) {
      console.error('Error adding to watch history:', historyError);
    }
  }
};
