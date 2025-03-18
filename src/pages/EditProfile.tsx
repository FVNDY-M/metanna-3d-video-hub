
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '@/components/PageLayout';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, Save, UploadCloud } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';

const profileSchema = z.object({
  username: z.string().min(3, {
    message: "Username must be at least 3 characters",
  }),
  bio: z.string().optional(),
  email: z.string().email().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const EditProfile = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // Setup form with default values
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: '',
      bio: '',
      email: '',
    },
  });
  
  useEffect(() => {
    const fetchUserProfile = async () => {
      setIsLoading(true);
      
      try {
        // Get current user
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          navigate('/login');
          return;
        }
        
        setCurrentUser(session.user);
        
        // Fetch user profile
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        if (error) throw error;
        
        // Get user email
        const { data: { user } } = await supabase.auth.getUser();
        
        // Set avatar URL
        setAvatarUrl(profile.avatar_url);
        
        // Set form values
        form.reset({
          username: profile.username || '',
          bio: profile.bio || '',
          email: user?.email || '',
        });
        
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast({
          title: "Error",
          description: "Failed to load your profile. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserProfile();
  }, [navigate, toast, form]);
  
  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }
    
    const file = event.target.files[0];
    setAvatarFile(file);
    
    // Create a preview URL
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    
    // Clean up preview URL when component unmounts
    return () => URL.revokeObjectURL(objectUrl);
  };
  
  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile || !currentUser) return avatarUrl;
    
    setUploading(true);
    
    try {
      // Create a unique file name
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `${currentUser.id}/${fileName}`;
      
      // Upload the file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile);
        
      if (uploadError) throw uploadError;
      
      // Get the public URL
      const { data: publicUrl } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
        
      return publicUrl.publicUrl;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Upload failed",
        description: "We couldn't upload your avatar. Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setUploading(false);
    }
  };
  
  const onSubmit = async (values: ProfileFormValues) => {
    if (!currentUser) return;
    
    setIsLoading(true);
    
    try {
      // Upload avatar if a new one was selected
      let newAvatarUrl = avatarUrl;
      if (avatarFile) {
        newAvatarUrl = await uploadAvatar();
      }
      
      // Update profile in database
      const { error } = await supabase
        .from('profiles')
        .update({
          username: values.username,
          bio: values.bio,
          avatar_url: newAvatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentUser.id);
        
      if (error) throw error;
      
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
      
      // Redirect to profile page
      navigate(`/profile/${values.username}`);
      
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Update failed",
        description: "There was an error updating your profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  if (isLoading && !form.formState.isDirty) {
    return (
      <PageLayout>
        <div className="flex justify-center items-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-metanna-blue" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Edit Profile</CardTitle>
            <CardDescription>Update your profile information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center mb-6">
              <div className="relative group">
                <Avatar className="h-24 w-24 cursor-pointer border-2 border-white shadow-lg">
                  <AvatarImage 
                    src={previewUrl || avatarUrl || ''} 
                    alt="Profile" 
                  />
                  <AvatarFallback className="text-xl">
                    {form.getValues().username ? form.getValues().username.charAt(0).toUpperCase() : '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <label htmlFor="avatar-upload" className="cursor-pointer text-white p-2">
                    <UploadCloud className="h-8 w-8" />
                  </label>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </div>
              </div>
            </div>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="Username" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bio</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Tell us about yourself" 
                          className="min-h-32"
                          {...field} 
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} readOnly disabled className="bg-gray-100" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={isLoading || uploading}
                    className="bg-metanna-blue text-white"
                  >
                    {(isLoading || uploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
};

export default EditProfile;
