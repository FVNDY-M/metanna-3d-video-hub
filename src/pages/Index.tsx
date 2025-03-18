
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import PageLayout from '@/components/PageLayout';
import VideoCard from '@/components/VideoCard';
import EmptyState from '@/components/EmptyState';

const Index = () => {
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const isExplore = location.pathname === '/explore';
  const isTrending = location.pathname === '/trending';
  
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };
    
    fetchUser();
    
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null);
      }
    );
    
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Function to fetch subscribed channels
  const fetchSubscribedChannels = async (userId: string) => {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('creator_id')
      .eq('subscriber_id', userId);
    
    if (error) throw error;
    return data.map(sub => sub.creator_id);
  };

  // Query for videos from subscribed channels (Home page)
  const { data: homeVideos, isLoading: homeLoading } = useQuery({
    queryKey: ['homeVideos', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const subscribedChannels = await fetchSubscribedChannels(user.id);
      
      if (subscribedChannels.length === 0) return [];
      
      const { data, error } = await supabase
        .from('videos')
        .select(`
          *,
          profiles:user_id (
            username,
            avatar_url,
            subscriber_count
          )
        `)
        .in('user_id', subscribedChannels)
        .eq('visibility', 'public')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      
      return data.map(video => ({
        ...video,
        creator: {
          id: video.user_id,
          username: video.profiles.username,
          avatar: video.profiles.avatar_url,
          subscribers: video.profiles.subscriber_count
        }
      }));
    },
    enabled: !!user && !isExplore && !isTrending,
  });

  // Query for all public videos (Explore page)
  const { data: exploreVideos, isLoading: exploreLoading } = useQuery({
    queryKey: ['exploreVideos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('videos')
        .select(`
          *,
          profiles:user_id (
            username,
            avatar_url,
            subscriber_count
          )
        `)
        .eq('visibility', 'public')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      
      return data.map(video => ({
        ...video,
        creator: {
          id: video.user_id,
          username: video.profiles.username,
          avatar: video.profiles.avatar_url,
          subscribers: video.profiles.subscriber_count
        }
      }));
    },
    enabled: isExplore || (!user && !isTrending) || isTrending,
  });

  // Query for trending videos
  const { data: trendingVideos, isLoading: trendingLoading } = useQuery({
    queryKey: ['trendingVideos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('videos')
        .select(`
          *,
          profiles:user_id (
            username,
            avatar_url,
            subscriber_count
          )
        `)
        .eq('visibility', 'public')
        .order('views', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      
      return data.map(video => ({
        ...video,
        creator: {
          id: video.user_id,
          username: video.profiles.username,
          avatar: video.profiles.avatar_url,
          subscribers: video.profiles.subscriber_count
        }
      }));
    },
    enabled: isTrending,
  });

  let videos = [];
  let isLoading = false;
  let pageTitle = 'Home';
  let emptyStateMessage = "Subscribe to creators to see their videos here!";
  
  if (isExplore) {
    videos = exploreVideos || [];
    isLoading = exploreLoading;
    pageTitle = 'Explore';
    emptyStateMessage = "No videos have been uploaded yet.";
  } else if (isTrending) {
    videos = trendingVideos || [];
    isLoading = trendingLoading;
    pageTitle = 'Trending';
    emptyStateMessage = "No trending videos available.";
  } else {
    // Home page - show subscribed videos if logged in, or explore videos if not
    if (user) {
      videos = homeVideos || [];
      isLoading = homeLoading;
    } else {
      videos = exploreVideos || [];
      isLoading = exploreLoading;
      emptyStateMessage = "Log in to see videos from channels you subscribe to.";
    }
  }

  return (
    <PageLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold mb-6">{pageTitle}</h1>
        
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-video bg-gray-200 rounded-xl mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : videos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {videos.map((video) => (
              <VideoCard 
                key={video.id} 
                video={{
                  id: video.id,
                  title: video.title,
                  thumbnail: video.thumbnail_url || '/placeholder.svg',
                  videoUrl: video.video_url,
                  creator: video.creator,
                  likes: video.likes_count,
                  comments: video.comments_count,
                  immersions: video.views,
                  createdAt: video.created_at,
                  visibility: video.visibility,
                  category: video.category,
                  description: video.description
                }}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title={`No videos to show`}
            description={emptyStateMessage}
            icon="video"
          />
        )}
      </div>
    </PageLayout>
  );
};

export default Index;
