
import React, { useEffect, useState } from 'react';
import { 
  Dialog, 
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Heart, Share2, MessageSquare, Eye } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from "@/components/ui/button";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { VideoData } from './VideoCard';
import { useNavigate } from 'react-router-dom';

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoId: string | null;
}

const VideoModal: React.FC<VideoModalProps> = ({ isOpen, onClose, videoId }) => {
  const [video, setVideo] = useState<VideoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<Array<{id: string, user: {username: string, avatar?: string}, content: string}>>([]);
  const [commentText, setCommentText] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchVideoDetails = async () => {
      if (!videoId) return;
      
      setLoading(true);
      try {
        // Fetch video details
        const { data: videoData, error } = await supabase
          .from('videos')
          .select(`
            id,
            title,
            thumbnail_url,
            video_url,
            created_at,
            user_id,
            views
          `)
          .eq('id', videoId)
          .single();

        if (error) throw error;

        if (videoData) {
          // Fetch user profile for the video
          const { data: profileData } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', videoData.user_id)
            .single();

          // For demo purposes - generate random likes and comments
          const randomLikes = Math.floor(Math.random() * 2000);
          const randomComments = Math.floor(Math.random() * 100);

          setVideo({
            id: videoData.id,
            title: videoData.title,
            thumbnail: videoData.thumbnail_url,
            videoUrl: videoData.video_url,
            creator: {
              username: profileData?.username || 'Unknown Creator',
              avatar: profileData?.avatar_url,
            },
            likes: randomLikes,
            comments: randomComments,
            immersions: videoData.views || 0,
            createdAt: videoData.created_at,
          });

          // Mock comments for demonstration
          setComments([
            {
              id: '1',
              user: { username: '@user1', avatar: undefined },
              content: 'Amazing environment!'
            },
            // You could add more mock comments here
          ]);
        }
      } catch (error) {
        console.error('Error fetching video details:', error);
        toast.error('Failed to load video details');
      } finally {
        setLoading(false);
      }
    };

    if (isOpen && videoId) {
      fetchVideoDetails();
    }
  }, [isOpen, videoId]);

  // Check if user is authenticated
  const checkAuth = async () => {
    const { data } = await supabase.auth.getSession();
    return !!data.session;
  };

  const handleAuthAction = async (action: () => void, actionName: string) => {
    const isAuthenticated = await checkAuth();
    
    if (isAuthenticated) {
      action();
    } else {
      toast.error(`You need to be logged in to ${actionName}`, {
        action: {
          label: 'Login',
          onClick: () => navigate('/login'),
        },
      });
    }
  };

  const handleSubscribe = () => {
    handleAuthAction(() => {
      // Subscription logic would go here
      setIsSubscribed(!isSubscribed);
      toast.success(isSubscribed ? 'Unsubscribed successfully' : 'Subscribed successfully');
    }, 'subscribe');
  };

  const handleLike = () => {
    handleAuthAction(() => {
      // Like logic would go here
      setIsLiked(!isLiked);
      toast.success(isLiked ? 'Removed like' : 'Added like');
    }, 'like this video');
  };

  const handleComment = () => {
    if (!commentText.trim()) return;
    
    handleAuthAction(() => {
      // Comment submission logic would go here
      const newComment = {
        id: Date.now().toString(),
        user: { username: '@current_user' },
        content: commentText
      };
      
      setComments([...comments, newComment]);
      setCommentText('');
      toast.success('Comment added successfully');
    }, 'comment');
  };

  // Calculate time difference for display
  const getTimeDifference = (date: Date | string) => {
    const now = new Date();
    const past = new Date(date);
    const diffInMs = now.getTime() - past.getTime();
    const diffInMonths = Math.floor(diffInMs / (1000 * 60 * 60 * 24 * 30));
    
    if (diffInMonths > 0) {
      return `${diffInMonths} ${diffInMonths === 1 ? 'month' : 'months'} ago`;
    } else {
      return 'This month';
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden rounded-xl">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="loader"></div>
          </div>
        ) : video ? (
          <div className="flex flex-col">
            {/* Video thumbnail with play button overlay */}
            <div className="relative w-full aspect-video bg-black">
              <img 
                src={video.thumbnail || '/lovable-uploads/659cb0e4-1b73-4666-85b1-c58cf66580db.png'} 
                alt={video.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-indigo-600 rounded-full p-4 cursor-pointer hover:bg-indigo-700 transition-colors">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 5V19L19 12L8 5Z" fill="white"/>
                  </svg>
                </div>
              </div>
            </div>
            
            {/* Video info section */}
            <div className="p-4">
              <h2 className="text-xl font-bold mb-2">{video.title}</h2>
              
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={video.creator.avatar} alt={video.creator.username} />
                    <AvatarFallback className="bg-gray-200">
                      {video.creator.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{video.creator.username}</p>
                    <p className="text-sm text-gray-500">100K Subscribers</p>
                  </div>
                </div>
                
                <Button 
                  onClick={handleSubscribe}
                  className={`px-6 py-2 rounded-full transition-colors ${
                    isSubscribed 
                      ? 'bg-gray-200 text-gray-800 hover:bg-gray-300' 
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {isSubscribed ? 'Subscribed' : 'Subscribe'}
                </Button>
              </div>
              
              {/* Video stats */}
              <div className="flex items-center justify-between text-sm text-gray-600 mb-6">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    <Eye className="h-4 w-4 mr-1" />
                    <span>{video.immersions.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center cursor-pointer" onClick={handleLike}>
                    <Heart className={`h-4 w-4 mr-1 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                    <span>{video.likes.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center">
                    <MessageSquare className="h-4 w-4 mr-1" />
                    <span>{video.comments.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center">
                    <Share2 className="h-4 w-4 mr-1" />
                    <span>Share</span>
                  </div>
                </div>
                
                <span>{getTimeDifference(video.createdAt)}</span>
              </div>
              
              {/* Comments section */}
              <div className="border-t pt-4">
                <h3 className="font-medium mb-3">Comments</h3>
                
                {/* Add comment */}
                <div className="flex items-start space-x-3 mb-6">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-gray-200">U</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <textarea 
                      placeholder="Add a comment..." 
                      className="w-full border rounded-lg p-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      rows={2}
                    />
                    <div className="flex justify-end mt-2">
                      <Button 
                        size="sm"
                        onClick={handleComment}
                        disabled={!commentText.trim()}
                      >
                        Comment
                      </Button>
                    </div>
                  </div>
                </div>
                
                {comments.map(comment => (
                  <div key={comment.id} className="flex space-x-3 mb-3">
                    <Avatar className="h-8 w-8">
                      <AvatImage src={comment.user.avatar} alt={comment.user.username} />
                      <AvatarFallback className="bg-gray-200">
                        {comment.user.username.charAt(1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{comment.user.username}</p>
                      <p className="text-sm">{comment.content}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <button className="text-gray-500 hover:text-gray-700">
                          <Heart className="h-3.5 w-3.5" />
                        </button>
                        <button className="text-gray-500 hover:text-gray-700">
                          <MessageSquare className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center">
            <p>Video not found</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default VideoModal;
