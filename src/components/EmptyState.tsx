
import React from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface EmptyStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  icon?: React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  title = "No videos yet",
  description = "Upload a video. Be the first.",
  actionLabel = "Upload a video",
  actionHref = "/upload",
  icon = <Upload className="h-12 w-12 text-metanna-blue" />
}) => {
  return (
    <div className="w-full flex flex-col items-center justify-center py-20 animate-fade-in">
      <div className="rounded-full bg-metanna-blue/10 p-6 mb-6">{icon}</div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 mb-6 text-center max-w-md">{description}</p>
      {actionHref && (
        <Button asChild className="bg-metanna-blue hover:bg-metanna-blue/90 rounded-full">
          <Link to={actionHref}>{actionLabel}</Link>
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
