
import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageSquare } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export interface VideoData {
  id: string;
  title: string;
  thumbnail: string;
  creator: {
    username: string;
    avatar?: string;
  };
  likes: number;
  comments: number;
  immersions: number;
  createdAt: Date | string;
}

interface VideoCardProps {
  video: VideoData;
  className?: string;
}

const VideoCard: React.FC<VideoCardProps> = ({ video, className = '' }) => {
  // Calculate time difference
  const getTimeDifference = (date: Date | string) => {
    const now = new Date();
    const past = new Date(date);
    const diffInMs = now.getTime() - past.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    const diffInMonths = Math.floor(diffInDays / 30);
    const diffInYears = Math.floor(diffInDays / 365);

    if (diffInYears > 0) {
      return `${diffInYears} ${diffInYears === 1 ? 'year' : 'years'} ago`;
    } else if (diffInMonths > 0) {
      return `${diffInMonths} ${diffInMonths === 1 ? 'month' : 'months'} ago`;
    } else if (diffInDays > 0) {
      return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
    } else {
      return 'Today';
    }
  };

  return (
    <div className={`video-card group w-full ${className}`}>
      <Link to={`/video/${video.id}`} className="block w-full rounded-xl overflow-hidden">
        <div className="relative aspect-video">
          <img 
            src={video.thumbnail || '/placeholder.svg'} 
            alt={video.title}
            className="video-thumbnail w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/placeholder.svg';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
      </Link>
      
      <div className="flex items-center mt-3 space-x-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={video.creator.avatar} alt={video.creator.username} />
          <AvatarFallback className="bg-indigo-600 text-white">
            {video.creator.username.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <Link to={`/video/${video.id}`} className="block">
            <h3 className="text-sm font-medium text-gray-900 truncate hover:text-indigo-600 transition-colors">
              {video.title}
            </h3>
          </Link>
          
          <div className="flex items-center text-xs text-gray-500 mt-1 space-x-3">
            <span>{video.creator.username}</span>
            <span>·</span>
            <span>{video.immersions.toLocaleString()} immersions</span>
            <span>·</span>
            <span>{getTimeDifference(video.createdAt)}</span>
          </div>
          
          <div className="flex items-center mt-2 space-x-4">
            <div className="flex items-center text-xs text-gray-500">
              <Heart className="h-3.5 w-3.5 mr-1" />
              <span>{video.likes.toLocaleString()}</span>
            </div>
            <div className="flex items-center text-xs text-gray-500">
              <MessageSquare className="h-3.5 w-3.5 mr-1" />
              <span>{video.comments.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoCard;
