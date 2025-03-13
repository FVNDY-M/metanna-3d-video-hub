
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Define the window interface extension
declare global {
  interface Window {
    openUploadModal?: () => void;
  }
}

const Upload = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      
      if (!data.session) {
        toast.error('You must be logged in to upload videos');
        navigate('/login');
        return;
      }
      
      // Open the upload modal and navigate to home
      if (window.openUploadModal) {
        window.openUploadModal();
      }
      navigate('/');
    };
    
    checkAuth();
  }, [navigate]);

  // This component will only briefly be shown during redirect
  return (
    <div className="flex items-center justify-center h-screen">
      <p>Redirecting to upload form...</p>
    </div>
  );
};

export default Upload;
