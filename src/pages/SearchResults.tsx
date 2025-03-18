
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import PageLayout from '@/components/PageLayout';
import VideoCard from '@/components/VideoCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Video } from 'lucide-react';
import EmptyState from '@/components/EmptyState';

const SearchResults = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const query = params.get('q') || '';
    setSearchQuery(query);
  }, [location.search]);
  
  // Search videos
  const { data: videos, isLoading: videosLoading } = useQuery({
    queryKey: ['searchVideos', searchQuery],
    queryFn: async () => {
      if (!searchQuery) return [];
      
      // Build search query for partial matches in title, description, and category
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
        .or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,category.ilike.%${searchQuery}%`)
        .eq('visibility', 'public')
        .order('views', { ascending: false });
      
      if (error) throw error;
      
      return data.map(video => ({
        ...video,
        creator: {
          id: video.user_id,
          username: video.profiles?.username || 'Unknown',
          avatar: video.profiles?.avatar_url || null,
          subscribers: video.profiles?.subscriber_count || 0
        }
      }));
    },
    enabled: !!searchQuery,
  });
  
  // Search users/profiles
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['searchUsers', searchQuery],
    queryFn: async () => {
      if (!searchQuery) return [];
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', `%${searchQuery}%`)
        .order('subscriber_count', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      
      return data;
    },
    enabled: !!searchQuery,
  });
  
  if (!searchQuery) {
    return (
      <PageLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl font-bold mb-6">Search Results</h1>
          <EmptyState
            title="No search query provided"
            description="Please enter a search term to find videos and creators."
            icon="search"
          />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold mb-6">Search Results for "{searchQuery}"</h1>
        
        <Tabs defaultValue="all" className="mb-8">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="videos">Videos</TabsTrigger>
            <TabsTrigger value="users">Creators</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all">
            {/* Users section */}
            {usersLoading ? (
              <div className="animate-pulse">
                <h2 className="text-xl font-semibold mb-4">Creators</h2>
                <div className="flex flex-wrap gap-4 mb-8">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 w-64">
                      <div className="w-12 h-12 rounded-full bg-gray-200"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-16"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : users && users.length > 0 ? (
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4">Creators</h2>
                <div className="flex flex-wrap gap-4">
                  {users.map((user) => (
                    <Link 
                      key={user.id} 
                      to={`/creator/${user.username}`}
                      className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:border-metanna-blue hover:shadow-sm transition-all w-64"
                    >
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={user.avatar_url} alt={user.username} />
                        <AvatarFallback className="bg-metanna-blue text-white">
                          {user.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-medium text-gray-900">{user.username}</h3>
                        <p className="text-sm text-gray-500">{user.subscriber_count} subscribers</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ) : !usersLoading && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4">Creators</h2>
                <p className="text-gray-500">No creators found matching "{searchQuery}"</p>
              </div>
            )}
            
            {/* Videos section */}
            {videosLoading ? (
              <div className="animate-pulse">
                <h2 className="text-xl font-semibold mb-4">Videos</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div key={i}>
                      <div className="aspect-video bg-gray-200 rounded-xl mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              </div>
            ) : videos && videos.length > 0 ? (
              <div>
                <h2 className="text-xl font-semibold mb-4">Videos</h2>
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
                        visibility: video.visibility as 'public' | 'private',
                        category: video.category,
                        description: video.description
                      }}
                    />
                  ))}
                </div>
              </div>
            ) : !videosLoading && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Videos</h2>
                <p className="text-gray-500">No videos found matching "{searchQuery}"</p>
              </div>
            )}
            
            {/* Show empty state if both searches return nothing */}
            {!usersLoading && !videosLoading && users?.length === 0 && videos?.length === 0 && (
              <EmptyState
                title="No results found"
                description={`We couldn't find any videos or creators matching "${searchQuery}"`}
                icon="search"
              />
            )}
          </TabsContent>
          
          <TabsContent value="videos">
            {videosLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
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
                      creator: video.creator,
                      likes: video.likes_count,
                      comments: video.comments_count,
                      immersions: video.views,
                      createdAt: video.created_at,
                      visibility: video.visibility as 'public' | 'private',
                      category: video.category,
                      description: video.description
                    }}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No videos found"
                description={`We couldn't find any videos matching "${searchQuery}"`}
                icon="video"
              />
            )}
          </TabsContent>
          
          <TabsContent value="users">
            {usersLoading ? (
              <div className="animate-pulse">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="flex items-center space-x-4 p-4 rounded-lg border border-gray-200">
                      <div className="w-16 h-16 rounded-full bg-gray-200"></div>
                      <div className="flex-1">
                        <div className="h-5 bg-gray-200 rounded w-24 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-32 mb-1"></div>
                        <div className="h-3 bg-gray-200 rounded w-20"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : users && users.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {users.map((user) => (
                  <Link 
                    key={user.id} 
                    to={`/creator/${user.username}`}
                    className="flex items-center space-x-4 p-4 rounded-lg border border-gray-200 hover:border-metanna-blue hover:shadow-sm transition-all"
                  >
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={user.avatar_url} alt={user.username} />
                      <AvatarFallback className="bg-metanna-blue text-white text-xl">
                        {user.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-medium text-gray-900 text-lg">{user.username}</h3>
                      <p className="text-gray-500">{user.subscriber_count} subscribers</p>
                      {user.bio && (
                        <p className="text-gray-600 text-sm mt-1 line-clamp-2">{user.bio}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No creators found"
                description={`We couldn't find any creators matching "${searchQuery}"`}
                icon="user"
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
};

export default SearchResults;
