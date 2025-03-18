
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/integrations/supabase/client';
import PageLayout from '@/components/PageLayout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from '@/components/ui/use-toast';
import { UploadCloud } from 'lucide-react';

const formSchema = z.object({
  username: z.string().min(3, {
    message: "Username must be at least 3 characters.",
  }).max(50),
  bio: z.string().max(500, {
    message: "Bio cannot exceed 500 characters.",
  }).optional(),
});

const EditProfile = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      bio: "",
    },
  });

  // Fetch current user session and profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (!sessionData?.session?.user) {
        navigate('/login');
        return;
      }
      
      setCurrentUser(sessionData.session.user);
      
      // Fetch profile data
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sessionData.session.user.id)
        .single();
      
      if (error) {
        console.error('Error fetching profile:', error);
        toast({
          title: "Error",
          description: "Failed to load your profile. Please try again.",
          variant: "destructive",
        });
        return;
      }
      
      if (profileData) {
        form.reset({
          username: profileData.username || "",
          bio: profileData.bio || "",
        });
        
        if (profileData.avatar_url) {
          setAvatarPreview(profileData.avatar_url);
        }
      }
    };
    
    fetchUserProfile();
  }, [navigate, form]);

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!currentUser) return;
    
    setLoading(true);
    
    try {
      let avatarUrl = null;
      
      // Upload new avatar if provided
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${currentUser.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile);
        
        if (uploadError) {
          throw uploadError;
        }
        
        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);
        
        avatarUrl = urlData.publicUrl;
      }
      
      // Update profile
      const updates = {
        username: values.username,
        bio: values.bio,
        ...(avatarUrl && { avatar_url: avatarUrl }),
        updated_at: new Date().toISOString(),
      };
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', currentUser.id);
      
      if (updateError) throw updateError;
      
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
      
      navigate(`/creator/${values.username}`);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "There was an error updating your profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Edit Profile</CardTitle>
            <CardDescription>Update your profile information</CardDescription>
          </CardHeader>
          
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Avatar Upload */}
                <div className="flex flex-col items-center space-y-4">
                  <Avatar className="w-32 h-32">
                    <AvatarImage src={avatarPreview || ''} alt="Avatar preview" />
                    <AvatarFallback className="bg-metanna-blue text-white text-4xl">
                      {form.getValues().username?.charAt(0).toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex items-center space-x-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => document.getElementById('avatar-upload')?.click()}
                      className="flex items-center space-x-2"
                    >
                      <UploadCloud className="h-4 w-4" />
                      <span>Upload Image</span>
                    </Button>
                    
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                  </div>
                </div>
                
                {/* Email (Read-only) */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input 
                    type="email" 
                    value={currentUser?.email || ''} 
                    readOnly 
                    disabled 
                    className="bg-gray-50"
                  />
                  <p className="text-xs text-gray-500">Email cannot be changed</p>
                </div>
                
                {/* Username */}
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="username" {...field} />
                      </FormControl>
                      <FormDescription>
                        This is your public display name.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Bio */}
                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bio</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Tell us about yourself..."
                          className="resize-none min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Write a short bio to introduce yourself to other users.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end space-x-3">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => navigate(-1)}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Saving..." : "Save Changes"}
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
