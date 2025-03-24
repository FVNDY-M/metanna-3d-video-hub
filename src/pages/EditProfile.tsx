
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PageLayout from '@/components/PageLayout';
import { toast } from '@/components/ui/use-toast';

const EditProfile = () => {
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          navigate('/login');
          return;
        }

        const { data: profile, error } = await supabase
          .from('profiles')
          .select(`username, avatar_url`)
          .eq('id', session.user.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
          toast("Failed to load profile data");
        } else if (profile) {
          setUsername(profile.username || '');
          setAvatarUrl(profile.avatar_url || null);
        }
      } catch (error) {
        console.error('Unexpected error:', error);
        toast("An unexpected error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate]);

  const handleUpdateProfile = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        navigate('/login');
        return;
      }

      const updates = {
        id: session.user.id,
        username: username,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(), // Convert Date to ISO string
      };

      const { error } = await supabase.from('profiles').upsert(updates, {
        returning: 'minimal', // Don't return values after inserting
      });

      if (error) {
        console.error('Error updating profile:', error);
        toast("Failed to update profile");
      } else {
        toast("Your profile has been updated successfully");
        navigate(`/profile/${username}`);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      toast("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (file) {
      setLoading(true);
      const uploadAvatar = async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();

          if (!session) {
            navigate('/login');
            return;
          }

          const fileExt = file.name.split('.').pop();
          const fileName = `${session.user.id}.${fileExt}`;
          const filePath = `${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            console.error('Error uploading avatar:', uploadError);
            toast("Failed to upload avatar");
          } else {
            const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${filePath}`;
            setAvatarUrl(publicUrl);
            toast("Your avatar has been updated successfully");
          }
        } catch (error) {
          console.error('Unexpected error:', error);
          toast("An unexpected error occurred during avatar upload");
        } finally {
          setLoading(false);
        }
      };

      uploadAvatar();
    }
  };

  return (
    <PageLayout>
      <div className="container mx-auto mt-8 p-4">
        <h1 className="text-2xl font-semibold mb-6">Edit Profile</h1>
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <p>Loading...</p>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row gap-4">
            <div className="md:w-1/3">
              <Avatar className="w-32 h-32 mx-auto">
                {avatarUrl ? (
                  <AvatarImage src={avatarUrl} alt="Avatar" />
                ) : (
                  <AvatarFallback>{username ? username[0].toUpperCase() : '?'}</AvatarFallback>
                )}
              </Avatar>
              <div className="mt-2 text-center">
                <Label htmlFor="avatar-input" className="cursor-pointer hover:text-blue-500">
                  Change Avatar
                </Label>
                <Input
                  type="file"
                  id="avatar-input"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
            </div>
            <div className="md:w-2/3">
              <div className="mb-4">
                <Label htmlFor="username">Username</Label>
                <Input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <Button onClick={handleUpdateProfile} disabled={loading}>
                Update Profile
              </Button>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default EditProfile;
