
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import PageLayout from '@/components/PageLayout';
import VideoCard, { VideoData } from '@/components/VideoCard';
import EmptyState from '@/components/EmptyState';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const LikedVideos = () => {
  const [likedVideos, setLikedVideos] = useState<VideoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserAndLikedVideos = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) return;
      
      setUserId(session.user.id);
      
      // Fetch video IDs from likes table
      const { data: likesData, error: likesError } = await supabase
        .from('likes')
        .select('video_id, created_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (likesError) {
        console.error('Error fetching liked videos:', likesError);
        setLoading(false);
        return;
      }

      if (likesData && likesData.length > 0) {
        // Fetch actual video data for each liked video
        const videoIds = likesData.map(item => item.video_id);
        
        const { data: videosData, error: videosError } = await supabase
          .from('videos')
          .select('*')
          .in('id', videoIds);

        if (videosError) {
          console.error('Error fetching videos:', videosError);
          setLoading(false);
          return;
        }

        if (videosData) {
          // Get creator information for each video
          const videoPromises = videosData.map(async (video) => {
            const { data: creatorData } = await supabase
              .from('profiles')
              .select('username, avatar_url, subscriber_count')
              .eq('id', video.user_id)
              .single();
              
            return {
              id: video.id,
              title: video.title,
              thumbnail: video.thumbnail_url || '',
              creator: {
                id: video.user_id,
                username: creatorData?.username || 'Unknown Creator',
                avatar: creatorData?.avatar_url || undefined,
                subscribers: creatorData?.subscriber_count || 0
              },
              likes: video.likes_count,
              comments: video.comments_count,
              immersions: video.views,
              createdAt: video.created_at
            } as VideoData;
          });
          
          const processedVideos = await Promise.all(videoPromises);
          setLikedVideos(processedVideos.filter(v => v !== null) as VideoData[]);
        }
      }
      
      setLoading(false);
    };

    fetchUserAndLikedVideos();
  }, []);

  return (
    <PageLayout>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Liked Videos</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-40 bg-gray-100 animate-pulse rounded-lg"></div>
              ))}
            </div>
          ) : likedVideos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {likedVideos.map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No liked videos"
              description="Videos you like will appear here."
              icon="❤️"
            />
          )}
        </CardContent>
      </Card>
    </PageLayout>
  );
};

export default LikedVideos;
