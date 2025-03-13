
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import PageLayout from '@/components/PageLayout';
import { Heart, MessageSquare, Share2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { AspectRatio } from '@/components/ui/aspect-ratio';

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
  const [isSubscribed, setIsSubscribed] = useState(false);
  
  // Mock comments data
  const mockComments = [
    {
      id: '1',
      user: {
        username: '@user1',
        avatar: 'https://randomuser.me/api/portraits/women/8.jpg',
      },
      text: 'Amazing environment!',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
      likes: 12,
    },
  ];

  useEffect(() => {
    const fetchVideo = async () => {
      setLoading(true);
      try {
        // Simulate API call
        setTimeout(() => {
          const foundVideo = mockVideos.find(v => v.id === id) || {
            id: '1',
            title: 'The Healer',
            thumbnail: '/lovable-uploads/31a37b4a-85a1-4afc-a18b-3ac93bdc37af.png',
            creator: {
              username: 'Guillermo Lorca',
              avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
              subscribers: '100K Subscribers'
            },
            views: '3K',
            likes: 12,
            comments: 1,
            immersions: 3000,
            createdAt: '11 months ago'
          };
          
          setVideo(foundVideo);
          setLikeCount(foundVideo.likes);
          setComments(mockComments);
          
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

  const handleSubscribe = () => {
    setIsSubscribed(!isSubscribed);
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
      <div className="max-w-screen-lg mx-auto animate-fade-in p-4">
        <Card className="overflow-hidden border-0 shadow-lg rounded-2xl">
          <AspectRatio ratio={16/9}>
            <img 
              src={video.thumbnail}
              alt={video.title}
              className="w-full h-full object-cover"
            />
          </AspectRatio>
          
          <div className="p-5">
            <h1 className="text-xl font-semibold mb-4">{video.title}</h1>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={video.creator.avatar} alt={video.creator.username} />
                  <AvatarFallback className="bg-metanna-blue text-white">
                    {video.creator.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div>
                  <h3 className="font-medium">{video.creator.username}</h3>
                  <p className="text-xs text-gray-500">{video.creator.subscribers}</p>
                </div>
              </div>
              
              <Button
                onClick={handleSubscribe}
                className={`rounded-full px-6 ${isSubscribed ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : 'bg-metanna-blue hover:bg-metanna-blue/90'}`}
              >
                {isSubscribed ? 'Subscribed' : 'Subscribe'}
              </Button>
            </div>
            
            <div className="flex items-center gap-4 mt-5">
              <div className="flex items-center gap-1 text-gray-500">
                <Heart className={`h-4 w-4 ${isLiked ? 'fill-metanna-blue text-metanna-blue' : ''}`} />
                <span className="text-sm">{likeCount}</span>
              </div>
              
              <div className="flex items-center gap-1 text-gray-500">
                <MessageSquare className="h-4 w-4" />
                <span className="text-sm">{comments.length}</span>
              </div>
              
              <div className="flex items-center gap-1 text-gray-500">
                <Share2 className="h-4 w-4" />
              </div>
              
              <div className="ml-auto flex items-center gap-1 text-gray-500">
                <Clock className="h-4 w-4" />
                <span className="text-sm">{video.createdAt}</span>
              </div>
            </div>
            
            {/* Comments section */}
            <div className="mt-6 space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={comment.user.avatar} alt={comment.user.username} />
                    <AvatarFallback className="bg-metanna-blue text-white">
                      {comment.user.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div>
                    <div className="text-sm font-medium">{comment.user.username}</div>
                    <p className="text-sm">{comment.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </PageLayout>
  );
};

export default VideoDetail;
