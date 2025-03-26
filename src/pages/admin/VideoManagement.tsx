
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Eye, Edit, AlertTriangle, CheckCircle, Search, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import AdminLayout from '@/components/AdminLayout';

// Define interfaces for our data
interface UserProfile {
  id: string;
  username: string;
  avatar_url?: string;
}

interface Video {
  id: string;
  title: string;
  description: string | null;
  category: string;
  views: number;
  likes_count: number;
  comments_count: number;
  created_at: string;
  updated_at: string;
  user_id: string;
  video_url: string;
  thumbnail_url: string | null;
  visibility: string;
  is_suspended: boolean;
  user?: UserProfile;
}

const VideoManagement = () => {
  // States for filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // States for modals
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSuspendDialogOpen, setIsSuspendDialogOpen] = useState(false);
  
  // Edit form states
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('');
  
  // Fetch videos with creator info
  const { data: videos, isLoading, refetch } = useQuery({
    queryKey: ['admin-videos', statusFilter],
    queryFn: async () => {
      // First, fetch videos
      let query = supabase
        .from('videos')
        .select('*')
        .order('created_at', { ascending: false });
      
      // Apply status filter
      if (statusFilter === 'suspended') {
        query = query.eq('is_suspended', true);
      } else if (statusFilter === 'active') {
        query = query.eq('is_suspended', false);
      }
      
      const { data: videoData, error } = await query;
      
      if (error) {
        console.error("Error fetching videos:", error);
        throw new Error("Failed to fetch videos");
      }
      
      if (!videoData || videoData.length === 0) {
        return [] as Video[];
      }
      
      // Then, fetch user profiles separately
      const userIds = [...new Set(videoData.map(video => video.user_id))];
      
      const { data: userProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);
        
      if (profilesError) {
        console.error("Error fetching user profiles:", profilesError);
        // Return videos without user info if there's an error
        return videoData as Video[];
      }
      
      // Combine videos with user info
      return videoData.map(video => ({
        ...video,
        user: userProfiles.find(profile => profile.id === video.user_id) || { id: video.user_id, username: 'Unknown' }
      })) as Video[];
    }
  });
  
  // Filtered videos based on search query
  const filteredVideos = React.useMemo(() => {
    if (!videos) return [];
    
    return videos.filter(video => 
      video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (video.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (video.user?.username || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [videos, searchQuery]);
  
  // Handle video suspension/restoration
  const handleToggleSuspension = async () => {
    if (!selectedVideo) return;
    
    const isSuspending = !selectedVideo.is_suspended;
    
    try {
      // Update video status
      const { error: updateError } = await supabase
        .from('videos')
        .update({ is_suspended: isSuspending })
        .eq('id', selectedVideo.id);
      
      if (updateError) throw updateError;
      
      // Log the moderation action
      const { error: logError } = await supabase
        .from('moderation_actions')
        .insert({
          admin_id: (await supabase.auth.getSession()).data.session?.user.id,
          action_type: isSuspending ? 'video_suspend' : 'video_restore',
          target_type: 'video',
          target_id: selectedVideo.id,
          details: { 
            video_title: selectedVideo.title,
            reason: isSuspending ? "Policy violation" : "Review completed"
          }
        });
      
      if (logError) throw logError;
      
      toast.success(
        isSuspending 
          ? "Video has been suspended" 
          : "Video has been restored"
      );
      
      refetch();
    } catch (error) {
      console.error("Error toggling video suspension:", error);
      toast.error("Failed to update video status");
    } finally {
      setIsSuspendDialogOpen(false);
      setSelectedVideo(null);
    }
  };
  
  // Handle video edit
  const handleEditVideo = async () => {
    if (!selectedVideo) return;
    
    try {
      // Update video details
      const { error: updateError } = await supabase
        .from('videos')
        .update({
          title: editTitle,
          description: editDescription,
          category: editCategory
        })
        .eq('id', selectedVideo.id);
      
      if (updateError) throw updateError;
      
      // Log the moderation action
      const { error: logError } = await supabase
        .from('moderation_actions')
        .insert({
          admin_id: (await supabase.auth.getSession()).data.session?.user.id,
          action_type: 'video_edit',
          target_type: 'video',
          target_id: selectedVideo.id,
          details: { 
            previous_title: selectedVideo.title,
            new_title: editTitle,
            updated_fields: ['title', 'description', 'category'].filter(field => {
              switch (field) {
                case 'title': return editTitle !== selectedVideo.title;
                case 'description': return editDescription !== selectedVideo.description;
                case 'category': return editCategory !== selectedVideo.category;
                default: return false;
              }
            })
          }
        });
      
      if (logError) throw logError;
      
      toast.success("Video details updated successfully");
      refetch();
    } catch (error) {
      console.error("Error updating video:", error);
      toast.error("Failed to update video details");
    } finally {
      setIsEditDialogOpen(false);
      setSelectedVideo(null);
    }
  };
  
  // Open edit dialog and set form values
  const openEditDialog = (video: Video) => {
    setSelectedVideo(video);
    setEditTitle(video.title);
    setEditDescription(video.description || '');
    setEditCategory(video.category || 'Uncategorized');
    setIsEditDialogOpen(true);
  };
  
  // Open suspend/restore dialog
  const openSuspendDialog = (video: Video) => {
    setSelectedVideo(video);
    setIsSuspendDialogOpen(true);
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(new Date(dateString));
  };
  
  return (
    <AdminLayout title="Video Management">
      {/* Filters and Search */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search videos by title, description or creator..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Videos</SelectItem>
            <SelectItem value="active">Active Only</SelectItem>
            <SelectItem value="suspended">Suspended Only</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Videos Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-metanna-blue border-t-transparent rounded-full"></div>
        </div>
      ) : filteredVideos.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-medium text-gray-600 mb-1">No videos found</h3>
          <p className="text-gray-500 text-sm">Try adjusting your search or filter criteria</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Creator</TableHead>
                <TableHead className="hidden md:table-cell">Date</TableHead>
                <TableHead className="hidden md:table-cell">Views</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVideos.map((video) => (
                <TableRow key={video.id} className={video.is_suspended ? "bg-red-50" : ""}>
                  <TableCell className="font-medium max-w-[200px] truncate">
                    {video.title}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {video.user?.username || "Unknown"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {formatDate(video.created_at)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {video.views.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {video.is_suspended ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Suspended
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Active
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => openEditDialog(video)}
                        title="Edit video"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant={video.is_suspended ? "outline" : "ghost"}
                        size="sm" 
                        onClick={() => openSuspendDialog(video)}
                        title={video.is_suspended ? "Restore video" : "Suspend video"}
                        className={video.is_suspended ? "text-green-600 hover:text-green-700" : "text-red-600 hover:text-red-700"}
                      >
                        {video.is_suspended ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          <AlertTriangle className="h-4 w-4" />
                        )}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        asChild
                        title="View video"
                      >
                        <Link to={`/video/${video.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      
      {/* Edit Video Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Edit Video</DialogTitle>
            <DialogDescription>
              Update the video details. These changes will be visible to all users.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input 
                value={editTitle} 
                onChange={(e) => setEditTitle(e.target.value)}
                maxLength={100}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea 
                value={editDescription} 
                onChange={(e) => setEditDescription(e.target.value)}
                rows={4}
                maxLength={500}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select value={editCategory} onValueChange={setEditCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Uncategorized">Uncategorized</SelectItem>
                  <SelectItem value="Entertainment">Entertainment</SelectItem>
                  <SelectItem value="Education">Education</SelectItem>
                  <SelectItem value="Science">Science</SelectItem>
                  <SelectItem value="Tech">Tech</SelectItem>
                  <SelectItem value="Arts">Arts</SelectItem>
                  <SelectItem value="Sports">Sports</SelectItem>
                  <SelectItem value="Travel">Travel</SelectItem>
                  <SelectItem value="Gaming">Gaming</SelectItem>
                  <SelectItem value="Music">Music</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditVideo} disabled={!editTitle.trim()}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Suspend/Restore Video Dialog */}
      <Dialog open={isSuspendDialogOpen} onOpenChange={setIsSuspendDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>
              {selectedVideo?.is_suspended ? "Restore Video" : "Suspend Video"}
            </DialogTitle>
            <DialogDescription>
              {selectedVideo?.is_suspended 
                ? "This will make the video visible again to all users."
                : "This will hide the video from all public views and searches."
              }
            </DialogDescription>
          </DialogHeader>
          
          {selectedVideo && (
            <div className="py-4">
              <h4 className="font-medium">{selectedVideo.title}</h4>
              <p className="text-sm text-gray-500 mt-1">
                By: {selectedVideo.user?.username || "Unknown creator"}
              </p>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSuspendDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleToggleSuspension}
              variant={selectedVideo?.is_suspended ? "default" : "destructive"}
            >
              {selectedVideo?.is_suspended ? "Restore Video" : "Suspend Video"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default VideoManagement;
