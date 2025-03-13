
import React, { useState } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import UploadModal from './UploadModal';

interface PageLayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
  user?: {
    username: string;
    avatar?: string;
  } | null;
}

const PageLayout: React.FC<PageLayoutProps> = ({ 
  children, 
  showSidebar = true,
  user = null
}) => {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const openUploadModal = () => {
    setIsUploadModalOpen(true);
  };

  const closeUploadModal = () => {
    setIsUploadModalOpen(false);
  };

  // Make the openUploadModal function available globally
  React.useEffect(() => {
    // @ts-ignore - Adding a custom property to window
    window.openUploadModal = openUploadModal;
    
    return () => {
      // @ts-ignore - Cleanup
      delete window.openUploadModal;
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} onUploadClick={openUploadModal} />
      
      <div className="flex flex-1">
        {showSidebar && <Sidebar />}
        
        <main className={`flex-1 ${showSidebar ? 'md:ml-56' : ''} animate-fade-in`}>
          {children}
        </main>
      </div>

      <UploadModal 
        isOpen={isUploadModalOpen} 
        onClose={closeUploadModal}
        user={user}
      />
    </div>
  );
};

export default PageLayout;
