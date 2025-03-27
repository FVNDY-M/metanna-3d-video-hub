
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableBody, 
  TableCell 
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from "@/components/ui/checkbox";
import EditVideoModal from '@/components/EditVideoModal';
import { 
  Check, 
  X, 
  Search, 
  Edit, 
  Trash2, 
  Eye,
  AlertCircle,
  SlidersHorizontal,
  ArrowUpDown,
  RefreshCw
} from 'lucide-react';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from '@/components/ui/badge';
import { VideoData } from '@/components/VideoCard';

interface Video {
  id: string;
  title: string;
  category: string;
  visibility: 'public' | 'private';
  creator: {
    username: string;
    id: string;
  };
  created_at: string;
  views: number;
  likes_count: number;
  is_suspended: boolean;
  thumbnail: string;
}

const VideoManagement = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState('');
  const [suspendedFilter, setSuspendedFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<VideoData | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [processingBulkAction, setProcessingBulkAction] = useState(false);
  
  const videoCategories = [
    'Gaming',
    'Music',
    'Sports',
    'Technology',
    'Travel',
    'Cooking',
    'Education',
    'Fashion',
    'Art',
    'Fitness',
    'Science',
    'Entertainment',
    'Uncategorized'
  ];

  useEffect(() => {
    fetchVideos();
  }, [sortField, sortDirection]);

  const fetchVideos = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('videos')
        .select(`
          id,
          title,
          category,
          thumbnail_url,
          visibility,
          user_id,
          created_at,
          views,
          likes_count,
          is_suspended,
          profiles(username)
        `)
        .order(sortField, { ascending: sortDirection === 'asc' });

      // Apply filters if they exist
      if (searchQuery) {
        query = query.ilike('title', `%${searchQuery}%`);
      }
      
      if (selectedCategory) {
        query = query.eq('category', selectedCategory);
      }
      
      if (visibilityFilter) {
        query = query.eq('visibility', visibilityFilter);
      }
      
      if (suspendedFilter === 'suspended') {
        query = query.eq('is_suspended', true);
      } else if (suspendedFilter === 'active') {
        query = query.eq('is_suspended', false);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      const formattedVideos = data.map(video => ({
        id: video.id,
        title: video.title,
        category: video.category,
        visibility: video.visibility as 'public' | 'private',
        creator: {
          username: video.profiles?.[0]?.username || 'Unknown',
          id: video.user_id
        },
        created_at: video.created_at,
        views: video.views,
        likes_count: video.likes_count,
        is_suspended: video.is_suspended,
        thumbnail: video.thumbnail_url
      }));

      setVideos(formattedVideos);
    } catch (error) {
      console.error('Error fetching videos:', error);
      toast.error('Failed to load videos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSort = (field: string) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleRowSelection = (videoId: string, checked: boolean) => {
    if (checked) {
      setSelectedRows([...selectedRows, videoId]);
    } else {
      setSelectedRows(selectedRows.filter(id => id !== videoId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(videos.map(video => video.id));
    } else {
      setSelectedRows([]);
    }
  };

  const handleEdit = (video: Video) => {
    const videoData: VideoData = {
      id: video.id,
      title: video.title,
      category: video.category,
      visibility: video.visibility,
      thumbnail: video.thumbnail,
      videoUrl: '', // This will be filled by the EditVideoModal component
      creator: {
        id: video.creator.id,
        username: video.creator.username,
        avatar: '', // This will be filled by the EditVideoModal component
        subscribers: 0 // This will be filled by the EditVideoModal component
      },
      likes: video.likes_count,
      comments: 0, // This will be filled by the EditVideoModal component
      immersions: video.views,
      createdAt: video.created_at,
      description: '' // This will be filled by the EditVideoModal component
    };
    
    setSelectedVideo(videoData);
    setIsEditModalOpen(true);
  };

  const handleDeleteVideo = async (videoId: string) => {
    try {
      const { error } = await supabase
        .from('videos')
        .delete()
        .eq('id', videoId);

      if (error) throw error;
      
      toast.success('Video deleted successfully');
      setVideos(videos.filter(video => video.id !== videoId));
      setSelectedRows(selectedRows.filter(id => id !== videoId));
    } catch (error) {
      console.error('Error deleting video:', error);
      toast.error('Failed to delete video');
    }
  };

  const handleDeleteClick = (video: Video) => {
    setSelectedVideo({
      id: video.id,
      title: video.title,
      category: video.category,
      visibility: video.visibility,
      thumbnail: video.thumbnail,
      videoUrl: '', 
      creator: {
        id: video.creator.id,
        username: video.creator.username,
        avatar: '', 
        subscribers: 0 
      },
      likes: video.likes_count,
      comments: 0, 
      immersions: video.views,
      createdAt: video.created_at,
      description: '' 
    });
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedVideo || !selectedVideo.id) return;
    try {
      await handleDeleteVideo(selectedVideo.id);
    } catch (error) {
      console.error('Error in delete confirmation handler:', error);
    } finally {
      setIsDeleteDialogOpen(false);
      setSelectedVideo(null);
    }
  };

  const handleVideoUpdated = () => {
    fetchVideos();
  };

  const handleBulkSuspend = async () => {
    if (selectedRows.length === 0) return;
    
    setProcessingBulkAction(true);
    try {
      const { error } = await supabase
        .from('videos')
        .update({ 
          is_suspended: true,
          suspension_end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        })
        .in('id', selectedRows);

      if (error) throw error;
      
      await logModerationAction('suspend', 'video', selectedRows);
      
      toast.success(`${selectedRows.length} videos suspended for 7 days`);
      fetchVideos();
      setSelectedRows([]);
    } catch (error) {
      console.error('Error suspending videos:', error);
      toast.error('Failed to suspend videos');
    } finally {
      setProcessingBulkAction(false);
    }
  };

  const handleBulkUnsuspend = async () => {
    if (selectedRows.length === 0) return;
    
    setProcessingBulkAction(true);
    try {
      const { error } = await supabase
        .from('videos')
        .update({ 
          is_suspended: false,
          suspension_end_date: null
        })
        .in('id', selectedRows);

      if (error) throw error;
      
      await logModerationAction('unsuspend', 'video', selectedRows);
      
      toast.success(`${selectedRows.length} videos unsuspended`);
      fetchVideos();
      setSelectedRows([]);
    } catch (error) {
      console.error('Error unsuspending videos:', error);
      toast.error('Failed to unsuspend videos');
    } finally {
      setProcessingBulkAction(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRows.length === 0) return;
    
    setProcessingBulkAction(true);
    try {
      const { error } = await supabase
        .from('videos')
        .delete()
        .in('id', selectedRows);

      if (error) throw error;
      
      await logModerationAction('delete', 'video', selectedRows);
      
      toast.success(`${selectedRows.length} videos deleted`);
      fetchVideos();
      setSelectedRows([]);
    } catch (error) {
      console.error('Error deleting videos:', error);
      toast.error('Failed to delete videos');
    } finally {
      setProcessingBulkAction(false);
    }
  };

  const logModerationAction = async (actionType: string, targetType: string, targetIds: string[]) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return;
      
      const adminId = sessionData.session.user.id;
      
      // Create a moderation action record for each target
      const moderationActions = targetIds.map(targetId => ({
        admin_id: adminId,
        action_type: actionType,
        target_type: targetType,
        target_id: targetId,
        details: {
          reason: 'Bulk action from admin panel',
          timestamp: new Date().toISOString()
        }
      }));
      
      const { error } = await supabase
        .from('moderation_actions')
        .insert(moderationActions);
        
      if (error) {
        console.error('Error logging moderation action:', error);
      }
    } catch (error) {
      console.error('Error in logModerationAction:', error);
    }
  };

  return (
    <AdminLayout title="Video Management">
      <div className="space-y-4">
        {/* Search and filters bar */}
        <div className="flex flex-wrap gap-3 items-end mb-6">
          <div className="flex-1 min-w-48">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search videos..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchVideos()}
              />
            </div>
          </div>
          
          <Button variant="outline" onClick={fetchVideos}>
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => setShowFilters(!showFilters)}
            className="bg-gray-50"
          >
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Filters
            {(selectedCategory || visibilityFilter || suspendedFilter) && (
              <Badge variant="secondary" className="ml-2 px-1 py-0 h-5">
                {[
                  selectedCategory && '1',
                  visibilityFilter && '1',
                  suspendedFilter && '1'
                ].filter(Boolean).length}
              </Badge>
            )}
          </Button>
          
          <Button variant="outline" onClick={() => fetchVideos()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
        
        {/* Collapsible filters section */}
        <Collapsible open={showFilters} className="mb-6">
          <CollapsibleContent>
            <div className="p-4 bg-gray-50 rounded-lg grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Category</label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All categories</SelectItem>
                    {videoCategories.map((category) => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">Visibility</label>
                <Select value={visibilityFilter} onValueChange={setVisibilityFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All videos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All videos</SelectItem>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">Status</label>
                <Select value={suspendedFilter} onValueChange={setSuspendedFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="md:col-span-3 flex justify-end space-x-2 mt-2">
                <Button variant="outline" onClick={() => {
                  setSelectedCategory('');
                  setVisibilityFilter('');
                  setSuspendedFilter('');
                }}>
                  Reset Filters
                </Button>
                <Button onClick={() => fetchVideos()}>Apply Filters</Button>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
        
        {/* Bulk actions */}
        {selectedRows.length > 0 && (
          <div className="bg-blue-50 p-3 rounded-lg flex items-center justify-between mb-4">
            <span className="text-sm text-blue-700">
              {selectedRows.length} videos selected
            </span>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline"
                className="text-xs" 
                onClick={() => setSelectedRows([])}
              >
                Deselect All
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                className="text-xs border-orange-200 text-orange-600 hover:bg-orange-50"
                onClick={handleBulkSuspend}
                disabled={processingBulkAction}
              >
                <AlertCircle className="h-3.5 w-3.5 mr-1" />
                Suspend
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                className="text-xs border-green-200 text-green-600 hover:bg-green-50"
                onClick={handleBulkUnsuspend}
                disabled={processingBulkAction}
              >
                <Check className="h-3.5 w-3.5 mr-1" />
                Unsuspend
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="text-xs border-red-200 text-red-600 hover:bg-red-50"
                    disabled={processingBulkAction}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      You are about to delete {selectedRows.length} videos. This action cannot be undone.
                      All associated comments, likes, and watch history will also be deleted.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      className="bg-red-500 hover:bg-red-600"
                      onClick={handleBulkDelete}
                    >
                      Delete {selectedRows.length} videos
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        )}
        
        {/* Videos table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox 
                    checked={videos.length > 0 && selectedRows.length === videos.length}
                    onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                  />
                </TableHead>
                <TableHead className="w-14">
                  {/* Thumbnail column */}
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('title')}>
                  <div className="flex items-center">
                    Title
                    {sortField === 'title' && (
                      <ArrowUpDown className={`ml-1 h-4 w-4 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />
                    )}
                  </div>
                </TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Creator</TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('created_at')}>
                  <div className="flex items-center">
                    Posted
                    {sortField === 'created_at' && (
                      <ArrowUpDown className={`ml-1 h-4 w-4 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />
                    )}
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('views')}>
                  <div className="flex items-center">
                    Views
                    {sortField === 'views' && (
                      <ArrowUpDown className={`ml-1 h-4 w-4 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />
                    )}
                  </div>
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center">
                    Loading videos...
                  </TableCell>
                </TableRow>
              ) : videos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center">
                    No videos found.
                  </TableCell>
                </TableRow>
              ) : (
                videos.map((video) => (
                  <TableRow key={video.id}>
                    <TableCell>
                      <Checkbox 
                        checked={selectedRows.includes(video.id)}
                        onCheckedChange={(checked) => handleRowSelection(video.id, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell>
                      {video.thumbnail ? (
                        <img 
                          src={video.thumbnail} 
                          alt={video.title} 
                          className="h-8 w-14 object-cover rounded"
                        />
                      ) : (
                        <div className="h-8 w-14 bg-gray-200 rounded" />
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-48 truncate font-medium">{video.title}</div>
                    </TableCell>
                    <TableCell>{video.category}</TableCell>
                    <TableCell>
                      <span className="max-w-32 truncate">{video.creator.username}</span>
                    </TableCell>
                    <TableCell>
                      {new Date(video.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{video.views.toLocaleString()}</TableCell>
                    <TableCell>
                      {video.is_suspended ? (
                        <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">
                          Suspended
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
                          Active
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-7 w-7"
                          onClick={() => handleEdit(video)}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-7 w-7 border-red-200 text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleDeleteClick(video)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      
      {/* Edit Video Modal */}
      {selectedVideo && (
        <EditVideoModal 
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedVideo(null);
          }}
          videoId={selectedVideo.id}
          onVideoUpdated={handleVideoUpdated}
          onVideoDeleted={handleDeleteVideo}
        />
      )}
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the video "{selectedVideo?.title}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-red-500 hover:bg-red-600"
              onClick={handleDeleteConfirm}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default VideoManagement;
