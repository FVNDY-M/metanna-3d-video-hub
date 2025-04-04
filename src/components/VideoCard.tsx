
import React from 'react';
import { Heart, MessageSquare, AlertTriangle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Link } from 'react-router-dom';

export interface VideoData {
  id: string;
  title: string;
  thumbnail: string;
  videoUrl?: string;
  creator: {
    id?: string;
    username: string;
    avatar?: string;
    subscribers?: number;
  };
  likes: number;
  comments: number;
  immersions: number;
  createdAt: Date | string;
  visibility?: 'public' | 'private';
  category?: string;
  description?: string;
  isSuspended?: boolean;
  suspensionEndDate?: string | null;
}

interface VideoCardProps {
  video: VideoData;
  className?: string;
  isOwner?: boolean;
}

const VideoCard: React.FC<VideoCardProps> = ({ video, className = '', isOwner = false }) => {
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Permanently suspended';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleVideoClick = () => {
    // Use the global function to open the video modal
    if (window.openVideoModal) {
      window.openVideoModal(video.id);
    }
  };

  return (
    <div className={`video-card group w-full ${className}`}>
      <div 
        className="block w-full rounded-xl overflow-hidden cursor-pointer relative" 
        onClick={handleVideoClick}
      >
        <div className="relative aspect-video">
          <img 
            src={video.thumbnail || '/placeholder.svg'} 
            alt={video.title}
            className={`video-thumbnail w-full h-full object-cover ${video.isSuspended ? 'opacity-70' : ''}`}
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/placeholder.svg';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {video.isSuspended && isOwner && (
            <div className="absolute top-0 left-0 right-0 bg-red-600 text-white text-xs py-1 px-2 text-center">
              <div className="flex justify-center items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                <span>Suspended until {formatDate(video.suspensionEndDate)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center mt-3 space-x-3">
        <Link to={`/profile/${video.creator.username}`}>
          <Avatar className="h-8 w-8 cursor-pointer">
            <AvatarImage src={video.creator.avatar} alt={video.creator.username} />
            <AvatarFallback className="bg-indigo-600 text-white">
              {video.creator.username.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Link>
        
        <div className="flex-1 min-w-0">
          <div 
            className="block cursor-pointer"
            onClick={handleVideoClick}
          >
            <h3 className="text-sm font-medium text-gray-900 truncate hover:text-indigo-600 transition-colors">
              {video.title}
              {video.isSuspended && isOwner && (
                <span className="ml-2 text-xs text-red-600">
                  (Suspended)
                </span>
              )}
            </h3>
          </div>
          
          <div className="flex items-center text-xs text-gray-500 mt-1 space-x-3">
            <Link to={`/profile/${video.creator.username}`} className="hover:text-metanna-blue">
              <span>{video.creator.username}</span>
            </Link>
            <span>·</span>
            <span>{video.immersions.toLocaleString()} views</span>
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
