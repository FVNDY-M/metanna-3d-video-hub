
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Loader2, Save, Upload, X, User, Mail, AtSign, Trash } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { supabase, deleteUserAvatar } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { toast as sonnerToast } from 'sonner';

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
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isDeleteAvatarDialogOpen, setIsDeleteAvatarDialogOpen] = useState(false);
  
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
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          navigate('/login');
          return;
        }
        
        setCurrentUser(session.user);
        
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        if (error) throw error;
        
        const { data: { user } } = await supabase.auth.getUser();
        
        if (profile.avatar_url) {
          setAvatarUrl(profile.avatar_url);
          setAvatarPreview(profile.avatar_url);
        }
        
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
  
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file (jpeg, png, etc.)",
        variant: "destructive",
      });
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Avatar image must be less than 5MB",
        variant: "destructive",
      });
      return;
    }
    
    setAvatarFile(file);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setAvatarPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };
  
  const removeAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(avatarUrl);
  };
  
  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile || !currentUser) return avatarUrl;
    
    setIsUploadingAvatar(true);
    
    try {
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `${currentUser.id}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile);
        
      if (uploadError) throw uploadError;
      
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
        
      setAvatarUrl(data.publicUrl);
      return data.publicUrl;
      
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Upload failed",
        description: "There was an error uploading your avatar. Please try again.",
        variant: "destructive",
      });
      return avatarUrl;
    } finally {
      setIsUploadingAvatar(false);
    }
  };
  
  const handleDeleteAvatar = async () => {
    if (!avatarUrl || !currentUser) {
      setIsDeleteAvatarDialogOpen(false);
      return;
    }
    
    setIsLoading(true);
    
    try {
      const { success, error } = await deleteUserAvatar(currentUser.id, avatarUrl);
      
      if (!success) {
        throw error || new Error("Failed to delete avatar");
      }
      
      setAvatarFile(null);
      setAvatarPreview(null);
      setAvatarUrl(null);
      
      // Using sonnerToast instead of toast.success
      sonnerToast("Avatar successfully deleted", {
        description: "Your profile picture has been removed"
      });
    } catch (error) {
      console.error("Error deleting avatar:", error);
      // Using sonnerToast instead of toast.error
      sonnerToast("Failed to delete avatar", {
        description: "Please try again",
        style: { backgroundColor: 'rgb(250, 179, 174)' }
      });
    } finally {
      setIsLoading(false);
      setIsDeleteAvatarDialogOpen(false);
    }
  };
  
  const onSubmit = async (values: ProfileFormValues) => {
    if (!currentUser) return;
    
    setIsLoading(true);
    
    try {
      const finalAvatarUrl = await uploadAvatar();
      
      const { error } = await supabase
        .from('profiles')
        .update({
          username: values.username,
          bio: values.bio,
          avatar_url: finalAvatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentUser.id);
        
      if (error) throw error;
      
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
      
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
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-metanna-black">Edit Profile</h1>
          <p className="text-metanna-gray">Customize your profile information</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <Card className="bg-white shadow-md border-0">
              <CardContent className="p-6">
                <div className="flex flex-col items-center">
                  <div className="relative mb-4 mt-2">
                    <Avatar className="h-24 w-24 border-4 border-white shadow-lg">
                      <AvatarImage src={avatarPreview || ''} alt="Avatar preview" />
                      <AvatarFallback className="bg-metanna-light-blue text-white text-lg">
                        {form.watch('username')?.charAt(0).toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    {avatarPreview && avatarFile && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                        onClick={removeAvatar}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="w-full mb-4">
                    <div className="flex gap-2">
                      <label className="cursor-pointer inline-flex items-center justify-center flex-1">
                        <div className="bg-metanna-light-gray hover:bg-metanna-light-blue/10 transition-colors py-2 px-4 rounded-md text-sm font-medium flex items-center justify-center space-x-2 w-full">
                          <Upload className="h-4 w-4 text-metanna-blue" />
                          <span>Change</span>
                        </div>
                        <Input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleAvatarChange}
                          disabled={isUploadingAvatar}
                        />
                      </label>
                      
                      {avatarUrl && (
                        <AlertDialog open={isDeleteAvatarDialogOpen} onOpenChange={setIsDeleteAvatarDialogOpen}>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              className="border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600"
                              disabled={isLoading || isUploadingAvatar}
                            >
                              <Trash className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Avatar</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete your profile picture. Are you sure you want to continue?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={handleDeleteAvatar}
                                className="bg-red-500 hover:bg-red-600 text-white"
                              >
                                {isLoading ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : "Delete"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                    <p className="text-xs text-center text-metanna-gray mt-1">
                      Square image, max 5MB
                    </p>
                  </div>
                  
                  <div className="space-y-3 w-full">
                    <div className="flex items-center space-x-3 text-metanna-dark-gray">
                      <User className="h-4 w-4 text-metanna-blue" />
                      <span className="text-sm">{form.watch('username') || 'Username'}</span>
                    </div>
                    <div className="flex items-center space-x-3 text-metanna-dark-gray">
                      <Mail className="h-4 w-4 text-metanna-blue" />
                      <span className="text-sm">{form.watch('email') || 'Email'}</span>
                    </div>
                    <div className="flex items-center space-x-3 text-metanna-dark-gray">
                      <AtSign className="h-4 w-4 text-metanna-blue" />
                      <span className="text-sm text-metanna-blue">{`@${form.watch('username')}` || '@username'}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="md:col-span-2">
            <Card className="bg-white shadow-md border-0">
              <CardHeader className="border-b pb-3">
                <CardTitle className="text-xl font-semibold text-metanna-black">Profile Information</CardTitle>
                <CardDescription>Update your personal details</CardDescription>
              </CardHeader>
              
              <CardContent className="p-6">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <FormField
                        control={form.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-metanna-dark-gray">Username</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Username" 
                                {...field} 
                                className="border-metanna-light-gray focus-visible:ring-metanna-blue" 
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
                            <FormLabel className="text-metanna-dark-gray">Email</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                readOnly 
                                disabled 
                                className="bg-metanna-light-gray border-metanna-light-gray cursor-not-allowed" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="bio"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-metanna-dark-gray">Bio</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Tell us about yourself" 
                              className="min-h-32 border-metanna-light-gray focus-visible:ring-metanna-blue"
                              {...field} 
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="pt-3 flex justify-end">
                      <Button 
                        type="submit" 
                        disabled={isLoading || isUploadingAvatar}
                        className="bg-metanna-blue hover:bg-metanna-blue/90 text-white px-6"
                      >
                        {(isLoading || isUploadingAvatar) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default EditProfile;
