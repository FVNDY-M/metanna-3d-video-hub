
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import UploadModal from './UploadModal';
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

// Make TypeScript recognize the window.openUploadModal property
declare global {
  interface Window {
    openUploadModal?: () => void;
  }
}

const PageLayout: React.FC<PageLayoutProps> = ({ 
  children, 
  showSidebar = true,
  user = null
}) => {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
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

  const openUploadModal = async () => {
    // Check if user is authenticated before opening modal
    const { data } = await supabase.auth.getSession();
    
    if (!data.session) {
      toast.error('You must be logged in to upload videos');
      navigate('/login');
      return;
    }
    
    setIsUploadModalOpen(true);
  };

  const closeUploadModal = () => {
    setIsUploadModalOpen(false);
  };

  // Make the openUploadModal function available globally
  React.useEffect(() => {
    window.openUploadModal = openUploadModal;
    
    return () => {
      delete window.openUploadModal;
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={currentUser} onUploadClick={openUploadModal} />
      
      <div className="flex flex-1">
        {showSidebar && <Sidebar />}
        
        <main className={`flex-1 ${showSidebar ? 'md:pl-56' : ''} animate-fade-in`}>
          {children}
        </main>
      </div>

      <UploadModal 
        isOpen={isUploadModalOpen} 
        onClose={closeUploadModal}
        user={currentUser}
      />
    </div>
  );
};

export default PageLayout;
