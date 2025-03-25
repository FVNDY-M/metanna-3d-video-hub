
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload as UploadIcon, Image as ImageIcon, X, Check, Copy, CropIcon } from 'lucide-react';
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
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const navigate = useNavigate();
  
  // Thumbnail cropping refs and state
  const thumbnailCanvasRef = useRef<HTMLCanvasElement>(null);
  const [thumbnailCropped, setThumbnailCropped] = useState<Blob | null>(null);
  const thumbnailDropAreaRef = useRef<HTMLDivElement>(null);

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
    
    processImageFile(file);
  };
  
  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file for the thumbnail');
      toast.error('Invalid file type for thumbnail');
      return;
    }
    
    setThumbnail(file);
    
    // Create a preview and crop to 16:9 aspect ratio
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const img = new Image();
        img.onload = () => {
          cropAndSetThumbnail(img);
        };
        img.src = event.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      processImageFile(file);
    }
  };
  
  const cropAndSetThumbnail = (img: HTMLImageElement) => {
    // Create an off-screen canvas with 16:9 aspect ratio
    const canvas = thumbnailCanvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas to 16:9 aspect ratio with reasonable size
    canvas.width = 640;
    canvas.height = 360;
    
    // Calculate cropping dimensions
    const aspectRatio = 16 / 9;
    let srcWidth = img.width;
    let srcHeight = img.height;
    let srcX = 0;
    let srcY = 0;
    
    // If image is wider than 16:9, crop the sides
    if (img.width / img.height > aspectRatio) {
      srcWidth = img.height * aspectRatio;
      srcX = (img.width - srcWidth) / 2;
    } 
    // If image is taller than 16:9, crop the top and bottom
    else {
      srcHeight = img.width / aspectRatio;
      srcY = (img.height - srcHeight) / 2;
    }
    
    // Clear canvas and draw the cropped image
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(
      img, 
      srcX, srcY, srcWidth, srcHeight, 
      0, 0, canvas.width, canvas.height
    );
    
    // Get the cropped image as blob
    canvas.toBlob((blob) => {
      if (blob) {
        setThumbnailCropped(blob);
        setThumbnailPreview(URL.createObjectURL(blob));
      }
    }, 'image/jpeg', 0.9);
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

  const areRequiredFieldsFilled = (): boolean => {
    return !!(title.trim() && thumbnail && video);
  };

  const uploadToStorage = async (file: File | Blob, bucket: string, path: string, filename: string) => {
    try {
      // Fix: Use only alphanumeric characters, underscores, and dashes in file paths
      const fileExt = filename.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = path ? `${path}/${fileName}` : fileName;
      
      console.log(`Uploading to bucket: ${bucket}, path: ${filePath}`);
      
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) throw error;
      
      // Get the public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);
        
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
      
      // Use simplified file paths that don't include user IDs directly in the path
      // Upload the cropped thumbnail if available, otherwise use the original thumbnail
      const thumbnailToUpload = thumbnailCropped || thumbnail;
      const thumbnailFilename = thumbnail?.name || 'thumbnail.jpg';
      
      const thumbnailUrl = await uploadToStorage(
        thumbnailToUpload!, 
        'thumbnails', 
        '', 
        thumbnailFilename
      );
      
      const videoUrl = await uploadToStorage(
        video!, 
        'videos', 
        '', 
        video!.name
      );
      
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
    setThumbnailCropped(null);
    setVideo(null);
    setVideoName(null);
    setVideoLink(null);
    setError('');
    setUploadProgress(0);
    setUploadPhase('idle');
    setIsDraggingOver(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader>
          <DialogTitle className="sr-only">Upload Video</DialogTitle>
        </DialogHeader>
        <div className="bg-[#F8FAFC] p-8 rounded-lg">
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-500 rounded-lg text-sm">
              {error}
            </div>
          )}
          
          {/* Hidden canvas for thumbnail cropping */}
          <canvas 
            ref={thumbnailCanvasRef} 
            className="hidden"
          ></canvas>
          
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
                      ref={thumbnailDropAreaRef}
                      className={`border border-gray-300 rounded-md bg-white overflow-hidden cursor-pointer relative ${isDraggingOver ? 'bg-blue-50 border-blue-400 border-dashed' : ''}`}
                      onClick={() => document.getElementById('thumbnail-upload')?.click()}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      {/* Fixed aspect ratio container */}
                      <div className="aspect-video relative">
                        {thumbnailPreview ? (
                          <img 
                            src={thumbnailPreview} 
                            alt="Thumbnail preview" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-gray-400 h-full">
                            <ImageIcon className="h-12 w-12 mb-2" />
                            <span className="text-sm">Upload thumbnail (16:9 ratio)</span>
                            {isDraggingOver && (
                              <span className="mt-2 text-blue-500 text-sm font-medium">Drop image here</span>
                            )}
                          </div>
                        )}
                        
                        {/* Overlay with explanation */}
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          <div className="text-white text-center p-4">
                            <CropIcon className="h-8 w-8 mx-auto mb-2" />
                            <p className="text-sm">Images will be cropped to 16:9 ratio</p>
                            <p className="text-xs mt-2">Drag and drop or click to upload</p>
                          </div>
                        </div>
                      </div>
                      
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
                disabled={loading || !areRequiredFieldsFilled()}
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
