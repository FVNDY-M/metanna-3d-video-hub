import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

// Define the correct type that matches what Supabase returns
interface Video {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  video_url: string;
  category: string;
  views: number;
  likes_count: number;
  comments_count: number;
  visibility: string;
  is_suspended: boolean | null;
  created_at: string;
  updated_at: string;
  user_id: string;
  profiles?: {
    username: string;
    avatar_url: string | null;
  } | null;
}

// In your component
const ContentManagement = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVideos = async () => {
      setLoading(true);
      try {
        // Fetch all videos with creator information
        let { data, error } = await supabase
          .from('videos')
          .select(`
            *,
            profiles:user_id(username, avatar_url)
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Handle the data with proper types
        if (data) {
          const formattedVideos: Video[] = data.map(video => ({
            ...video,
            profiles: video.profiles || { username: 'Unknown', avatar_url: null }
          }));
          setVideos(formattedVideos);
        }
      } catch (error) {
        console.error('Error fetching videos:', error);
        toast("Failed to load videos");
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, []);

  const suspendVideo = async (videoId: string) => {
    try {
      const { error } = await supabase
        .from('videos')
        .update({ is_suspended: true })
        .eq('id', videoId);

      if (error) {
        console.error('Error suspending video:', error);
        toast("Failed to suspend video");
      } else {
        toast("Video suspended successfully");
        setVideos(videos.map(video =>
          video.id === videoId ? { ...video, is_suspended: true } : video
        ));
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      toast("An unexpected error occurred");
    }
  };

  const unsuspendVideo = async (videoId: string) => {
    try {
      const { error } = await supabase
        .from('videos')
        .update({ is_suspended: false })
        .eq('id', videoId);

      if (error) {
        console.error('Error unsuspending video:', error);
        toast("Failed to unsuspend video");
      } else {
        toast("Video unsuspended successfully");
        setVideos(videos.map(video =>
          video.id === videoId ? { ...video, is_suspended: false } : video
        ));
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      toast("An unexpected error occurred");
    }
  };

  return (
    <div>
      <h1>Content Management</h1>
      {loading ? (
        <p>Loading videos...</p>
      ) : (
        <ul>
          {videos.map(video => (
            <li key={video.id}>
              {video.title} - {video.profiles?.username}
              {video.is_suspended ? (
                <button onClick={() => unsuspendVideo(video.id)}>Unsuspend</button>
              ) : (
                <button onClick={() => suspendVideo(video.id)}>Suspend</button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ContentManagement;
