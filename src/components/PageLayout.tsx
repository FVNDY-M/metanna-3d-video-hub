
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import UploadModal from './UploadModal';
import VideoModal from './VideoModal';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PageLayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
  user?: {
    username: string;
    avatar?: string;
  } | null;
}

// Make TypeScript recognize the window properties
declare global {
  interface Window {
    openUploadModal?: () => void;
    openVideoModal?: (videoId: string) => void;
  }
}

const PageLayout: React.FC<PageLayoutProps> = ({ 
  children, 
  showSidebar = true,
  user = null
}) => {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{
    username: string;
    avatar?: string;
  } | null>(user);
  const navigate = useNavigate();

  useEffect(() => {
    // Set initial user state from props
    if (user) {
      setCurrentUser(user);
    }
  }, [user]);

  // Check authentication status
  useEffect(() => {
    // Check for current session on component mount
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        // Fetch user profile if logged in
        const { data: profileData } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', data.session.user.id)
          .single();
          
        if (profileData) {
          setCurrentUser({
            username: profileData.username,
            avatar: profileData.avatar_url || undefined
          });
        }
      } else {
        setCurrentUser(null);
      }
    };
    
    checkSession();
    
    // Subscribe to auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          // Fetch user profile when signed in
          const { data: profileData } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', session.user.id)
            .single();
            
          if (profileData) {
            setCurrentUser({
              username: profileData.username,
              avatar: profileData.avatar_url || undefined
            });
          }
        } else if (event === 'SIGNED_OUT') {
          setCurrentUser(null);
        }
      }
    );
    
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const openUploadModal = async () => {
    // Check if user is authenticated before opening modal
    const { data } = await supabase.auth.getSession();
    
    if (!data.session) {
      toast.error('You must be logged in to upload videos', {
        action: {
          label: 'Login',
          onClick: () => navigate('/login'),
        },
      });
      return;
    }
    
    setIsUploadModalOpen(true);
  };

  const closeUploadModal = () => {
    setIsUploadModalOpen(false);
  };

  const openVideoModal = (videoId: string) => {
    setSelectedVideoId(videoId);
    setIsVideoModalOpen(true);
  };

  const closeVideoModal = () => {
    setIsVideoModalOpen(false);
    setSelectedVideoId(null);
  };

  // Make the modal functions available globally
  React.useEffect(() => {
    window.openUploadModal = openUploadModal;
    window.openVideoModal = openVideoModal;
    return () => {
      delete window.openUploadModal;
      delete window.openVideoModal;
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={currentUser} onUploadClick={openUploadModal} />

      <div className="flex flex-1">
        {showSidebar && (
          <div className="hidden md:block md:w-56 sticky top-0 h-screen">
            <Sidebar />
          </div>
        )}

        <main className="flex-1 w-full max-w-screen-xl mx-auto p-6">
          {children}
        </main>
      </div>

      <UploadModal 
        isOpen={isUploadModalOpen} 
        onClose={closeUploadModal}
        user={currentUser}
      />

      <VideoModal
        isOpen={isVideoModalOpen}
        onClose={closeVideoModal}
        videoId={selectedVideoId}
      />
    </div>
  );
};

export default PageLayout;
