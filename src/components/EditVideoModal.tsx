import React, { useState, useEffect, useRef } from 'react';
import { 
  Dialog, 
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { VideoData } from './VideoCard';
import { CropIcon, Upload, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "./ui/alert-dialog";

interface EditVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoId: string | null;
  onVideoUpdated?: () => void;
  onVideoDeleted?: (videoId: string) => Promise<void>;
  isAdmin?: boolean;
}

const videoCategories = [
  'Gaming',
  'Music',
  'Sports',
  'Technology',
  'Travel',
  'Cooking',
  'Education',
  'Fashion',
  'Art',
  'Fitness',
  'Science',
  'Entertainment',
  'Uncategorized'
];

const EditVideoModal: React.FC<EditVideoModalProps> = ({ 
  isOpen, 
  onClose, 
  videoId,
  onVideoUpdated,
  onVideoDeleted,
  isAdmin = false
}) => {
  const [video, setVideo] = useState<VideoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private'>('private');
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [thumbnailCropped, setThumbnailCropped] = useState<Blob | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailCanvasRef = useRef<HTMLCanvasElement>(null);
  const thumbnailDropAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchVideoDetails = async () => {
      if (!videoId) return;
      
      setLoading(true);
      try {
        const { data: videoData, error } = await supabase
          .from('videos')
          .select(`
            id,
            title,
            description,
            category,
            thumbnail_url,
            video_url,
            created_at,
            user_id,
            views,
            likes_count,
            comments_count,
            visibility
          `)
          .eq('id', videoId)
          .single();

        if (error) throw error;

        if (videoData) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('username, avatar_url, subscriber_count')
            .eq('id', videoData.user_id)
            .single();

          const processedVideo = {
            id: videoData.id,
            title: videoData.title,
            description: videoData.description || '',
            category: videoData.category || 'Uncategorized',
            thumbnail: videoData.thumbnail_url,
            videoUrl: videoData.video_url,
            creator: {
              id: videoData.user_id,
              username: profileData?.username || 'Unknown Creator',
              avatar: profileData?.avatar_url,
              subscribers: profileData?.subscriber_count || 0
            },
            likes: videoData.likes_count || 0,
            comments: videoData.comments_count || 0,
            immersions: videoData.views || 0,
            createdAt: videoData.created_at,
            visibility: videoData.visibility as 'public' | 'private'
          };
          
          setVideo(processedVideo);
          setTitle(processedVideo.title);
          setDescription(processedVideo.description || '');
          setCategory(processedVideo.category || 'Uncategorized');
          setVisibility(processedVideo.visibility || 'private');
          setThumbnailPreview(processedVideo.thumbnail);
        }
      } catch (error) {
        console.error('Error fetching video details:', error);
        toast.error('Failed to load video details');
      } finally {
        setLoading(false);
      }
    };

    if (isOpen && videoId) {
      fetchVideoDetails();
    }
  }, [isOpen, videoId]);

  const handleThumbnailClick = () => {
    fileInputRef.current?.click();
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    processImageFile(file);
  };
  
  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file for the thumbnail');
      return;
    }
    
    setThumbnailFile(file);
    
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
    const canvas = thumbnailCanvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = 640;
    canvas.height = 360;
    
    const aspectRatio = 16 / 9;
    let srcWidth = img.width;
    let srcHeight = img.height;
    let srcX = 0;
    let srcY = 0;
    
    if (img.width / img.height > aspectRatio) {
      srcWidth = img.height * aspectRatio;
      srcX = (img.width - srcWidth) / 2;
    } 
    else {
      srcHeight = img.width / aspectRatio;
      srcY = (img.height - srcHeight) / 2;
    }
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(
      img, 
      srcX, srcY, srcWidth, srcHeight, 
      0, 0, canvas.width, canvas.height
    );
    
    canvas.toBlob((blob) => {
      if (blob) {
        setThumbnailCropped(blob);
        setThumbnailPreview(URL.createObjectURL(blob));
      }
    }, 'image/jpeg', 0.9);
  };

  const uploadThumbnail = async (): Promise<string | null> => {
    if (!thumbnailFile || !videoId) return null;
    
    setUploadingThumbnail(true);
    try {
      if (video?.thumbnail) {
        const existingThumbnailPath = extractFilenameFromUrl(video.thumbnail);
        if (existingThumbnailPath) {
          const { error: deleteError } = await supabase.storage
            .from('thumbnails')
            .remove([existingThumbnailPath]);
            
          if (deleteError) {
            console.error('Error deleting previous thumbnail:', deleteError);
          } else {
            console.log('Previous thumbnail successfully deleted');
          }
        }
      }
      
      const fileName = `${videoId}_${Date.now()}.${thumbnailFile.name.split('.').pop()}`;
      
      const thumbnailToUpload = thumbnailCropped || thumbnailFile;
      
      const { error: uploadError, data } = await supabase.storage
        .from('thumbnails')
        .upload(fileName, thumbnailToUpload, {
          cacheControl: '3600',
          upsert: true
        });
        
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage
        .from('thumbnails')
        .getPublicUrl(fileName);
        
      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading thumbnail:', error);
      toast('Failed to upload thumbnail', {
        description: 'Please try again',
        style: { backgroundColor: 'rgb(250, 179, 174)' }
      });
      return null;
    } finally {
      setUploadingThumbnail(false);
    }
  };

  const isFormValid = (): boolean => {
    return !!title.trim();
  };

  const handleSave = async () => {
    if (!videoId) return;
    
    setSaving(true);
    try {
      let thumbnailUrl = null;
      
      if (thumbnailFile) {
        thumbnailUrl = await uploadThumbnail();
        if (!thumbnailUrl) {
          toast.error('Failed to upload thumbnail');
          setSaving(false);
          return;
        }
      }
      
      const updateData = {
        title,
        description,
        category,
        visibility,
        updated_at: new Date().toISOString(),
        ...(thumbnailUrl && { thumbnail_url: thumbnailUrl })
      };
      
      console.log('Updating video with data:', updateData);
      
      let query;
      if (isAdmin) {
        query = supabase
          .from('videos')
          .update(updateData)
          .eq('id', videoId);
      } else {
        query = supabase
          .from('videos')
          .update(updateData)
          .eq('id', videoId);
      }
      
      const { error, data } = await query.select();

      if (error) {
        console.error('Update error:', error);
        throw error;
      }
      
      console.log('Video updated successfully:', data);
      toast.success('Video updated successfully');
      
      if (onVideoUpdated) {
        onVideoUpdated();
      }
      
      onClose();
    } catch (error) {
      console.error('Error updating video:', error);
      toast.error('Failed to update video');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = () => {
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!videoId || !onVideoDeleted) return;
    try {
      await onVideoDeleted(videoId);
    } catch (error) {
      console.error('Error in delete confirmation handler:', error);
    } finally {
      setIsDeleteDialogOpen(false);
    }
  };

  const extractFilenameFromUrl = (url: string): string | null => {
    try {
      if (!url) return null;
      
      const parts = url.split('/');
      const lastPart = parts[parts.length - 1];
      
      return decodeURIComponent(lastPart);
    } catch (error) {
      console.error('Error extracting filename from URL:', error);
      return null;
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Edit Video</DialogTitle>
        </DialogHeader>

        <canvas 
          ref={thumbnailCanvasRef} 
          className="hidden"
        ></canvas>

        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="loader"></div>
          </div>
        ) : video ? (
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-8 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Video title"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Video description"
                    rows={4}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {videoCategories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Visibility</Label>
                  <RadioGroup value={visibility} onValueChange={(value) => setVisibility(value as 'public' | 'private')}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="public" id="public" />
                      <Label htmlFor="public" className="font-normal">Public</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="private" id="private" />
                      <Label htmlFor="private" className="font-normal">Private</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
              
              <div className="col-span-4">
                <Label className="block mb-2">Thumbnail</Label>
                <div 
                  ref={thumbnailDropAreaRef}
                  className={`relative cursor-pointer group rounded-md overflow-hidden ${
                    isDraggingOver ? 'ring-2 ring-blue-400 bg-blue-50' : ''
                  }`}
                  onClick={handleThumbnailClick}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="aspect-video bg-black rounded-md overflow-hidden">
                    {thumbnailPreview ? (
                      <img 
                        src={thumbnailPreview} 
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-gray-200">
                        <div className="text-gray-500 text-center">
                          <Upload className="h-6 w-6 mx-auto mb-1" />
                          <span className="text-xs">Upload thumbnail</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
                    <div className="text-white text-center">
                      <CropIcon className="h-5 w-5 mx-auto mb-1" />
                      <p className="text-xs">Images will be cropped to 16:9</p>
                      <p className="text-xs mt-1">Drop image here or click to upload</p>
                    </div>
                  </div>
                  
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleThumbnailChange}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Click or drag and drop to upload a new thumbnail
                </p>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <div className="flex w-full justify-between items-center">
                <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600"
                      onClick={handleDeleteClick}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Video
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete this video and all associated data including comments,
                        likes, and watch history. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        className="bg-red-500 hover:bg-red-600"
                        onClick={handleDeleteConfirm}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                
                <div className="flex gap-2">
                  <Button variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSave} 
                    disabled={saving || uploadingThumbnail || !isFormValid()}
                  >
                    {saving || uploadingThumbnail ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </DialogFooter>
          </div>
        ) : (
          <div className="p-8 text-center">
            <p>Video not found</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EditVideoModal;
