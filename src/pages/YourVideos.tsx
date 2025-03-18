
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import PageLayout from '@/components/PageLayout';
import { EmptyState } from '@/components/EmptyState';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Eye, 
  Heart, 
  MessageSquare, 
  Lock, 
  Globe 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface VideoItem {
  id: string;
  title: string;
  thumbnail_url: string | null;
  views: number;
  likes_count: number;
  comments_count: number;
  created_at: string;
  visibility: string;
}

const YourVideos = () => {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserAndVideos = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) return;
      
      setUserId(session.user.id);
      
      // Fetch user's videos
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching videos:', error);
        setLoading(false);
        return;
      }

      if (data) {
        setVideos(data);
      }
      
      setLoading(false);
    };

    fetchUserAndVideos();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const toggleVisibility = async (videoId: string, currentVisibility: string) => {
    const newVisibility = currentVisibility === 'public' ? 'private' : 'public';
    
    const { error } = await supabase
      .from('videos')
      .update({ visibility: newVisibility })
      .eq('id', videoId);
      
    if (error) {
      console.error('Error updating video visibility:', error);
      toast.error('Failed to update video visibility');
      return;
    }
    
    setVideos(videos.map(video => 
      video.id === videoId 
        ? {...video, visibility: newVisibility} 
        : video
    ));
    
    toast.success(`Video is now ${newVisibility}`);
  };

  const handleEdit = (videoId: string) => {
    // Future enhancement: implement video editing
    toast.info('Video editing is coming soon!');
  };

  const handleDelete = async (videoId: string) => {
    if (!confirm('Are you sure you want to delete this video? This action cannot be undone.')) {
      return;
    }
    
    const { error } = await supabase
      .from('videos')
      .delete()
      .eq('id', videoId);
      
    if (error) {
      console.error('Error deleting video:', error);
      toast.error('Failed to delete video');
      return;
    }
    
    setVideos(videos.filter(video => video.id !== videoId));
    toast.success('Video deleted successfully');
  };

  const handleVideoClick = (videoId: string) => {
    if (window.openVideoModal) {
      window.openVideoModal(videoId);
    }
  };

  return (
    <PageLayout>
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl font-bold">Your Videos</CardTitle>
          <Button 
            onClick={() => navigate('/upload')}
            className="bg-metanna-blue hover:bg-blue-700"
          >
            Upload New Video
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-40 bg-gray-100 animate-pulse rounded-lg"></div>
          ) : videos.length > 0 ? (
            <Tabs defaultValue="all">
              <TabsList className="mb-4">
                <TabsTrigger value="all">All Videos</TabsTrigger>
                <TabsTrigger value="public">Public</TabsTrigger>
                <TabsTrigger value="private">Private</TabsTrigger>
              </TabsList>
              
              <TabsContent value="all">
                <VideoTable 
                  videos={videos} 
                  formatDate={formatDate}
                  toggleVisibility={toggleVisibility}
                  handleEdit={handleEdit}
                  handleDelete={handleDelete}
                  handleVideoClick={handleVideoClick}
                />
              </TabsContent>
              
              <TabsContent value="public">
                <VideoTable 
                  videos={videos.filter(v => v.visibility === 'public')} 
                  formatDate={formatDate}
                  toggleVisibility={toggleVisibility}
                  handleEdit={handleEdit}
                  handleDelete={handleDelete}
                  handleVideoClick={handleVideoClick}
                />
              </TabsContent>
              
              <TabsContent value="private">
                <VideoTable 
                  videos={videos.filter(v => v.visibility === 'private')} 
                  formatDate={formatDate}
                  toggleVisibility={toggleVisibility}
                  handleEdit={handleEdit}
                  handleDelete={handleDelete}
                  handleVideoClick={handleVideoClick}
                />
              </TabsContent>
            </Tabs>
          ) : (
            <EmptyState
              title="No videos uploaded yet"
              description="Your uploaded videos will appear here."
              icon="🎬"
              action={
                <Button 
                  onClick={() => navigate('/upload')}
                  className="bg-metanna-blue hover:bg-blue-700 mt-4"
                >
                  Upload Your First Video
                </Button>
              }
            />
          )}
        </CardContent>
      </Card>
    </PageLayout>
  );
};

interface VideoTableProps {
  videos: VideoItem[];
  formatDate: (date: string) => string;
  toggleVisibility: (id: string, visibility: string) => void;
  handleEdit: (id: string) => void;
  handleDelete: (id: string) => void;
  handleVideoClick: (id: string) => void;
}

const VideoTable: React.FC<VideoTableProps> = ({ 
  videos, 
  formatDate,
  toggleVisibility,
  handleEdit,
  handleDelete,
  handleVideoClick
}) => {
  return (
    <Table>
      <TableCaption>List of your uploaded videos</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Video</TableHead>
          <TableHead className="hidden md:table-cell">Date</TableHead>
          <TableHead className="hidden md:table-cell">Views</TableHead>
          <TableHead className="hidden md:table-cell">Likes</TableHead>
          <TableHead className="hidden md:table-cell">Comments</TableHead>
          <TableHead>Visibility</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {videos.map((video) => (
          <TableRow key={video.id}>
            <TableCell>
              <div className="flex items-center space-x-3">
                <div 
                  className="relative aspect-video w-20 min-w-20 rounded overflow-hidden cursor-pointer"
                  onClick={() => handleVideoClick(video.id)}
                >
                  <img 
                    src={video.thumbnail_url || '/placeholder.svg'} 
                    alt={video.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="truncate">
                  <div 
                    className="font-medium truncate cursor-pointer hover:text-metanna-blue transition-colors"
                    onClick={() => handleVideoClick(video.id)}
                  >
                    {video.title}
                  </div>
                  <div className="md:hidden text-xs text-gray-500">
                    {formatDate(video.created_at)}
                  </div>
                </div>
              </div>
            </TableCell>
            <TableCell className="hidden md:table-cell">{formatDate(video.created_at)}</TableCell>
            <TableCell className="hidden md:table-cell">
              <div className="flex items-center space-x-1">
                <Eye className="h-3.5 w-3.5 text-gray-500" />
                <span>{video.views.toLocaleString()}</span>
              </div>
            </TableCell>
            <TableCell className="hidden md:table-cell">
              <div className="flex items-center space-x-1">
                <Heart className="h-3.5 w-3.5 text-gray-500" />
                <span>{video.likes_count.toLocaleString()}</span>
              </div>
            </TableCell>
            <TableCell className="hidden md:table-cell">
              <div className="flex items-center space-x-1">
                <MessageSquare className="h-3.5 w-3.5 text-gray-500" />
                <span>{video.comments_count.toLocaleString()}</span>
              </div>
            </TableCell>
            <TableCell>
              <Button 
                variant="ghost"
                size="sm"
                className={`flex items-center gap-1 ${
                  video.visibility === 'public' 
                    ? 'text-green-600' 
                    : 'text-amber-600'
                }`}
                onClick={() => toggleVisibility(video.id, video.visibility)}
              >
                {video.visibility === 'public' ? (
                  <>
                    <Globe className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Public</span>
                  </>
                ) : (
                  <>
                    <Lock className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Private</span>
                  </>
                )}
              </Button>
            </TableCell>
            <TableCell>
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleEdit(video.id)}
                >
                  Edit
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => handleDelete(video.id)}
                >
                  Delete
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default YourVideos;
