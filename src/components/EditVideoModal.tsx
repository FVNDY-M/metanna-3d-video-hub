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
import { Image, Upload, CropIcon } from 'lucide-react';

interface EditVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoId: string | null;
  onVideoUpdated?: () => void;
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
  onVideoUpdated
}) => {
  const [video, setVideo] = useState<VideoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private'>('private');
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [thumbnailCropped, setThumbnailCropped] = useState<Blob | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailCanvasRef = useRef<HTMLCanvasElement>(null);

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
      toast.error('Failed to upload thumbnail');
      return null;
    } finally {
      setUploadingThumbnail(false);
    }
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
      
      const { error } = await supabase
        .from('videos')
        .update({
          title,
          description,
          category,
          visibility,
          ...(thumbnailUrl && { thumbnail_url: thumbnailUrl })
        })
        .eq('id', videoId);

      if (error) throw error;
      
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
                  className="relative cursor-pointer group"
                  onClick={handleThumbnailClick}
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
                  Click to upload a new thumbnail
                </p>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={saving || uploadingThumbnail || !title.trim()}
              >
                {saving || uploadingThumbnail ? 'Saving...' : 'Save Changes'}
              </Button>
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
