
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Ban, Edit, Check, Trash2, RefreshCw, Search, ExternalLink, Eye, Video
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Video {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  views: number;
  likes_count: number;
  comments_count: number;
  user_id: string;
  created_at: string;
  is_suspended: boolean;
  profiles?: {
    username: string;
    avatar_url: string | null;
  };
}

const ContentManagement: React.FC = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedDescription, setEditedDescription] = useState('');

  const fetchVideos = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('videos')
        .select(`
          *,
          profiles:user_id (
            username,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setVideos(data || []);
    } catch (error) {
      console.error('Error fetching videos:', error);
      toast("Failed to load videos");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  const handleSuspendVideo = async (video: Video) => {
    try {
      const { error } = await supabase
        .from('videos')
        .update({ is_suspended: !video.is_suspended })
        .eq('id', video.id);
      
      if (error) throw error;
      
      // Log moderation action
      await supabase.from('moderation_actions').insert({
        admin_id: (await supabase.auth.getSession()).data.session?.user.id,
        target_id: video.id,
        target_type: 'video',
        action_type: video.is_suspended ? 'restore' : 'suspend',
        details: {
          title: video.title,
          action: video.is_suspended ? 'unsuspended' : 'suspended'
        }
      });

      toast(video.is_suspended ? "Video Restored" : "Video Suspended");
      
      // Update the local state
      setVideos(videos.map(v => 
        v.id === video.id ? { ...v, is_suspended: !v.is_suspended } : v
      ));
    } catch (error) {
      console.error('Error suspending video:', error);
      toast("Failed to update video status");
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!confirm("Are you sure you want to delete this video? This action cannot be undone.")) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('videos')
        .delete()
        .eq('id', videoId);
      
      if (error) throw error;
      
      toast("Video Deleted");
      
      // Update the local state
      setVideos(videos.filter(v => v.id !== videoId));
    } catch (error) {
      console.error('Error deleting video:', error);
      toast("Failed to delete video");
    }
  };

  const openVideoDetails = (video: Video) => {
    setSelectedVideo(video);
    setEditedTitle(video.title);
    setEditedDescription(video.description || '');
    setVideoDialogOpen(true);
  };

  const handleUpdateVideo = async () => {
    if (!selectedVideo) return;
    
    try {
      const { error } = await supabase
        .from('videos')
        .update({ 
          title: editedTitle,
          description: editedDescription 
        })
        .eq('id', selectedVideo.id);
      
      if (error) throw error;
      
      // Log moderation action
      await supabase.from('moderation_actions').insert({
        admin_id: (await supabase.auth.getSession()).data.session?.user.id,
        target_id: selectedVideo.id,
        target_type: 'video',
        action_type: 'edit',
        details: {
          original_title: selectedVideo.title,
          new_title: editedTitle
        }
      });

      toast("Video Updated");
      
      // Update the local state
      setVideos(videos.map(v => 
        v.id === selectedVideo.id ? { 
          ...v, 
          title: editedTitle,
          description: editedDescription 
        } : v
      ));
      
      setVideoDialogOpen(false);
    } catch (error) {
      console.error('Error updating video:', error);
      toast("Failed to update video details");
    }
  };

  const filteredVideos = videos.filter(video => 
    video.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Content Management</h1>
        <Button onClick={fetchVideos} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search videos by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center h-60">
            <div className="w-10 h-10 border-4 border-t-metanna-blue border-b-metanna-blue border-r-transparent border-l-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Environment</TableHead>
                <TableHead>Creator</TableHead>
                <TableHead>Popularity</TableHead>
                <TableHead>Posted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVideos.length > 0 ? (
                filteredVideos.map((video) => (
                  <TableRow key={video.id}>
                    <TableCell className="flex items-center space-x-3">
                      <div className="h-12 w-20 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                        {video.thumbnail_url ? (
                          <img 
                            src={video.thumbnail_url} 
                            alt={video.title} 
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <Video className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div>
                        <span className="font-medium line-clamp-1">{video.title}</span>
                        <span className="text-xs text-gray-500 line-clamp-1">
                          {video.description || 'No description'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage 
                            src={video.profiles?.avatar_url || undefined} 
                            alt={video.profiles?.username || 'User'} 
                          />
                          <AvatarFallback className="text-xs bg-indigo-600 text-white">
                            {(video.profiles?.username || 'U').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">
                          {video.profiles?.username || 'Unknown user'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm text-gray-600">
                        <Eye className="h-4 w-4 mr-1" />
                        {video.views}
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(video.created_at)}</TableCell>
                    <TableCell>
                      {video.is_suspended ? (
                        <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                          Suspended
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                          Active
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openVideoDetails(video)}
                        className="h-8 w-8"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => window.open(`/video/${video.id}`, '_blank')}
                        className="h-8 w-8"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={video.is_suspended ? "outline" : "ghost"}
                        size="icon"
                        onClick={() => handleSuspendVideo(video)}
                        className={`h-8 w-8 ${
                          video.is_suspended ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {video.is_suspended ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Ban className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteVideo(video.id)}
                        className="h-8 w-8 text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No videos found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Video Edit Dialog */}
      <Dialog open={videoDialogOpen} onOpenChange={setVideoDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Edit Environment</DialogTitle>
          </DialogHeader>
          
          {selectedVideo && (
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <label htmlFor="title" className="text-sm font-medium">
                  Title
                </label>
                <Input
                  id="title"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="description" className="text-sm font-medium">
                  Description
                </label>
                <Textarea
                  id="description"
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  rows={4}
                />
              </div>
              
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Environment Status</h4>
                <Button
                  variant={selectedVideo.is_suspended ? 'outline' : 'destructive'}
                  onClick={() => handleSuspendVideo(selectedVideo)}
                  className="w-full"
                >
                  {selectedVideo.is_suspended ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Restore Environment
                    </>
                  ) : (
                    <>
                      <Ban className="h-4 w-4 mr-2" />
                      Suspend Environment
                    </>
                  )}
                </Button>
              </div>
              
              <div className="flex space-x-2 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => setVideoDialogOpen(false)}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleUpdateVideo}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContentManagement;
