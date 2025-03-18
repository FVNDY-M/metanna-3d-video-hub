import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import PageLayout from '@/components/PageLayout';
import { Heart, MessageSquare, Share2, Bookmark, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';

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
  
  // Mock comments data
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
    },
  ];

  useEffect(() => {
    const fetchVideo = async () => {
      setLoading(true);
      try {
        // Simulate API call
        setTimeout(() => {
          const foundVideo = mockVideos.find(v => v.id === id);
          
          if (foundVideo) {
            setVideo(foundVideo);
            setLikeCount(foundVideo.likes);
            setComments(mockComments);
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

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
  };

  const handleComment = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!comment.trim()) return;
    
    const newComment = {
      id: Date.now().toString(),
      user: {
        username: 'You',
        avatar: 'https://randomuser.me/api/portraits/men/1.jpg',
      },
      text: comment,
      createdAt: new Date(),
      likes: 0,
    };
    
    setComments(prev => [newComment, ...prev]);
    setComment('');
  };

  // Format date to relative time
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

  return (
    <PageLayout user={user}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-16 animate-fade-in">
        {/* Video Player */}
        <div className="mb-6 rounded-xl overflow-hidden shadow-md bg-black aspect-video">
          <img 
            src={video.thumbnail}
            alt={video.title}
            className="w-full h-full object-cover"
          />
          {/* This would be replaced with an actual video player in a real app */}
        </div>
        
        {/* Video Info */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">{video.title}</h1>
          
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center">
              <Link to={`/creator/${video.creator.username}`}>
                <Avatar className="h-10 w-10 mr-3 hover:ring-2 hover:ring-metanna-blue transition-all">
                  <AvatarImage src={video.creator.avatar} alt={video.creator.username} />
                  <AvatarFallback className="bg-metanna-blue text-white">
                    {video.creator.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Link>
              
              <div>
                <Link to={`/creator/${video.creator.username}`} className="hover:text-metanna-blue transition-colors">
                  <h3 className="font-medium text-gray-900">{video.creator.username}</h3>
                </Link>
                <p className="text-sm text-gray-500">{video.immersions.toLocaleString()} immersions</p>
              </div>
              
              <Button
                variant="outline"
                className="ml-4 rounded-full"
              >
                Follow
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
        </div>
        
        <Separator className="mb-6" />
        
        {/* Description */}
        <div className="mb-8 bg-gray-50 p-4 rounded-lg">
          <p className="text-gray-700">
            Experience an immersive augmented reality journey through this stunning virtual environment. 
            Navigate through interactive elements and discover hidden details throughout this carefully crafted experience.
          </p>
          <div className="mt-3 text-sm text-gray-500">
            <span>Published {formatRelativeTime(video.createdAt)}</span>
          </div>
        </div>
        
        {/* Comments */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Comments ({comments.length})
          </h2>
          
          {/* Comment Form */}
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
          
          {/* Comments List */}
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="flex space-x-3 animate-fade-in">
                <Link to={`/creator/${comment.user.username}`}>
                  <Avatar className="h-8 w-8 hover:ring-2 hover:ring-metanna-blue transition-all">
                    <AvatarImage src={comment.user.avatar} alt={comment.user.username} />
                    <AvatarFallback className="bg-metanna-blue text-white">
                      {comment.user.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <Link to={`/creator/${comment.user.username}`} className="hover:text-metanna-blue transition-colors">
                      <h4 className="font-medium text-gray-900">{comment.user.username}</h4>
                    </Link>
                    <span className="text-xs text-gray-500">{formatRelativeTime(comment.createdAt)}</span>
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
                    <button className="text-xs text-gray-500 hover:text-metanna-blue flex items-center">
                      <Flag className="h-3.5 w-3.5 mr-1" />
                      Report
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default VideoDetail;
