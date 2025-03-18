
import React, { useState, useEffect } from 'react';
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

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private'>('private');

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

  const handleSave = async () => {
    if (!videoId) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('videos')
        .update({
          title,
          description,
          category,
          visibility
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
                <div className="aspect-video bg-black rounded-md overflow-hidden">
                  <img 
                    src={video.thumbnail} 
                    alt={video.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Thumbnail cannot be edited here
                </p>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={saving || !title.trim()}
              >
                {saving ? 'Saving...' : 'Save Changes'}
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
