
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Upload = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Open the upload modal and navigate to home
    // @ts-ignore - Using the globally available function
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
