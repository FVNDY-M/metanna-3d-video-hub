
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload as UploadIcon, Image as ImageIcon, X, Check, Copy } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';

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
  const [visibility, setVisibility] = useState('private');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [videoLink, setVideoLink] = useState<string | null>(null);
  const [uploadPhase, setUploadPhase] = useState<'idle' | 'uploading' | 'processing' | 'complete'>('idle');
  const navigate = useNavigate();

  // Check if user is authenticated
  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setError('You must be logged in to upload videos');
        toast.error('Authentication required');
      }
    };
    
    if (isOpen) {
      checkAuth();
    }
  }, [isOpen]);

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file for the thumbnail');
      toast.error('Invalid file type for thumbnail');
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
      toast.error('Invalid file type for video');
      return;
    }
    
    setVideo(file);
    setVideoName(file.name);
    
    // Start simulated upload
    setUploadProgress(0);
    setUploadPhase('uploading');
    
    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setUploadPhase('processing');
          
          // After "processing", generate video link
          setTimeout(() => {
            const generatedLink = window.location.origin + '/videos/' + uuidv4().slice(0, 8);
            setVideoLink(generatedLink);
            setUploadPhase('complete');
          }, 1500);
          
          return 100;
        }
        return prev + 5;
      });
    }, 200);
  };

  const copyVideoLink = () => {
    if (videoLink) {
      navigator.clipboard.writeText(videoLink);
      toast.success('Video link copied to clipboard');
    }
  };

  const validateForm = () => {
    if (!title.trim()) {
      setError('Please add a title for your video');
      toast.error('Title is required');
      return false;
    }
    
    if (!thumbnail) {
      setError('Please upload a thumbnail');
      toast.error('Thumbnail is required');
      return false;
    }
    
    if (!video) {
      setError('Please upload a video');
      toast.error('Video is required');
      return false;
    }
    
    return true;
  };

  const uploadToStorage = async (file: File, bucket: string, path: string) => {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) throw error;
      
      // Get the public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);
        
      return urlData.publicUrl;
    } catch (error: any) {
      console.error('Storage upload error:', error.message);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    setError('');
    
    try {
      // Get current user
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error('You must be logged in to upload videos');
      }
      
      // Generate unique file names to prevent overwrites
      const videoFileName = `${userData.user.id}/${uuidv4()}-${video!.name}`;
      const thumbnailFileName = `${userData.user.id}/${uuidv4()}-${thumbnail!.name}`;
      
      // Upload files to storage
      const thumbnailUrl = await uploadToStorage(thumbnail!, 'thumbnails', thumbnailFileName);
      const videoUrl = await uploadToStorage(video!, 'videos', videoFileName);
      
      // Create record in videos table
      const { data, error } = await supabase
        .from('videos')
        .insert({
          user_id: userData.user.id,
          title,
          description,
          thumbnail_url: thumbnailUrl,
          video_url: videoUrl,
          visibility
        })
        .select();
      
      if (error) throw error;
      
      // Show success message
      toast.success('Video uploaded successfully!');
      
      // Close modal and reset form
      onClose();
      resetForm();
      
      // Navigate to home page
      navigate('/');
    } catch (err: any) {
      setError(`Failed to upload video: ${err.message}`);
      toast.error('Upload failed. Please try again.');
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
    setVideoLink(null);
    setError('');
    setUploadProgress(0);
    setUploadPhase('idle');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <div className="bg-[#F8FAFC] p-8 rounded-lg">
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-500 rounded-lg text-sm">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h2 className="text-2xl font-medium text-gray-700 mb-6">Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                <div className="md:col-span-3 space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-gray-600">Title</Label>
                    <Input
                      id="title"
                      placeholder="Add a title that describes your video"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="h-12 rounded-md border-gray-200 bg-white"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-gray-600">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Tell viewers about your video"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="min-h-32 resize-none rounded-md border-gray-200 bg-white"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-gray-600">Thumbnail</Label>
                    <div 
                      className="border border-gray-300 rounded-md bg-white h-32 flex items-center justify-center cursor-pointer overflow-hidden"
                      onClick={() => document.getElementById('thumbnail-upload')?.click()}
                    >
                      {thumbnailPreview ? (
                        <img 
                          src={thumbnailPreview} 
                          alt="Thumbnail preview" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-gray-400">
                          <ImageIcon className="h-12 w-12 mb-2" />
                          <span className="text-sm">Upload thumbnail</span>
                        </div>
                      )}
                      <Input
                        id="thumbnail-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleThumbnailChange}
                        className="sr-only"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="md:col-span-2 bg-[#F1F5FF] p-6 rounded-lg space-y-4">
                  <div className="bg-gray-800 aspect-video rounded-md flex items-center justify-center text-white">
                    {uploadPhase === 'uploading' ? (
                      <div className="text-center">
                        <p className="mb-2">Uploading video...</p>
                        <div className="w-48 mx-auto">
                          <Progress value={uploadProgress} className="h-2" />
                        </div>
                      </div>
                    ) : uploadPhase === 'processing' ? (
                      <div className="text-center">
                        <p className="mb-2">Processing video...</p>
                        <div className="w-48 mx-auto">
                          <Progress value={100} className="h-2" />
                        </div>
                      </div>
                    ) : uploadPhase === 'complete' ? (
                      <div className="text-center">
                        <Check className="mx-auto h-10 w-10 text-green-400 mb-2" />
                        <p className="text-sm">Video uploaded</p>
                      </div>
                    ) : (
                      <div 
                        className="w-full h-full flex items-center justify-center cursor-pointer"
                        onClick={() => document.getElementById('video-upload')?.click()}
                      >
                        <div className="text-center">
                          <UploadIcon className="mx-auto h-10 w-10 mb-2" />
                          <p className="text-sm">Upload video</p>
                          <Input
                            id="video-upload"
                            type="file"
                            accept="video/*"
                            onChange={handleVideoChange}
                            className="sr-only"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {videoLink && (
                    <>
                      <div className="space-y-2">
                        <Label className="text-gray-600">Video link</Label>
                        <div className="flex items-center">
                          <Input 
                            value={videoLink} 
                            readOnly 
                            className="pr-10 text-indigo-600 bg-white"
                          />
                          <button 
                            type="button" 
                            className="relative -ml-8 text-gray-500 hover:text-gray-700"
                            onClick={copyVideoLink}
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-gray-600">Visibility</Label>
                        <RadioGroup value={visibility} onValueChange={setVisibility} className="flex flex-col space-y-2">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="private" id="private" />
                            <Label htmlFor="private" className="text-sm font-normal">Private</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="public" id="public" />
                            <Label htmlFor="public" className="text-sm font-normal">Public</Label>
                          </div>
                        </RadioGroup>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="bg-gray-200 hover:bg-gray-300 border-0 text-gray-700"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <div className="loader w-5 h-5 border-white/20 border-t-white animate-spin rounded-full border-2"></div>
                    <span className="ml-2">Uploading...</span>
                  </span>
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UploadModal;
