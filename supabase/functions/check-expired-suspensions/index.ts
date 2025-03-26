
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Get the Supabase URL and key from environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }
    
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const now = new Date().toISOString();
    console.log(`Checking for expired suspensions at ${now}`);
    
    // Check and lift user suspensions
    const { data: userUpdates, error: userError } = await supabase
      .from('profiles')
      .update({ is_suspended: false, suspension_end_date: null })
      .lt('suspension_end_date', now)
      .eq('is_suspended', true)
      .select('id, username');
      
    if (userError) {
      console.error('Error lifting expired user suspensions:', userError);
    } else {
      console.log(`Lifted suspensions for ${userUpdates?.length || 0} users`);
      
      // Log each user that was unsuspended
      if (userUpdates && userUpdates.length > 0) {
        userUpdates.forEach(user => {
          console.log(`User ${user.username} (${user.id}) has been automatically restored`);
          
          // Log the moderation action
          supabase
            .from('moderation_actions')
            .insert({
              admin_id: null, // System action
              action_type: 'user_auto_restore',
              target_type: 'user',
              target_id: user.id,
              details: { 
                username: user.username,
                reason: "Temporary suspension period ended"
              }
            }).then(({ error }) => {
              if (error) console.error('Error logging user restoration:', error);
            });
        });
      }
    }
    
    // Check and lift video suspensions
    const { data: videoUpdates, error: videoError } = await supabase
      .from('videos')
      .update({ is_suspended: false, suspension_end_date: null })
      .lt('suspension_end_date', now)
      .eq('is_suspended', true)
      .select('id, title, user_id');
      
    if (videoError) {
      console.error('Error lifting expired video suspensions:', videoError);
    } else {
      console.log(`Lifted suspensions for ${videoUpdates?.length || 0} videos`);
      
      // Log each video that was unsuspended
      if (videoUpdates && videoUpdates.length > 0) {
        videoUpdates.forEach(video => {
          console.log(`Video ${video.title} (${video.id}) has been automatically restored`);
          
          // Log the moderation action
          supabase
            .from('moderation_actions')
            .insert({
              admin_id: null, // System action
              action_type: 'video_auto_restore',
              target_type: 'video',
              target_id: video.id,
              details: { 
                video_title: video.title,
                reason: "Temporary suspension period ended"
              }
            }).then(({ error }) => {
              if (error) console.error('Error logging video restoration:', error);
            });
        });
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Expired suspensions check completed',
        users_unsuspended: userUpdates?.length || 0,
        videos_unsuspended: videoUpdates?.length || 0
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error) {
    console.error('Error in check-expired-suspensions function:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
