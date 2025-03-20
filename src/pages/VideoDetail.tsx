import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import PageLayout from '@/components/PageLayout';
import { Heart, MessageSquare, Share2, Bookmark, Flag, Info, Pin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase, toggleCommentPinStatus } from '@/integrations/supabase/client';

// Import the mock data
import { mockVideos } from '@/utils/mockData';

const VideoDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [video, setVideo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [likeCount, setLikeCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  const [user, setUser] = useState(null); // For demo purposes
  const [activeTab, setActiveTab] = useState('information');
  const [currentUser, setCurrentUser] = useState<{ id: string; username: string } | null>(null);

  const mockComments = [
    {
      id: '1',
      user: {
        username: 'JuliaP',
        avatar: 'https://randomuser.me/api/portraits/women/8.jpg',
      },
      text: 'This is absolutely mind-blowing! The detail in this AR experience is incredible.',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
      likes: 12,
      is_pinned: false
    },
    {
      id: '2',
      user: {
        username: 'AREnthusiast',
        avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
      },
      text: 'The spatial audio in this is perfect. It really helps with the immersion.',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5), // 5 days ago
      likes: 8,
      is_pinned: false
    },
    {
      id: '3',
      user: {
        username: 'TechReviewer',
        avatar: 'https://randomuser.me/api/portraits/women/23.jpg',
      },
      text: 'What hardware did you use to capture this? The tracking is so smooth!',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7), // 7 days ago
      likes: 5,
      is_pinned: false
    },
  ];

  useEffect(() => {
    const checkCurrentUser = async () => {
      const { data: session } = await supabase.auth.getSession();
      if (session.session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, username')
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
    const fetchVideo = async () => {
      setLoading(true);
      try {
        setTimeout(() => {
          const foundVideo = mockVideos.find(v => v.id === id);
          
          if (foundVideo) {
            setVideo(foundVideo);
            setLikeCount(foundVideo.likes);
            
            if (id) {
              fetchComments(id);
            } else {
              setComments(mockComments);
            }
          }
          
          setLoading(false);
        }, 800);
      } catch (error) {
        console.error('Error fetching video:', error);
        setLoading(false);
      }
    };

    if (id) {
      fetchVideo();
    }
  }, [id]);

  const fetchComments = async (videoId: string) => {
    try {
      const { data: commentsData, error } = await supabase
        .from('comments')
        .select('id, content, created_at, user_id, is_pinned')
        .eq('video_id', videoId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching comments:', error);
        setComments(mockComments);
        return;
      }

      if (commentsData && commentsData.length > 0) {
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
              text: comment.content,
              createdAt: comment.created_at,
              likes: 0,
              is_pinned: comment.is_pinned || false
            };
          })
        );
        
        setComments(sortCommentsByPinned(commentsWithUserData));
      } else {
        setComments(mockComments);
      }
    } catch (err) {
      console.error('Error processing comments:', err);
      setComments(mockComments);
    }
  };

  const sortCommentsByPinned = (comments: any[]) => {
    return [...comments].sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
  };

  const handleComment = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!comment.trim()) return;
    
    if (id && currentUser) {
      saveComment(id, comment);
    } else {
      const newComment = {
        id: Date.now().toString(),
        user: {
          username: currentUser?.username || 'You',
          avatar: 'https://randomuser.me/api/portraits/men/1.jpg',
        },
        text: comment,
        createdAt: new Date(),
        likes: 0,
        is_pinned: false
      };
      
      setComments(prev => [newComment, ...prev]);
      setComment('');
    }
  };

  const saveComment = async (videoId: string, content: string) => {
    if (!currentUser) {
      toast.error("You need to be logged in to comment");
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          user_id: currentUser.id,
          video_id: videoId,
          content: content,
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
        text: content,
        createdAt: data.created_at,
        likes: 0,
        is_pinned: false
      };
      
      setComments(prev => [newComment, ...prev]);
      setComment('');
      toast.success('Comment added successfully');
    } catch (err) {
      console.error('Error saving comment:', err);
      toast.error('Something went wrong');
    }
  };

  const handlePinComment = async (commentId: string, isPinned: boolean) => {
    if (!currentUser || !id) {
      toast.error("You need to be logged in to pin comments");
      return;
    }
    
    try {
      const { data: videoData } = await supabase
        .from('videos')
        .select('user_id')
        .eq('id', id)
        .maybeSingle();
        
      if (!videoData || videoData.user_id !== currentUser.id) {
        toast.error("Only the video creator can pin comments");
        return;
      }
      
      const { success, data, error } = await toggleCommentPinStatus(commentId, id, isPinned);
      
      if (!success) {
        toast.error('Failed to update comment');
        console.error('Pin/unpin error:', error);
        return;
      }
      
      setComments(prevComments => {
        let updatedComments = [...prevComments];
        
        if (!isPinned) {
          updatedComments = updatedComments.map(c => ({...c, is_pinned: false}));
        }
        
        updatedComments = updatedComments.map(comment => 
          comment.id === commentId
            ? { ...comment, is_pinned: !isPinned }
            : comment
        );
        
        return sortCommentsByPinned(updatedComments);
      });
      
      toast.success(isPinned ? 'Comment unpinned' : 'Comment pinned');
    } catch (err) {
      console.error('Error pinning comment:', err);
      toast.error('Something went wrong');
    }
  };

  const formatRelativeTime = (date: Date | string) => {
    const now = new Date();
    const past = new Date(date);
    const diffInMs = now.getTime() - past.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes} min${diffInMinutes === 1 ? '' : 's'} ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
    } else {
      return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
    }
  };

  if (loading) {
    return (
      <PageLayout user={user}>
        <div className="flex justify-center items-center py-32">
          <div className="loader"></div>
        </div>
      </PageLayout>
    );
  }

  if (!video) {
    return (
      <PageLayout user={user}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-gray-900 mb-4">Video Not Found</h1>
            <p className="text-gray-500 mb-8">The video you're looking for doesn't exist or has been removed.</p>
            <Button asChild>
              <Link to="/">Back to Home</Link>
            </Button>
          </div>
        </div>
      </PageLayout>
    );
  }

  const isVideoCreator = currentUser && video.creator && currentUser.id === video.creator.id;

  return (
    <PageLayout user={user}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-16 animate-fade-in">
        <div className="mb-6 rounded-xl overflow-hidden shadow-md bg-black aspect-video">
          <img 
            src={video.thumbnail}
            alt={video.title}
            className="w-full h-full object-cover"
          />
        </div>
        
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">{video.title}</h1>
        
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center">
            <Link to={`/profile/${video.creator.username}`}>
              <Avatar className="h-10 w-10 mr-3 cursor-pointer">
                <AvatarImage src={video.creator.avatar} alt={video.creator.username} />
                <AvatarFallback className="bg-metanna-blue text-white">
                  {video.creator.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Link>
            
            <div>
              <Link to={`/profile/${video.creator.username}`} className="hover:text-metanna-blue transition-colors">
                <h3 className="font-medium text-gray-900">{video.creator.username}</h3>
              </Link>
              <p className="text-sm text-gray-500">{video.immersions.toLocaleString()} immersions</p>
            </div>
            
            <Button
              variant="outline"
              className="ml-4 rounded-full"
            >
              Subscribe
            </Button>
          </div>
          
          <div className="flex space-x-2">
            <Button
              variant={isLiked ? "default" : "outline"}
              className={`flex items-center gap-2 rounded-full ${isLiked ? 'bg-metanna-blue text-white' : ''}`}
              onClick={handleLike}
            >
              <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
              <span>{likeCount}</span>
            </Button>
            
            <Button
              variant="outline"
              className="flex items-center gap-2 rounded-full"
            >
              <Share2 className="h-4 w-4" />
              <span>Share</span>
            </Button>
            
            <Button
              variant="outline"
              className="flex items-center gap-2 rounded-full"
            >
              <Bookmark className="h-4 w-4" />
              <span>Save</span>
            </Button>
          </div>
        </div>
        
        <Separator className="mb-4" />
        
        <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
          <div className="flex items-center space-x-6">
            <div className="flex items-center">
              <span className="font-medium">{video.immersions.toLocaleString()}</span>
              <span className="ml-1">views</span>
            </div>
            <div className="flex items-center">
              <span className="font-medium">{likeCount.toLocaleString()}</span>
              <span className="ml-1">likes</span>
            </div>
            <div className="flex items-center">
              <span className="font-medium">{comments.length.toLocaleString()}</span>
              <span className="ml-1">comments</span>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <Button
              variant={activeTab === 'information' ? 'default' : 'outline'} 
              size="sm"
              className={`p-2 rounded-full ${activeTab === 'information' ? 'bg-metanna-blue text-white' : ''}`}
              onClick={() => setActiveTab('information')}
            >
              <Info className="h-4 w-4" />
            </Button>
            
            <Button
              variant={activeTab === 'comments' ? 'default' : 'outline'}
              size="sm" 
              className={`p-2 rounded-full ${activeTab === 'comments' ? 'bg-metanna-blue text-white' : ''}`}
              onClick={() => setActiveTab('comments')}
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="mt-2">
          {activeTab === 'information' && (
            <div className="animate-fade-in">
              <div className="mb-8 bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700">
                  Experience an immersive augmented reality journey through this stunning virtual environment. 
                  Navigate through interactive elements and discover hidden details throughout this carefully crafted experience.
                </p>
                <div className="mt-3 text-sm text-gray-500">
                  <span>Published {formatRelativeTime(video.createdAt)}</span>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'comments' && (
            <div className="animate-fade-in">
              <form onSubmit={handleComment} className="mb-6">
                <Textarea
                  placeholder="Add a comment..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="resize-none mb-3"
                />
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    className="bg-metanna-blue hover:bg-metanna-blue/90 text-white rounded-full"
                    disabled={!comment.trim()}
                  >
                    Comment
                  </Button>
                </div>
              </form>
              
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className={`${comment.is_pinned ? 'bg-blue-50 p-3 border-l-4 border-metanna-blue rounded-md' : ''}`}>
                    <div className="flex space-x-3 animate-fade-in">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={comment.user.avatar} alt={comment.user.username} />
                        <AvatarFallback className="bg-metanna-blue text-white">
                          {comment.user.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium text-gray-900">{comment.user.username}</h4>
                          <span className="text-xs text-gray-500">{formatRelativeTime(comment.createdAt)}</span>
                          {comment.is_pinned && (
                            <span className="flex items-center text-xs text-metanna-blue">
                              <Pin className="h-3 w-3 mr-1" /> Pinned
                            </span>
                          )}
                        </div>
                        
                        <p className="text-gray-700">{comment.text}</p>
                        
                        <div className="flex items-center space-x-4 mt-2">
                          <button className="text-xs text-gray-500 hover:text-metanna-blue flex items-center">
                            <Heart className="h-3.5 w-3.5 mr-1" />
                            <span>{comment.likes}</span>
                          </button>
                          <button className="text-xs text-gray-500 hover:text-metanna-blue">
                            Reply
                          </button>
                          {isVideoCreator && (
                            <button 
                              className={`text-xs ${comment.is_pinned ? 'text-metanna-blue' : 'text-gray-500 hover:text-metanna-blue'} flex items-center`}
                              onClick={() => handlePinComment(comment.id, comment.is_pinned)}
                            >
                              <Pin className="h-3.5 w-3.5 mr-1" />
                              {comment.is_pinned ? 'Unpin' : 'Pin'}
                            </button>
                          )}
                          <button className="text-xs text-gray-500 hover:text-metanna-blue flex items-center">
                            <Flag className="h-3.5 w-3.5 mr-1" />
                            Report
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="flex justify-center mt-8">
          <div className="flex space-x-2">
            <div className={`h-2 w-2 rounded-full ${activeTab === 'information' ? 'bg-metanna-blue' : 'bg-gray-300'}`}></div>
            <div className={`h-2 w-2 rounded-full ${activeTab === 'comments' ? 'bg-metanna-blue' : 'bg-gray-300'}`}></div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default VideoDetail;
