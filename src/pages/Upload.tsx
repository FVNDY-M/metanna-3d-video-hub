
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Define the window interface extension
declare global {
  interface Window {
    openUploadModal?: () => void;
  }
}

const Upload = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Open the upload modal and navigate to home
    if (window.openUploadModal) {
      window.openUploadModal();
    }
    navigate('/');
  }, [navigate]);

  // This component will only briefly be shown during redirect
  return (
    <div className="flex items-center justify-center h-screen">
      <p>Redirecting to upload form...</p>
    </div>
  );
};

export default Upload;
