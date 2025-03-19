
import React, { useEffect, useState, useRef } from 'react';
import { 
  Dialog, 
  DialogContent,
} from "@/components/ui/dialog";
import { Heart, Share2, MessageSquare, Eye, Play, Trash2, AlertTriangle, Pin } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from '@/integrations/supabase/client';
import { incrementVideoView } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { VideoData } from './VideoCard';
import { useNavigate } from 'react-router-dom';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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
  is_pinned: boolean;
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
  const [viewCounted, setViewCounted] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
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

          // We'll count the view only after the user watches 50% of the video
          setViewCounted(false);

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
            .select('id, content, created_at, user_id, is_pinned')
            .eq('video_id', videoId)
            .order('is_pinned', { ascending: false })
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
                  created_at: comment.created_at,
                  is_pinned: comment.is_pinned || false
                };
              })
            );
            
            // Sort comments with pinned ones at the top
            const sortedComments = commentsWithUserData.sort((a, b) => {
              // First sort by pinned status (pinned comments first)
              if (a.is_pinned && !b.is_pinned) return -1;
              if (!a.is_pinned && b.is_pinned) return 1;
              
              // Then sort by creation date (newer comments first)
              return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            });
            
            setComments(sortedComments);
          }
        }
      } catch (error) {
        console.error('Error fetching environment details:', error);
        toast.error('Failed to load environment details');
      } finally {
        setLoading(false);
      }
    };

    if (isOpen && videoId) {
      fetchVideoDetails();
      setIsPlaying(false);
    }
  }, [isOpen, videoId, currentUser]);

  const handleTimeUpdate = () => {
    if (videoRef.current && !viewCounted && videoId) {
      const video = videoRef.current;
      const percentage = (video.currentTime / video.duration) * 100;
      
      // Count view once user has watched 50% of the video
      if (percentage >= 50 && !viewCounted) {
        setViewCounted(true);
        
        // Call the incrementVideoView function with correct videoId
        if (currentUser) {
          incrementVideoView(videoId, currentUser.id);
        } else {
          incrementVideoView(videoId);
        }
        
        // Update UI immediately
        setVideo(prev => {
          if (!prev) return null;
          return {
            ...prev,
            immersions: prev.immersions + 1
          };
        });
      }
    }
  };

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
      if (!video || !currentUser || !video.creator.id) return;
      
      // Prevent subscribing to yourself
      if (currentUser.id === video.creator.id) {
        toast.error("You cannot subscribe to your own channel");
        return;
      }
      
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
          content: commentText,
          is_pinned: false
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
        created_at: data.created_at,
        is_pinned: false
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

  const handlePinComment = (commentId: string, isPinned: boolean) => {
    handleAuthAction(async () => {
      if (!video || !currentUser) return;
      
      // Check if user is the video creator
      if (video.creator.id !== currentUser.id) {
        toast.error("Only the environment creator can pin comments");
        return;
      }
      
      // First unpin all comments if we're pinning a new comment
      if (!isPinned) {
        const { error: unpinError } = await supabase
          .from('comments')
          .update({ is_pinned: false })
          .eq('video_id', video.id)
          .eq('is_pinned', true);
          
        if (unpinError) {
          toast.error('Failed to update pinned comments');
          console.error('Unpin error:', unpinError);
          return;
        }
      }
      
      // Now pin or unpin the selected comment
      const { error } = await supabase
        .from('comments')
        .update({ is_pinned: !isPinned })
        .eq('id', commentId);
        
      if (error) {
        toast.error('Failed to update comment');
        console.error('Pin/unpin error:', error);
        return;
      }
      
      // Update local state and ensure proper sorting
      setComments(prevComments => {
        // First set all comments to unpinned if we're pinning a new one
        let updatedComments = [...prevComments];
        if (!isPinned) {
          updatedComments = updatedComments.map(c => ({ ...c, is_pinned: false }));
        }
        
        // Then update the status of the selected comment
        updatedComments = updatedComments.map(comment => 
          comment.id === commentId
            ? { ...comment, is_pinned: !isPinned }
            : comment
        );
        
        // Now sort the comments with pinned ones at the top
        return updatedComments.sort((a, b) => {
          // First sort by pinned status (pinned comments first)
          if (a.is_pinned && !b.is_pinned) return -1;
          if (!a.is_pinned && b.is_pinned) return 1;
          
          // Then sort by creation date (newer comments first)
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
      });
      
      toast.success(isPinned ? 'Comment unpinned' : 'Comment pinned');
    }, 'pin/unpin comment');
  };

  const deleteVideo = () => {
    handleAuthAction(async () => {
      if (!video || !currentUser) return;
      
      // Check if user owns the video
      if (video.creator.id !== currentUser.id) {
        toast.error("You can only delete your own videos");
        return;
      }
      
      const { error } = await supabase
        .from('videos')
        .delete()
        .eq('id', video.id);
        
      if (error) {
        toast.error('Failed to delete video');
        console.error('Delete error:', error);
        return;
      }
      
      toast.success('Video deleted successfully');
      onClose();
      navigate('/your-videos');
    }, 'delete this video');
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
  
  const isOwnVideo = video && currentUser && video.creator.id === currentUser.id;

  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-5xl p-0 overflow-hidden rounded-xl">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="loader"></div>
            </div>
          ) : video ? (
            <div className="flex max-h-[80vh]">
              {/* Left side: Video and video info */}
              <div className="w-2/3 flex flex-col">
                <div className="relative w-full aspect-video bg-black">
                  {isPlaying ? (
                    <video
                      ref={videoRef}
                      src={video.videoUrl}
                      poster={video.thumbnail}
                      className="w-full h-full object-contain"
                      controls
                      onTimeUpdate={handleTimeUpdate}
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
                
                <ScrollArea className="flex-1 overflow-auto" style={{ maxHeight: "calc(80vh - 56.25% - 2rem)" }}>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-xl font-bold">{video.title}</h2>
                      
                      {isOwnVideo && (
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => setShowDeleteDialog(true)}
                          className="flex items-center gap-1"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>Delete</span>
                        </Button>
                      )}
                    </div>
                    
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
                      
                      {currentUser && currentUser.id !== video.creator.id && (
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
                      )}
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
                  </div>
                </ScrollArea>
              </div>
              
              {/* Right side: Comments section */}
              <div className="w-1/3 border-l">
                <ScrollArea className="h-[80vh]">
                  <div className="p-4">
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
                      <div key={comment.id} className={`flex space-x-3 mb-3 ${comment.is_pinned ? 'bg-indigo-50 p-2 rounded-lg border-l-4 border-indigo-500' : ''}`}>
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={comment.user.avatar} alt={comment.user.username} />
                          <AvatarFallback className="bg-gray-200">
                            {comment.user.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{comment.user.username}</p>
                            <span className="text-xs text-gray-500">{getTimeDifference(comment.created_at)}</span>
                            {comment.is_pinned && (
                              <span className="flex items-center text-xs text-indigo-600">
                                <Pin className="h-3 w-3 mr-1" /> Pinned
                              </span>
                            )}
                          </div>
                          <p className="text-sm">{comment.content}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <button className="text-gray-500 hover:text-gray-700">
                              <Heart className="h-3.5 w-3.5" />
                            </button>
                            <button className="text-gray-500 hover:text-gray-700">
                              <MessageSquare className="h-3.5 w-3.5" />
                            </button>
                            {isOwnVideo && (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button className={`text-sm ${comment.is_pinned ? 'text-indigo-600' : 'text-gray-500'} hover:text-indigo-700`}>
                                    <Pin className="h-3.5 w-3.5" />
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-40 p-2">
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="w-full justify-start"
                                    onClick={() => handlePinComment(comment.id, comment.is_pinned || false)}
                                  >
                                    {comment.is_pinned ? 'Unpin comment' : 'Pin comment'}
                                  </Button>
                                </PopoverContent>
                              </Popover>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center">
              <p>Video not found</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Video</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this video? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteVideo}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default VideoModal;
