
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import PageLayout from '@/components/PageLayout';
import VideoCard from '@/components/VideoCard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Pencil, UserCheck, UserPlus } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import { toast } from '@/components/ui/use-toast';

const UserProfile = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  
  // Fetch current user session
  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) {
        setCurrentUser(data.session.user);
      }
    };
    
    fetchCurrentUser();
  }, []);

  // Fetch profile data
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', username],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!username
  });

  // Fetch user's videos
  const { data: videos, isLoading: videosLoading } = useQuery({
    queryKey: ['userVideos', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('user_id', profile.id)
        .eq('visibility', 'public')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id
  });

  // Check if the current user is subscribed to this profile
  useEffect(() => {
    const checkSubscription = async () => {
      if (!currentUser || !profile) return;
      
      if (currentUser.id === profile.id) {
        // User can't subscribe to themselves
        return;
      }
      
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('subscriber_id', currentUser.id)
        .eq('creator_id', profile.id)
        .maybeSingle();
      
      if (error) {
        console.error('Error checking subscription:', error);
        return;
      }
      
      setIsSubscribed(!!data);
    };
    
    checkSubscription();
  }, [currentUser, profile]);

  // Handle subscription toggle
  const handleSubscribe = async () => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    
    if (currentUser.id === profile.id) {
      toast({
        title: "Cannot subscribe to yourself",
        description: "You cannot subscribe to your own channel.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      if (isSubscribed) {
        // Unsubscribe
        const { error } = await supabase
          .from('subscriptions')
          .delete()
          .eq('subscriber_id', currentUser.id)
          .eq('creator_id', profile.id);
        
        if (error) throw error;
        setIsSubscribed(false);
        toast({
          title: "Unsubscribed",
          description: `You are no longer subscribed to ${profile.username}.`,
        });
      } else {
        // Subscribe
        const { error } = await supabase
          .from('subscriptions')
          .insert({
            subscriber_id: currentUser.id,
            creator_id: profile.id
          });
        
        if (error) throw error;
        setIsSubscribed(true);
        toast({
          title: "Subscribed",
          description: `You are now subscribed to ${profile.username}.`,
        });
      }
    } catch (error) {
      console.error('Error toggling subscription:', error);
      toast({
        title: "Error",
        description: "There was an error processing your subscription. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle edit profile
  const handleEditProfile = () => {
    navigate('/edit-profile');
  };

  if (profileLoading) {
    return (
      <PageLayout>
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="flex items-center space-x-4">
              <div className="w-24 h-24 rounded-full bg-gray-200"></div>
              <div className="flex-1">
                <div className="h-6 bg-gray-200 rounded w-1/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (!profile) {
    return (
      <PageLayout>
        <div className="max-w-6xl mx-auto px-4 py-8">
          <EmptyState
            title="User not found"
            description="The user you're looking for doesn't exist."
            icon="user"
          />
        </div>
      </PageLayout>
    );
  }

  const isOwnProfile = currentUser && currentUser.id === profile.id;

  return (
    <PageLayout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="flex flex-wrap md:flex-nowrap items-center gap-6 mb-8">
          <Avatar className="w-24 h-24">
            <AvatarImage src={profile.avatar_url} alt={profile.username} />
            <AvatarFallback className="bg-metanna-blue text-white text-xl">
              {profile.username.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{profile.username}</h1>
            <p className="text-gray-600 mb-2">{profile.subscriber_count} subscribers</p>
            {profile.bio && <p className="text-gray-700">{profile.bio}</p>}
          </div>
          
          <div>
            {isOwnProfile ? (
              <Button onClick={handleEditProfile} className="flex items-center gap-2">
                <Pencil className="h-4 w-4" />
                Edit Profile
              </Button>
            ) : (
              <Button 
                onClick={handleSubscribe}
                variant={isSubscribed ? "outline" : "default"}
                className="flex items-center gap-2"
              >
                {isSubscribed ? (
                  <>
                    <UserCheck className="h-4 w-4" />
                    Subscribed
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Subscribe
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
        
        <Separator className="mb-6" />
        
        {/* Tabs for different content */}
        <Tabs defaultValue="videos" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="videos">Videos</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
          </TabsList>
          
          <TabsContent value="videos">
            {videosLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-video bg-gray-200 rounded-xl mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : videos && videos.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {videos.map((video) => (
                  <VideoCard
                    key={video.id}
                    video={{
                      id: video.id,
                      title: video.title,
                      thumbnail: video.thumbnail_url || '/placeholder.svg',
                      videoUrl: video.video_url,
                      creator: {
                        id: profile.id,
                        username: profile.username,
                        avatar: profile.avatar_url,
                        subscribers: profile.subscriber_count
                      },
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
                title="No videos yet"
                description={isOwnProfile ? "You haven't uploaded any videos yet." : "This user hasn't uploaded any videos yet."}
                icon="video"
              />
            )}
          </TabsContent>
          
          <TabsContent value="about">
            <div className="bg-gray-50 p-6 rounded-lg">
              <h2 className="text-lg font-semibold mb-4">About {profile.username}</h2>
              {profile.bio ? (
                <p className="text-gray-700">{profile.bio}</p>
              ) : (
                <p className="text-gray-500 italic">No bio provided.</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
};

export default UserProfile;
