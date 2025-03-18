
import React, { useEffect, useState, useRef } from 'react';
import { 
  Dialog, 
  DialogContent,
} from "@/components/ui/dialog";
import { Heart, Share2, MessageSquare, Eye, Play } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from '@/integrations/supabase/client';
import { incrementVideoView } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { VideoData } from './VideoCard';
import { useNavigate } from 'react-router-dom';

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoId: string | null;
}

interface CommentData {
  id: string;
  user: {
    username: string;
    avatar?: string;
  };
  content: string;
  created_at: string;
}

const VideoModal: React.FC<VideoModalProps> = ({ isOpen, onClose, videoId }) => {
  const [video, setVideo] = useState<VideoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<CommentData[]>([]);
  const [commentText, setCommentText] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; username: string } | null>(null);
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const checkCurrentUser = async () => {
      const { data: session } = await supabase.auth.getSession();
      if (session.session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .eq('id', session.session.user.id)
          .single();
          
        if (profile) {
          setCurrentUser({
            id: profile.id,
            username: profile.username
          });
        }
      }
    };
    
    checkCurrentUser();
  }, []);

  useEffect(() => {
    const fetchVideoDetails = async () => {
      if (!videoId) return;
      
      setLoading(true);
      try {
        const { data: videoData, error } = await supabase
          .from('videos')
          .select(`
            id,
            title,
            description,
            category,
            thumbnail_url,
            video_url,
            created_at,
            user_id,
            views,
            likes_count,
            comments_count
          `)
          .eq('id', videoId)
          .single();

        if (error) throw error;

        if (videoData) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('username, avatar_url, subscriber_count')
            .eq('id', videoData.user_id)
            .single();

          setVideo({
            id: videoData.id,
            title: videoData.title,
            description: videoData.description,
            category: videoData.category,
            thumbnail: videoData.thumbnail_url,
            videoUrl: videoData.video_url,
            creator: {
              id: videoData.user_id,
              username: profileData?.username || 'Unknown Creator',
              avatar: profileData?.avatar_url,
              subscribers: profileData?.subscriber_count || 0
            },
            likes: videoData.likes_count || 0,
            comments: videoData.comments_count || 0,
            immersions: videoData.views || 0,
            createdAt: videoData.created_at,
          });

          // Register view
          if (currentUser) {
            incrementVideoView(videoId, currentUser.id);
          } else {
            incrementVideoView(videoId);
          }

          if (currentUser) {
            const { data: likeData } = await supabase
              .from('likes')
              .select('id')
              .eq('video_id', videoId)
              .eq('user_id', currentUser.id)
              .maybeSingle();
              
            setIsLiked(!!likeData);
            
            const { data: subscriptionData } = await supabase
              .from('subscriptions')
              .select('id')
              .eq('creator_id', videoData.user_id)
              .eq('subscriber_id', currentUser.id)
              .maybeSingle();
              
            setIsSubscribed(!!subscriptionData);
          }

          const { data: commentsData, error: commentsError } = await supabase
            .from('comments')
            .select('id, content, created_at, user_id')
            .eq('video_id', videoId)
            .order('created_at', { ascending: false });

          if (commentsError) throw commentsError;

          if (commentsData) {
            const commentsWithUserData = await Promise.all(
              commentsData.map(async (comment) => {
                const { data: userData } = await supabase
                  .from('profiles')
                  .select('username, avatar_url')
                  .eq('id', comment.user_id)
                  .single();

                return {
                  id: comment.id,
                  user: {
                    username: userData?.username || 'Unknown User',
                    avatar: userData?.avatar_url
                  },
                  content: comment.content,
                  created_at: comment.created_at
                };
              })
            );
            
            setComments(commentsWithUserData);
          }
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
      setIsPlaying(false);
    }
  }, [isOpen, videoId, currentUser]);

  const handlePlayVideo = () => {
    setIsPlaying(true);
    if (videoRef.current) {
      videoRef.current.play();
    }
  };

  const checkAuth = async () => {
    const { data } = await supabase.auth.getSession();
    return !!data.session;
  };

  const handleAuthAction = async (action: () => Promise<void>, actionName: string) => {
    const isAuthenticated = await checkAuth();
    
    if (isAuthenticated) {
      await action();
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
    handleAuthAction(async () => {
      if (!video || !currentUser) return;
      
      if (isSubscribed) {
        const { error } = await supabase
          .from('subscriptions')
          .delete()
          .eq('subscriber_id', currentUser.id)
          .eq('creator_id', video.creator.id);
          
        if (error) {
          toast.error('Failed to unsubscribe');
          console.error('Unsubscribe error:', error);
          return;
        }
        
        setIsSubscribed(false);
        toast.success('Unsubscribed successfully');
      } else {
        const { error } = await supabase
          .from('subscriptions')
          .insert({
            subscriber_id: currentUser.id,
            creator_id: video.creator.id
          });
          
        if (error) {
          toast.error('Failed to subscribe');
          console.error('Subscribe error:', error);
          return;
        }
        
        setIsSubscribed(true);
        toast.success('Subscribed successfully');
      }
      
      if (video) {
        setVideo({
          ...video,
          creator: {
            ...video.creator,
            subscribers: isSubscribed ? 
              Math.max(0, (video.creator.subscribers || 0) - 1) : 
              (video.creator.subscribers || 0) + 1
          }
        });
      }
    }, 'subscribe');
  };

  const handleLike = () => {
    handleAuthAction(async () => {
      if (!video || !currentUser) return;
      
      if (isLiked) {
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', currentUser.id)
          .eq('video_id', video.id);
          
        if (error) {
          toast.error('Failed to remove like');
          console.error('Unlike error:', error);
          return;
        }
        
        setIsLiked(false);
        setVideo({
          ...video,
          likes: Math.max(0, video.likes - 1)
        });
        toast.success('Removed like');
      } else {
        const { error } = await supabase
          .from('likes')
          .insert({
            user_id: currentUser.id,
            video_id: video.id
          });
          
        if (error) {
          toast.error('Failed to like video');
          console.error('Like error:', error);
          return;
        }
        
        setIsLiked(true);
        setVideo({
          ...video,
          likes: video.likes + 1
        });
        toast.success('Added like');
      }
    }, 'like this video');
  };

  const handleComment = () => {
    if (!commentText.trim()) return;
    
    handleAuthAction(async () => {
      if (!video || !currentUser) return;
      
      const { data, error } = await supabase
        .from('comments')
        .insert({
          user_id: currentUser.id,
          video_id: video.id,
          content: commentText
        })
        .select('id, created_at')
        .single();
        
      if (error) {
        toast.error('Failed to post comment');
        console.error('Comment error:', error);
        return;
      }
      
      const newComment = {
        id: data.id,
        user: { 
          username: currentUser.username,
          avatar: undefined
        },
        content: commentText,
        created_at: data.created_at
      };
      
      setComments([newComment, ...comments]);
      setCommentText('');
      
      if (video) {
        setVideo({
          ...video,
          comments: video.comments + 1
        });
      }
      
      toast.success('Comment added successfully');
    }, 'comment');
  };

  const getTimeDifference = (date: Date | string) => {
    const now = new Date();
    const past = new Date(date);
    const diffInMs = now.getTime() - past.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    const diffInMonths = Math.floor(diffInDays / 30);
    
    if (diffInMonths > 0) {
      return `${diffInMonths} ${diffInMonths === 1 ? 'month' : 'months'} ago`;
    } else if (diffInDays > 0) {
      return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
    } else if (diffInHours > 0) {
      return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
    } else if (diffInMinutes > 0) {
      return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;
    } else {
      return 'Just now';
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-xl">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="loader"></div>
          </div>
        ) : video ? (
          <div className="flex flex-col max-h-[80vh]">
            <div className="relative w-full aspect-video bg-black">
              {isPlaying ? (
                <video
                  ref={videoRef}
                  src={video.videoUrl}
                  poster={video.thumbnail}
                  className="w-full h-full object-contain"
                  controls
                ></video>
              ) : (
                <>
                  <img 
                    src={video.thumbnail || '/placeholder.svg'} 
                    alt={video.title}
                    className="w-full h-full object-cover"
                  />
                  <div 
                    className="absolute inset-0 flex items-center justify-center cursor-pointer"
                    onClick={handlePlayVideo}
                  >
                    <div className="bg-indigo-600 rounded-full p-4 hover:bg-indigo-700 transition-colors">
                      <Play className="h-8 w-8 text-white fill-white" />
                    </div>
                  </div>
                </>
              )}
            </div>
            
            <ScrollArea className="flex-1 overflow-auto" style={{ maxHeight: "calc(80vh - 56.25%)" }}>
              <div className="p-4">
                <h2 className="text-xl font-bold mb-2">{video.title}</h2>
                
                {video.category && (
                  <div className="mb-2">
                    <span className="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">
                      {video.category}
                    </span>
                  </div>
                )}
                
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
                      <p className="text-sm text-gray-500">{video.creator.subscribers?.toLocaleString()} Subscribers</p>
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
                
                <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <Eye className="h-4 w-4 mr-1" />
                      <span>{video.immersions?.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center cursor-pointer" onClick={handleLike}>
                      <Heart className={`h-4 w-4 mr-1 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                      <span>{video.likes?.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center">
                      <MessageSquare className="h-4 w-4 mr-1" />
                      <span>{video.comments?.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center">
                      <Share2 className="h-4 w-4 mr-1" />
                      <span>Share</span>
                    </div>
                  </div>
                  
                  <span>{getTimeDifference(video.createdAt)}</span>
                </div>
                
                {video.description && (
                  <div className="p-3 bg-gray-50 rounded-lg mb-4">
                    <p className="text-sm text-gray-700">{video.description}</p>
                  </div>
                )}
                
                <div className="border-t pt-4">
                  <h3 className="font-medium mb-3">Comments</h3>
                  
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
                        <AvatarImage src={comment.user.avatar} alt={comment.user.username} />
                        <AvatarFallback className="bg-gray-200">
                          {comment.user.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{comment.user.username}</p>
                          <span className="text-xs text-gray-500">{getTimeDifference(comment.created_at)}</span>
                        </div>
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
            </ScrollArea>
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
