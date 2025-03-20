
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart3, Eye, Heart, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';

interface VideoAnalyticsPreviewProps {
  videoId: string;
  views: number;
  likes: number;
  comments: number;
}

const VideoAnalyticsPreview = ({ videoId, views, likes, comments }: VideoAnalyticsPreviewProps) => {
  return (
    <Card className="mt-2 bg-gray-50">
      <CardContent className="p-4">
        <div className="flex justify-between items-center">
          <div className="flex gap-6">
            <div className="flex items-center gap-1">
              <Eye className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">{views.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <Heart className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">{likes.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageSquare className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">{comments.toLocaleString()}</span>
            </div>
          </div>
          <Link to={`/video-analytics/${videoId}`}>
            <Button variant="outline" size="sm" className="flex items-center gap-1">
              <BarChart3 className="h-4 w-4" />
              <span>Analytics</span>
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

export default VideoAnalyticsPreview;
