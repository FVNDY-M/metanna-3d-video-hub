
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload as UploadIcon, Image as ImageIcon, X, Check } from 'lucide-react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: {
    username: string;
    avatar?: string;
  } | null;
}

const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, user }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [videoName, setVideoName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file for the thumbnail');
      return;
    }
    
    setThumbnail(file);
    setThumbnailPreview(URL.createObjectURL(file));
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('video/')) {
      setError('Please upload a video file');
      return;
    }
    
    setVideo(file);
    setVideoName(file.name);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title) {
      setError('Please add a title for your video');
      return;
    }
    
    if (!thumbnail) {
      setError('Please upload a thumbnail');
      return;
    }
    
    if (!video) {
      setError('Please upload a video');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In a real app, this would be an upload API call
      console.log('Uploading:', { title, description, thumbnail, video });
      
      // Close modal and reset form
      onClose();
      resetForm();
      
      // For demo purposes - navigate to home page
      navigate('/');
    } catch (err) {
      setError('Failed to upload video. Please try again.');
      console.error('Upload error:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setThumbnail(null);
    setThumbnailPreview(null);
    setVideo(null);
    setVideoName(null);
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">Upload Video</DialogTitle>
        </DialogHeader>
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-500 rounded-lg text-sm">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Add a title that describes your video"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-12"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Tell viewers about your video"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-32 resize-none"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Thumbnail</Label>
            <div className="flex items-start space-x-4">
              <div className="w-40 h-24 overflow-hidden rounded-lg bg-gray-100 flex items-center justify-center">
                {thumbnailPreview ? (
                  <img 
                    src={thumbnailPreview} 
                    alt="Thumbnail preview" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageIcon className="text-gray-400 h-8 w-8" />
                )}
              </div>
              
              <div className="flex-1">
                <Label htmlFor="thumbnail-upload" className="cursor-pointer">
                  <div className="flex items-center justify-center w-full h-12 px-4 border-2 border-dashed border-gray-300 rounded-lg transition-colors hover:border-metanna-blue">
                    <span className="flex items-center text-sm text-gray-500">
                      <UploadIcon className="mr-2 h-4 w-4" />
                      {thumbnail ? 'Change thumbnail' : 'Upload thumbnail'}
                    </span>
                  </div>
                  <Input
                    id="thumbnail-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleThumbnailChange}
                    className="sr-only"
                  />
                </Label>
                <p className="mt-2 text-xs text-gray-500">
                  Recommended: 1280×720 (16:9). Max size: 2MB
                </p>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Video</Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 transition-colors hover:border-metanna-blue">
              {video ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                      <Check className="h-6 w-6 text-green-500" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">{videoName}</p>
                      <p className="text-xs text-gray-500">Video uploaded successfully</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setVideo(null);
                      setVideoName(null);
                    }}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              ) : (
                <Label htmlFor="video-upload" className="flex flex-col items-center justify-center cursor-pointer">
                  <UploadIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm font-medium text-gray-900">Click to upload video</p>
                  <p className="mt-1 text-xs text-gray-500">
                    MP4, MOV, or WEBM. Maximum file size 500MB
                  </p>
                  <Input
                    id="video-upload"
                    type="file"
                    accept="video/*"
                    onChange={handleVideoChange}
                    className="sr-only"
                  />
                </Label>
              )}
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-metanna-blue hover:bg-metanna-blue/90 text-white"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <div className="loader w-5 h-5 border-white/20 border-t-white animate-spin rounded-full border-2"></div>
                  <span className="ml-2">Uploading...</span>
                </span>
              ) : (
                "Upload Video"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UploadModal;
