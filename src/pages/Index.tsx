import React, { useState, useEffect } from 'react';
import PageLayout from '@/components/PageLayout';
import VideoCard, { VideoData } from '@/components/VideoCard';
import EmptyState from '@/components/EmptyState';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger, TabsHeader } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Loader } from 'lucide-react';

interface IndexProps {
  filter?: string;
}

const VIDEOS_PER_PAGE = 12; // Number of videos to load at once

const Index: React.FC<IndexProps> = ({ filter = 'explore' }) => {
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [subscriptionVideos, setSubscriptionVideos] = useState<VideoData[]>([]);
  const [trendingVideos, setTrendingVideos] = useState<VideoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState(filter);
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);
  
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [trendingPage, setTrendingPage] = useState(1);
  const [trendingHasMore, setTrendingHasMore] = useState(true);
  const [trendingLoadingMore, setTrendingLoadingMore] = useState(false);
  const [subscriptionPage, setSubscriptionPage] = useState(1);
  const [subscriptionHasMore, setSubscriptionHasMore] = useState(true);
  const [subscriptionLoadingMore, setSubscriptionLoadingMore] = useState(false);

  useEffect(() => {
    setActiveTab(filter);
  }, [filter]);

  const fetchExploreVideos = async (pageNum = 1, append = false) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);
    
    try {
      const from = (pageNum - 1) * VIDEOS_PER_PAGE;
      const to = from + VIDEOS_PER_PAGE - 1;
      
      const { data: videosData, error, count } = await supabase
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
          category,
          is_suspended
        `, { count: 'exact' })
        .eq('visibility', 'public')
        .eq('is_suspended', false)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        throw error;
      }

      if (videosData) {
        const videosWithCreators = await Promise.all(
          videosData.map(async (video) => {
            const { data: profileData } = await supabase
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
              isSuspended: video.is_suspended
            };
          })
        );

        if (append) {
          setVideos(prev => [...prev, ...videosWithCreators]);
        } else {
          setVideos(videosWithCreators);
        }
        
        setHasMore(count !== null && from + videosData.length < count);
      }
      
    } catch (error) {
      console.error('Error fetching videos:', error);
      toast.error('Failed to load videos');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const fetchTrendingVideos = async (pageNum = 1, append = false) => {
    if (pageNum === 1) setTrendingLoading(true);
    else setTrendingLoadingMore(true);
    
    try {
      const from = (pageNum - 1) * VIDEOS_PER_PAGE;
      const to = from + VIDEOS_PER_PAGE - 1;
      
      const { data: videosData, error, count } = await supabase
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
          category,
          is_suspended
        `, { count: 'exact' })
        .eq('visibility', 'public')
        .eq('is_suspended', false)
        .order('views', { ascending: false })
        .range(from, to);

      if (error) {
        throw error;
      }

      if (videosData) {
        const videosWithCreators = await Promise.all(
          videosData.map(async (video) => {
            const { data: profileData } = await supabase
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
              isSuspended: video.is_suspended
            };
          })
        );

        if (append) {
          setTrendingVideos(prev => [...prev, ...videosWithCreators]);
        } else {
          setTrendingVideos(videosWithCreators);
        }
        
        setTrendingHasMore(count !== null && from + videosData.length < count);
      }
      
    } catch (error) {
      console.error('Error fetching trending videos:', error);
      toast.error('Failed to load trending videos');
    } finally {
      setTrendingLoading(false);
      setTrendingLoadingMore(false);
    }
  };

  const fetchSubscriptionVideos = async (pageNum = 1, append = false) => {
    if (!currentUser) {
      setSubscriptionsLoading(false);
      return;
    }
    
    if (pageNum === 1) setSubscriptionsLoading(true);
    else setSubscriptionLoadingMore(true);
    
    try {
      const { data: subscriptions, error: subError } = await supabase
        .from('subscriptions')
        .select('creator_id')
        .eq('subscriber_id', currentUser.id);
        
      if (subError) throw subError;
      
      if (!subscriptions || subscriptions.length === 0) {
        setSubscriptionVideos([]);
        setSubscriptionsLoading(false);
        setSubscriptionLoadingMore(false);
        setSubscriptionHasMore(false);
        return;
      }
      
      const creatorIds = subscriptions.map(sub => sub.creator_id);
      const from = (pageNum - 1) * VIDEOS_PER_PAGE;
      const to = from + VIDEOS_PER_PAGE - 1;
      
      const { data: videosData, error, count } = await supabase
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
          category,
          is_suspended
        `, { count: 'exact' })
        .in('user_id', creatorIds)
        .eq('visibility', 'public')
        .eq('is_suspended', false)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      if (videosData) {
        const videosWithCreators = await Promise.all(
          videosData.map(async (video) => {
            const { data: profileData } = await supabase
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
              isSuspended: video.is_suspended
            };
          })
        );

        if (append) {
          setSubscriptionVideos(prev => [...prev, ...videosWithCreators]);
        } else {
          setSubscriptionVideos(videosWithCreators);
        }
        
        setSubscriptionHasMore(count !== null && from + videosData.length < count);
      }
      
    } catch (error) {
      console.error('Error fetching subscription videos:', error);
      toast.error('Failed to load subscription videos');
    } finally {
      setSubscriptionsLoading(false);
      setSubscriptionLoadingMore(false);
    }
  };

  const loadMoreVideos = () => {
    setPage(prev => prev + 1);
    fetchExploreVideos(page + 1, true);
  };

  const loadMoreTrendingVideos = () => {
    setTrendingPage(prev => prev + 1);
    fetchTrendingVideos(trendingPage + 1, true);
  };

  const loadMoreSubscriptionVideos = () => {
    setSubscriptionPage(prev => prev + 1);
    fetchSubscriptionVideos(subscriptionPage + 1, true);
  };

  useEffect(() => {
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
    fetchTrendingVideos();
  }, []);
  
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
            <h1 className="text-2xl font-semibold text-gray-900 mb-4">Discover VR Experiences</h1>
          </TabsHeader>
          
          <TabsContent value="home">
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <div className="loader"></div>
              </div>
            ) : videos.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                  {videos.map((video) => (
                    <VideoCard key={video.id} video={video} />
                  ))}
                </div>
                
                {hasMore && (
                  <div className="flex justify-center mt-8">
                    <Button 
                      onClick={loadMoreVideos} 
                      disabled={loadingMore}
                      className="gap-2"
                    >
                      {loadingMore && <Loader className="h-4 w-4 animate-spin" />}
                      Load More Videos
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <EmptyState />
            )}
          </TabsContent>
          
          <TabsContent value="explore">
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <div className="loader"></div>
              </div>
            ) : videos.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                  {videos.map((video) => (
                    <VideoCard key={video.id} video={video} />
                  ))}
                </div>
                
                {hasMore && (
                  <div className="flex justify-center mt-8">
                    <Button 
                      onClick={loadMoreVideos} 
                      disabled={loadingMore}
                      className="gap-2"
                    >
                      {loadingMore && <Loader className="h-4 w-4 animate-spin" />}
                      Load More Videos
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <EmptyState />
            )}
          </TabsContent>
          
          <TabsContent value="trending">
            {trendingLoading ? (
              <div className="flex justify-center items-center py-20">
                <div className="loader"></div>
              </div>
            ) : trendingVideos.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                  {trendingVideos.map((video) => (
                    <VideoCard key={video.id} video={video} />
                  ))}
                </div>
                
                {trendingHasMore && (
                  <div className="flex justify-center mt-8">
                    <Button 
                      onClick={loadMoreTrendingVideos} 
                      disabled={trendingLoadingMore}
                      className="gap-2"
                    >
                      {trendingLoadingMore && <Loader className="h-4 w-4 animate-spin" />}
                      Load More Trending Videos
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <EmptyState title="No trending videos found" description="Check back later for trending content" icon="🔥" />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
};

export default Index;
