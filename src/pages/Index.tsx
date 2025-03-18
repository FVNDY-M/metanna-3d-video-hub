
import React, { useState, useEffect } from 'react';
import PageLayout from '@/components/PageLayout';
import VideoCard from '@/components/VideoCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import EmptyState from '@/components/EmptyState';
import { Video } from 'lucide-react';

interface IndexProps {
  filter?: string;
}

const Index: React.FC<IndexProps> = ({ filter = 'home' }) => {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(filter);

  useEffect(() => {
    setActiveTab(filter);
  }, [filter]);

  useEffect(() => {
    const fetchVideos = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('videos')
          .select(`
            id,
            title,
            description,
            thumbnail_url,
            video_url,
            user_id,
            created_at,
            views,
            likes_count,
            comments_count,
            category
          `)
          .eq('visibility', 'public');

        // Filter videos based on the active tab
        if (activeTab === 'trending') {
          query = query.order('views', { ascending: false });
        } else if (activeTab === 'explore') {
          // For explore, we'll show a diverse mix of categories
          query = query.order('created_at', { ascending: false });
        } else {
          // For home, we'll show the most recent videos
          query = query.order('created_at', { ascending: false });
        }

        // Limit to 20 videos per tab
        const { data: videoData, error } = await query.limit(20);

        if (error) throw error;

        if (videoData) {
          const processedVideos = await Promise.all(
            videoData.map(async (video) => {
              const { data: userData } = await supabase
                .from('profiles')
                .select('username, avatar_url, subscriber_count')
                .eq('id', video.user_id)
                .single();

              return {
                id: video.id,
                title: video.title,
                thumbnail: video.thumbnail_url,
                videoUrl: video.video_url,
                creator: {
                  id: video.user_id,
                  username: userData?.username || 'Unknown Creator',
                  avatar: userData?.avatar_url,
                  subscribers: userData?.subscriber_count || 0
                },
                category: video.category,
                likes: video.likes_count,
                comments: video.comments_count,
                immersions: video.views,
                createdAt: video.created_at
              };
            })
          );

          setVideos(processedVideos);
        }
      } catch (error) {
        console.error('Error fetching videos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, [activeTab]);

  return (
    <PageLayout>
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs 
          defaultValue={activeTab} 
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="mb-6">
            <TabsTrigger value="home">For You</TabsTrigger>
            <TabsTrigger value="explore">Explore</TabsTrigger>
            <TabsTrigger value="trending">Trending</TabsTrigger>
          </TabsList>

          {['home', 'explore', 'trending'].map((tab) => (
            <TabsContent key={tab} value={tab}>
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-pulse">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="bg-gray-200 rounded-lg aspect-video"></div>
                  ))}
                </div>
              ) : videos.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {videos.map((video) => (
                    <VideoCard key={video.id} video={video} />
                  ))}
                </div>
              ) : (
                <EmptyState 
                  title="No videos found" 
                  description={`There are no videos in the ${activeTab === 'home' ? 'For You' : activeTab === 'explore' ? 'Explore' : 'Trending'} section right now.`}
                  icon={<Video className="h-12 w-12 text-gray-400" />}
                />
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </PageLayout>
  );
};

export default Index;
