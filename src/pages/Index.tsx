
import React, { useState, useEffect } from 'react';
import PageLayout from '@/components/PageLayout';
import VideoCard, { VideoData } from '@/components/VideoCard';
import EmptyState from '@/components/EmptyState';

// Temporary mock data - this would be replaced with actual API calls in a real application
const mockVideos: VideoData[] = [
  {
    id: '1',
    title: 'The Healer',
    thumbnail: 'https://images.unsplash.com/photo-1633287453185-17396e946e7a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwxfDB8MXxyYW5kb218MHx8dmlydHVhbCByZWFsaXR5fHx8fHx8MTcxNjMwMjg5Ng&ixlib=rb-4.0.3&q=80&utm_campaign=api-credit&utm_medium=referral&utm_source=unsplash_source&w=1080',
    creator: {
      username: 'Guillermo Lorca',
      avatar: 'https://randomuser.me/api/portraits/men/1.jpg',
    },
    likes: 342,
    comments: 52,
    immersions: 3000,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30 * 11), // 11 months ago
  },
  {
    id: '2',
    title: 'Wanderer above the Sea of Fog',
    thumbnail: 'https://images.unsplash.com/photo-1637611331620-51149c7ceb94?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwxfDB8MXxyYW5kb218MHx8YXVnbWVudGVkIHJlYWxpdHl8fHx8fHwxNzE2MzAyNzk2&ixlib=rb-4.0.3&q=80&utm_campaign=api-credit&utm_medium=referral&utm_source=unsplash_source&w=1080',
    creator: {
      username: 'Caspar David Friedrich',
      avatar: 'https://randomuser.me/api/portraits/men/2.jpg',
    },
    likes: 851,
    comments: 124,
    immersions: 5000,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 365 * 2), // 2 years ago
  },
  {
    id: '3',
    title: 'Azuma House',
    thumbnail: 'https://images.unsplash.com/photo-1650476512176-9fe223ba7c8f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwxfDB8MXxyYW5kb218MHx8M2QgdmlydHVhbCB3b3JsZHx8fHx8fDE3MTYzMDI4NjM&ixlib=rb-4.0.3&q=80&utm_campaign=api-credit&utm_medium=referral&utm_source=unsplash_source&w=1080',
    creator: {
      username: 'Tadao Ando',
      avatar: 'https://randomuser.me/api/portraits/men/3.jpg',
    },
    likes: 623,
    comments: 87,
    immersions: 5000,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 365 * 2), // 2 years ago
  },
  {
    id: '4',
    title: 'Solar System Explorer',
    thumbnail: 'https://images.unsplash.com/photo-1614729939124-032d1jcb6696?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwxfDB8MXxyYW5kb218MHx8YXVnbWVudGVkIHJlYWxpdHkgc3BhY2V8fHx8fHwxNzE2MzAyOTMz&ixlib=rb-4.0.3&q=80&utm_campaign=api-credit&utm_medium=referral&utm_source=unsplash_source&w=1080',
    creator: {
      username: 'Cosmos Labs',
      avatar: 'https://randomuser.me/api/portraits/women/4.jpg',
    },
    likes: 1243,
    comments: 216,
    immersions: 8500,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14), // 14 days ago
  },
  {
    id: '5',
    title: 'Deep Sea VR Experience',
    thumbnail: 'https://images.unsplash.com/photo-1682186034475-0859d6235a38?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwxfDB8MXxyYW5kb218MHx8b2NlYW4gZGVlcCBibHVlfHx8fHx8MTcxNjMwMzAyNA&ixlib=rb-4.0.3&q=80&utm_campaign=api-credit&utm_medium=referral&utm_source=unsplash_source&w=1080',
    creator: {
      username: 'OceanX',
      avatar: 'https://randomuser.me/api/portraits/women/5.jpg',
    },
    likes: 867,
    comments: 104,
    immersions: 6300,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45), // 45 days ago
  },
  {
    id: '6',
    title: 'Ancient Rome Reconstructed',
    thumbnail: 'https://images.unsplash.com/photo-1608425925219-c6c5f89e75ab?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwxfDB8MXxyYW5kb218MHx8YW5jaWVudCBhcmNoaXRlY3R1cmV8fHx8fHwxNzE2MzAzMDk3&ixlib=rb-4.0.3&q=80&utm_campaign=api-credit&utm_medium=referral&utm_source=unsplash_source&w=1080',
    creator: {
      username: 'HistoryVision',
      avatar: 'https://randomuser.me/api/portraits/men/6.jpg',
    },
    likes: 1432,
    comments: 267,
    immersions: 12400,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 110), // 110 days ago
  },
];

const Index = () => {
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null); // In a real app, this would be from an auth context

  useEffect(() => {
    // Simulate API call
    const fetchVideos = async () => {
      setLoading(true);
      try {
        // In a real app, this would be an API call
        setTimeout(() => {
          setVideos(mockVideos);
          setLoading(false);
        }, 800);
      } catch (error) {
        console.error('Error fetching videos:', error);
        setLoading(false);
      }
    };

    fetchVideos();
  }, []);

  return (
    <PageLayout user={user}>
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-8">Discover AR Experiences</h1>
        
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="loader"></div>
          </div>
        ) : videos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        ) : (
          <EmptyState />
        )}
      </div>
    </PageLayout>
  );
};

export default Index;
