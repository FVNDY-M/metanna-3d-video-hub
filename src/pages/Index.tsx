
import React, { useState, useEffect } from 'react';
import PageLayout from '@/components/PageLayout';
import VideoCard, { VideoData } from '@/components/VideoCard';
import EmptyState from '@/components/EmptyState';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Index = () => {
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchVideos = async () => {
      setLoading(true);
      try {
        // Fetch videos from Supabase
        const { data: videosData, error } = await supabase
          .from('videos')
          .select(`
            id,
            title,
            thumbnail_url,
            created_at,
            user_id,
            views
          `)
          .eq('visibility', 'public')
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }

        // For each video, fetch the creator information
        if (videosData) {
          const videosWithCreators = await Promise.all(
            videosData.map(async (video) => {
              // Fetch user profile data for each video
              const { data: profileData } = await supabase
                .from('profiles')
                .select('username, avatar_url')
                .eq('id', video.user_id)
                .single();

              // Calculate random values for likes, comments for demonstration
              // In a real app, these would come from their own tables
              const randomLikes = Math.floor(Math.random() * 1000);
              const randomComments = Math.floor(Math.random() * 200);

              return {
                id: video.id,
                title: video.title,
                thumbnail: video.thumbnail_url,
                creator: {
                  username: profileData?.username || 'Unknown Creator',
                  avatar: profileData?.avatar_url || `https://randomuser.me/api/portraits/men/${Math.floor(Math.random() * 100)}.jpg`,
                },
                likes: randomLikes,
                comments: randomComments,
                immersions: video.views,
                createdAt: video.created_at,
              };
            })
          );

          setVideos(videosWithCreators);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching videos:', error);
        toast.error('Failed to load videos');
        setLoading(false);
      }
    };

    fetchVideos();

    // Check if user is logged in
    const checkUser = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', data.session.user.id)
          .single();
          
        if (profileData) {
          setUser({
            username: profileData.username,
            avatar: profileData.avatar_url
          });
        }
      }
    };

    checkUser();
  }, []);

  return (
    <PageLayout user={user}>
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-8">Discover AR Experiences</h1>
        
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="loader"></div>
          </div>
        ) : videos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
            {videos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        ) : (
          <EmptyState />
        )}
      </div>
    </PageLayout>
  );
};

export default Index;
