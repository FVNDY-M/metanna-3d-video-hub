
import React, { useEffect, useState } from 'react';
import { supabase, deleteVideo } from '@/integrations/supabase/client';
import PageLayout from '@/components/PageLayout';
import VideoCard, { VideoData } from '@/components/VideoCard';
import EmptyState from '@/components/EmptyState';
import EditVideoModal from '@/components/EditVideoModal';
import VideoAnalyticsPreview from '@/components/VideoAnalyticsPreview';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const YourVideos = () => {
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    fetchUserVideos();
  }, []);

  const fetchUserVideos = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setLoading(false);
        return;
      }
      
      // Get user profile information
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
        
      if (profileData) {
        setUserProfile(profileData);
      }
      
      // Fetch all videos created by the user
      const { data: videosData, error } = await supabase
        .from('videos')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching videos:', error);
        setLoading(false);
        return;
      }

      if (videosData) {
        const processedVideos = videosData.map(video => ({
          id: video.id,
          title: video.title,
          thumbnail: video.thumbnail_url || '',
          category: video.category,
          description: video.description,
          creator: {
            id: video.user_id,
            username: profileData?.username || 'Unknown Creator',
            avatar: profileData?.avatar_url || undefined,
            subscribers: profileData?.subscriber_count || 0
          },
          likes: video.likes_count,
          comments: video.comments_count,
          immersions: video.views,
          createdAt: video.created_at,
          visibility: video.visibility,
          isSuspended: video.is_suspended,
          suspensionEndDate: video.suspension_end_date
        })) as VideoData[];
        
        setVideos(processedVideos);
      }
    } catch (error) {
      console.error('Error in fetchUserVideos:', error);
      toast.error('Failed to load your videos');
    } finally {
      setLoading(false);
    }
  };

  const handleVideoClick = (videoId: string) => {
    setEditingVideoId(videoId);
    setIsEditModalOpen(true);
  };

  const handleEditModalClose = () => {
    setIsEditModalOpen(false);
    setEditingVideoId(null);
  };

  const handleVideoUpdated = () => {
    // Refetch videos after an update
    fetchUserVideos();
    toast.success("Video updated successfully");
    setIsEditModalOpen(false);
    setEditingVideoId(null);
  };
  
  const handleVideoDeleted = async (videoId: string) => {
    try {
      const { success, error } = await deleteVideo(videoId);
      
      if (success) {
        toast.success("Video has been successfully deleted");
        setIsEditModalOpen(false);
        setEditingVideoId(null);
        // Update the videos list
        setVideos(videos.filter(video => video.id !== videoId));
      } else {
        toast.error("Failed to delete video: " + (error?.message || "Unknown error"));
      }
    } catch (error) {
      console.error("Error during video deletion:", error);
      toast.error("An unexpected error occurred while deleting the video");
    }
  };

  return (
    <PageLayout>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Your Videos</CardTitle>
          <CardDescription>
            {userProfile && (
              <span>
                You have uploaded {videos.length} video{videos.length !== 1 ? 's' : ''}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-40 bg-gray-100 animate-pulse rounded-lg"></div>
              ))}
            </div>
          ) : videos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {videos.map((video) => (
                <div key={video.id} className="flex flex-col">
                  <div className="relative">
                    <div onClick={() => handleVideoClick(video.id)}>
                      <VideoCard video={video} isOwner={true} />
                    </div>
                    <div className="absolute top-2 right-2 flex gap-2">
                      <Badge className={`${
                        video.visibility === 'public' ? 'bg-green-500' : 'bg-amber-500'
                      }`}>
                        {video.visibility === 'public' ? 'Public' : 'Private'}
                      </Badge>
                      {video.isSuspended && (
                        <Badge variant="destructive">
                          Suspended
                        </Badge>
                      )}
                      {video.category && (
                        <Badge variant="outline" className="bg-white">
                          {video.category}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <VideoAnalyticsPreview 
                    videoId={video.id}
                    views={video.immersions}
                    likes={video.likes}
                    comments={video.comments}
                  />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No videos found"
              description="You haven't uploaded any videos yet."
              icon="🎥"
            />
          )}
        </CardContent>
      </Card>

      <EditVideoModal
        isOpen={isEditModalOpen}
        onClose={handleEditModalClose}
        videoId={editingVideoId}
        onVideoUpdated={handleVideoUpdated}
        onVideoDeleted={handleVideoDeleted}
        isAdmin={false}
      />
    </PageLayout>
  );
};

export default YourVideos;
