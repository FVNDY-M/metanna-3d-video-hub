
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import PageLayout from '@/components/PageLayout';
import VideoCard, { VideoData } from '@/components/VideoCard';
import EmptyState from '@/components/EmptyState';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger, TabsHeader } from '@/components/ui/tabs';

interface IndexProps {
  filter?: 'trending' | 'explore' | 'creator';
}

const Index: React.FC<IndexProps> = ({ filter }) => {
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [subscriptionVideos, setSubscriptionVideos] = useState<VideoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState(filter || 'explore');
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);
  const { id: creatorId } = useParams<{ id: string }>();

  // Fetch videos for the Explore section (all public videos)
  const fetchExploreVideos = async () => {
    setLoading(true);
    try {
      // Fetch videos from Supabase
      let query = supabase
        .from('videos')
        .select(`
          id,
          title,
          thumbnail_url,
          created_at,
          user_id,
          views,
          likes_count,
          comments_count,
          category
        `)
        .eq('visibility', 'public')
        .order('created_at', { ascending: false });
      
      // If viewing a specific creator's videos
      if (filter === 'creator' && creatorId) {
        query = query.eq('user_id', creatorId);
      }
      
      // If viewing trending videos
      if (filter === 'trending') {
        query = query.order('views', { ascending: false });
      }

      const { data: videosData, error } = await query;

      if (error) {
        throw error;
      }

      // For each video, fetch the creator information
      if (videosData) {
        const videosWithCreators = await Promise.all(
          videosData.map(async (video) => {
            // Fetch user profile data for each video
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('username, avatar_url, subscriber_count')
              .eq('id', video.user_id)
              .single();

            return {
              id: video.id,
              title: video.title,
              thumbnail: video.thumbnail_url,
              category: video.category,
              creator: {
                id: video.user_id,
                username: profileData?.username || 'Unknown Creator',
                avatar: profileData?.avatar_url,
                subscribers: profileData?.subscriber_count || 0
              },
              likes: video.likes_count || 0,
              comments: video.comments_count || 0,
              immersions: video.views || 0,
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

  // Fetch videos from subscribed channels for the Home section
  const fetchSubscriptionVideos = async () => {
    if (!currentUser) {
      setSubscriptionsLoading(false);
      return;
    }
    
    setSubscriptionsLoading(true);
    try {
      // First get all the creators the user is subscribed to
      const { data: subscriptions, error: subError } = await supabase
        .from('subscriptions')
        .select('creator_id')
        .eq('subscriber_id', currentUser.id);
        
      if (subError) throw subError;
      
      if (!subscriptions || subscriptions.length === 0) {
        setSubscriptionVideos([]);
        setSubscriptionsLoading(false);
        return;
      }
      
      // Get the creator IDs
      const creatorIds = subscriptions.map(sub => sub.creator_id);
      
      // Fetch videos from these creators
      const { data: videosData, error } = await supabase
        .from('videos')
        .select(`
          id,
          title,
          thumbnail_url,
          created_at,
          user_id,
          views,
          likes_count,
          comments_count,
          category
        `)
        .in('user_id', creatorIds)
        .eq('visibility', 'public')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (videosData) {
        const videosWithCreators = await Promise.all(
          videosData.map(async (video) => {
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('username, avatar_url, subscriber_count')
              .eq('id', video.user_id)
              .single();

            return {
              id: video.id,
              title: video.title,
              thumbnail: video.thumbnail_url,
              category: video.category,
              creator: {
                id: video.user_id,
                username: profileData?.username || 'Unknown Creator',
                avatar: profileData?.avatar_url,
                subscribers: profileData?.subscriber_count || 0
              },
              likes: video.likes_count || 0,
              comments: video.comments_count || 0,
              immersions: video.views || 0,
              createdAt: video.created_at,
            };
          })
        );

        setSubscriptionVideos(videosWithCreators);
      }
      
      setSubscriptionsLoading(false);
    } catch (error) {
      console.error('Error fetching subscription videos:', error);
      toast.error('Failed to load subscription videos');
      setSubscriptionsLoading(false);
    }
  };

  useEffect(() => {
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
        
        setCurrentUser({ id: data.session.user.id });
      }
    };

    checkUser();
  }, []);
  
  useEffect(() => {
    fetchExploreVideos();
  }, [filter, creatorId]);
  
  useEffect(() => {
    if (currentUser) {
      fetchSubscriptionVideos();
    }
  }, [currentUser]);

  return (
    <PageLayout user={user}>
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsHeader>
            <h1 className="text-2xl font-semibold text-gray-900 mb-4">
              {filter === 'creator' ? 'Creator Videos' : 
               filter === 'trending' ? 'Trending Videos' : 
               'Discover AR Experiences'}
            </h1>
          </TabsHeader>
          
          {!filter && (
            <TabsList className="mb-4">
              <TabsTrigger value="home">Home</TabsTrigger>
              <TabsTrigger value="explore">Explore</TabsTrigger>
            </TabsList>
          )}
          
          {!filter && (
            <>
              <TabsContent value="home">
                {currentUser ? (
                  subscriptionsLoading ? (
                    <div className="flex justify-center items-center py-20">
                      <div className="loader"></div>
                    </div>
                  ) : subscriptionVideos.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                      {subscriptionVideos.map((video) => (
                        <VideoCard key={video.id} video={video} />
                      ))}
                    </div>
                  ) : (
                    <EmptyState 
                      title="No subscription videos found" 
                      description="Videos from channels you subscribe to will appear here. Start by subscribing to some channels." 
                      icon="🎬" 
                    />
                  )
                ) : (
                  <EmptyState 
                    title="Sign in to see personalized content" 
                    description="Log in to see videos from channels you subscribe to." 
                    icon="🔒" 
                  />
                )}
              </TabsContent>
              
              <TabsContent value="explore">
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
              </TabsContent>
            </>
          )}
          
          {filter && (
            <div className="mt-4">
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
                <EmptyState 
                  title={filter === 'creator' ? 'No videos from this creator' : 'No videos found'} 
                  description={filter === 'creator' ? 'This creator hasn\'t uploaded any videos yet.' : 'Check back later for more content.'} 
                  icon="🎬" 
                />
              )}
            </div>
          )}
        </Tabs>
      </div>
    </PageLayout>
  );
};

export default Index;
