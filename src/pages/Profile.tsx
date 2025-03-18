import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import PageLayout from '@/components/PageLayout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import VideoCard from '@/components/VideoCard';
import EmptyState from '@/components/EmptyState';
import { User, Video, Heart, Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface ProfileData {
  id: string;
  username: string;
  bio: string | null;
  avatar_url: string | null;
  subscriber_count: number;
  created_at: string;
}

const Profile = () => {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [videos, setVideos] = useState<any[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchProfileAndVideos = async () => {
      setLoading(true);
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setCurrentUser(session.user);
        }
        
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('username', username)
          .single();
          
        if (profileError) {
          throw profileError;
        }
        
        if (profiles) {
          setProfile(profiles);
          
          const { data: userVideos, error: videosError } = await supabase
            .from('videos')
            .select('*')
            .eq('user_id', profiles.id)
            .eq('visibility', 'public')
            .order('created_at', { ascending: false });
            
          if (videosError) {
            throw videosError;
          }
          
          if (userVideos) {
            setVideos(userVideos.map(video => ({
              id: video.id,
              title: video.title,
              thumbnail: video.thumbnail_url,
              videoUrl: video.video_url,
              creator: {
                id: profiles.id,
                username: profiles.username,
                avatar: profiles.avatar_url,
                subscribers: profiles.subscriber_count
              },
              likes: video.likes_count,
              comments: video.comments_count,
              immersions: video.views,
              createdAt: video.created_at
            })));
          }
          
          if (session?.user) {
            const { data: subscription, error: subscriptionError } = await supabase
              .from('subscriptions')
              .select('*')
              .eq('subscriber_id', session.user.id)
              .eq('creator_id', profiles.id)
              .single();
              
            if (!subscriptionError && subscription) {
              setIsSubscribed(true);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (username) {
      fetchProfileAndVideos();
    }
  }, [username]);

  const handleSubscribe = async () => {
    if (!currentUser) {
      toast({
        title: "Authentication required",
        description: "Please log in to subscribe to creators",
        variant: "destructive"
      });
      return;
    }
    
    try {
      if (isSubscribed) {
        const { error } = await supabase
          .from('subscriptions')
          .delete()
          .match({ 
            subscriber_id: currentUser.id, 
            creator_id: profile?.id 
          });
          
        if (error) throw error;
        
        setIsSubscribed(false);
        setProfile(prev => prev ? {...prev, subscriber_count: Math.max(0, prev.subscriber_count - 1)} : null);
        
        toast({
          title: "Unsubscribed",
          description: `You've unsubscribed from ${profile?.username}`
        });
      } else {
        const { error } = await supabase
          .from('subscriptions')
          .insert({ 
            subscriber_id: currentUser.id, 
            creator_id: profile?.id 
          });
          
        if (error) throw error;
        
        setIsSubscribed(true);
        setProfile(prev => prev ? {...prev, subscriber_count: prev.subscriber_count + 1} : null);
        
        toast({
          title: "Subscribed",
          description: `You've subscribed to ${profile?.username}`
        });
      }
    } catch (error) {
      console.error('Error updating subscription:', error);
      toast({
        title: "Error",
        description: "There was an error updating your subscription",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <PageLayout>
        <div className="flex justify-center items-center py-32">
          <div className="loader"></div>
        </div>
      </PageLayout>
    );
  }

  if (!profile) {
    return (
      <PageLayout>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <EmptyState 
            title="User not found" 
            description="The user you are looking for does not exist."
            icon={<User className="h-12 w-12 text-gray-400" />}
          />
        </div>
      </PageLayout>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  return (
    <PageLayout>
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="rounded-xl overflow-hidden bg-gray-50 p-6 mb-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <Avatar className="h-24 w-24 md:h-32 md:w-32 border-4 border-white shadow-md">
              <AvatarImage src={profile.avatar_url || ''} alt={profile.username} />
              <AvatarFallback className="text-2xl font-bold bg-metanna-blue text-white">
                {profile.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-2xl md:text-3xl font-bold mb-2">{profile.username}</h1>
              <div className="text-gray-500 mb-4">
                <span>{profile.subscriber_count} subscribers</span>
                <span className="mx-2">•</span>
                <span>Joined {formatDate(profile.created_at)}</span>
              </div>
              
              {profile.bio && (
                <p className="text-gray-700 mb-4 max-w-xl">{profile.bio}</p>
              )}
              
              <div className="flex justify-center md:justify-start space-x-4">
                {currentUser?.id !== profile.id ? (
                  <Button 
                    variant={isSubscribed ? "outline" : "default"} 
                    className={`rounded-full ${isSubscribed ? 'border-metanna-blue text-metanna-blue' : 'bg-metanna-blue text-white'}`}
                    onClick={handleSubscribe}
                  >
                    {isSubscribed ? 'Subscribed' : 'Subscribe'}
                  </Button>
                ) : (
                  <Link to="/edit-profile">
                    <Button 
                      variant="outline" 
                      className="rounded-full border-metanna-blue text-metanna-blue"
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <Tabs defaultValue="videos" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="videos">Videos</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
          </TabsList>
          
          <TabsContent value="videos">
            {videos.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {videos.map((video) => (
                  <VideoCard key={video.id} video={video} />
                ))}
              </div>
            ) : (
              <EmptyState 
                title="No videos yet" 
                description={`${profile.username} hasn't uploaded any videos yet.`}
                icon={<Video className="h-12 w-12 text-gray-400" />}
              />
            )}
          </TabsContent>
          
          <TabsContent value="about">
            <div className="max-w-3xl bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">About {profile.username}</h2>
              
              {profile.bio ? (
                <p className="text-gray-700 mb-6">{profile.bio}</p>
              ) : (
                <p className="text-gray-500 italic mb-6">This user hasn't added a bio yet.</p>
              )}
              
              <div className="border-t border-gray-100 pt-4">
                <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">Stats</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-metanna-blue">{profile.subscriber_count}</p>
                    <p className="text-gray-500">Subscribers</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-metanna-blue">{videos.length}</p>
                    <p className="text-gray-500">Videos</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-metanna-blue">
                      {formatDate(profile.created_at)}
                    </p>
                    <p className="text-gray-500">Joined</p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
};

export default Profile;
