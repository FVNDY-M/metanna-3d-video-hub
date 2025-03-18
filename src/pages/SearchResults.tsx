
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageLayout from '@/components/PageLayout';
import VideoCard, { VideoData } from '@/components/VideoCard';
import EmptyState from '@/components/EmptyState';
import { Search, User, Video } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface UserProfile {
  id: string;
  username: string;
  avatar_url?: string;
  subscriber_count: number;
}

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  
  const [videoResults, setVideoResults] = useState<VideoData[]>([]);
  const [userResults, setUserResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('videos');
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const search = async () => {
      if (!query.trim()) {
        setVideoResults([]);
        setUserResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      
      try {
        // Search for videos
        const { data: videosData, error: videosError } = await supabase
          .from('videos')
          .select(`
            id,
            title,
            description,
            category,
            thumbnail_url,
            video_url,
            user_id,
            created_at,
            views,
            likes_count,
            comments_count,
            visibility
          `)
          .or(`title.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%`)
          .eq('visibility', 'public');
          
        if (videosError) {
          console.error('Error searching videos:', videosError);
          throw videosError;
        }

        // Get creators info for the videos
        if (videosData) {
          const videos = await Promise.all(
            videosData.map(async (video) => {
              const { data: creatorData } = await supabase
                .from('profiles')
                .select('username, avatar_url, subscriber_count')
                .eq('id', video.user_id)
                .single();

              return {
                id: video.id,
                title: video.title,
                thumbnail: video.thumbnail_url,
                videoUrl: video.video_url,
                description: video.description,
                category: video.category,
                creator: {
                  id: video.user_id,
                  username: creatorData?.username || 'Unknown Creator',
                  avatar: creatorData?.avatar_url,
                  subscribers: creatorData?.subscriber_count || 0
                },
                likes: video.likes_count || 0,
                comments: video.comments_count || 0,
                immersions: video.views || 0,
                createdAt: video.created_at
              } as VideoData;
            })
          );

          setVideoResults(videos);
        }

        // Search for users
        const { data: usersData, error: usersError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, subscriber_count')
          .ilike('username', `%${query}%`);

        if (usersError) {
          console.error('Error searching users:', usersError);
          throw usersError;
        }

        if (usersData) {
          setUserResults(usersData);
        }
      } catch (error) {
        console.error('Error during search:', error);
      } finally {
        setLoading(false);
      }
    };

    search();
  }, [query]);

  const renderVideoResults = () => {
    if (videoResults.length === 0) {
      return (
        <EmptyState 
          title="No videos found" 
          description={`We couldn't find any videos matching "${query}". Try different keywords.`}
          icon={<Video className="h-12 w-12 text-gray-400" />}
        />
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
        {videoResults.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>
    );
  };

  const renderUserResults = () => {
    if (userResults.length === 0) {
      return (
        <EmptyState 
          title="No users found" 
          description={`We couldn't find any users matching "${query}". Try different keywords.`}
          icon={<User className="h-12 w-12 text-gray-400" />}
        />
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 animate-fade-in">
        {userResults.map((user) => (
          <div key={user.id} className="flex flex-col items-center p-6 border rounded-lg hover:shadow-md transition-shadow">
            <Avatar className="h-20 w-20 mb-3">
              <AvatarImage src={user.avatar_url} alt={user.username} />
              <AvatarFallback className="text-lg font-bold bg-indigo-100 text-indigo-600">
                {user.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <h3 className="text-lg font-medium mb-1">{user.username}</h3>
            <p className="text-sm text-gray-500 mb-3">{user.subscriber_count} subscribers</p>
            <Button size="sm" variant="outline" className="rounded-full" asChild>
              <Link to={`/profile/${user.id}`}>View Profile</Link>
            </Button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <PageLayout user={currentUser}>
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Search Results</h1>
        <p className="text-gray-500 mb-6">
          {loading ? 'Searching...' : 
          (videoResults.length > 0 || userResults.length > 0) 
            ? `Found ${videoResults.length + userResults.length} result${videoResults.length + userResults.length === 1 ? '' : 's'} for "${query}"` 
            : `No results found for "${query}"`}
        </p>
        
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="loader"></div>
          </div>
        ) : (
          <Tabs defaultValue="videos" className="w-full" onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="videos" className="relative">
                Videos
                {videoResults.length > 0 && (
                  <span className="ml-2 bg-indigo-100 text-indigo-800 text-xs px-2 py-0.5 rounded-full">
                    {videoResults.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="users" className="relative">
                Users
                {userResults.length > 0 && (
                  <span className="ml-2 bg-indigo-100 text-indigo-800 text-xs px-2 py-0.5 rounded-full">
                    {userResults.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="videos" className="mt-2">
              {renderVideoResults()}
            </TabsContent>
            
            <TabsContent value="users" className="mt-2">
              {renderUserResults()}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </PageLayout>
  );
};

export default SearchResults;
