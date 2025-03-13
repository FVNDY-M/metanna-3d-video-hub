
import React, { useState, useEffect } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { supabase } from '@/integrations/supabase/client';

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
  const [currentUser, setCurrentUser] = useState(user);
  
  useEffect(() => {
    // Check for authenticated user on component mount if no user is provided
    if (!user) {
      const checkSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // Fetch user profile from profiles table
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', session.user.id)
            .single();
            
          if (profile) {
            setCurrentUser({
              username: profile.username,
              avatar: profile.avatar_url
            });
          }
        }
      };
      
      checkSession();
      
      // Subscribe to auth changes
      const { data: authListener } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (event === 'SIGNED_IN' && session) {
            // Fetch user profile when signed in
            const { data: profile } = await supabase
              .from('profiles')
              .select('username, avatar_url')
              .eq('id', session.user.id)
              .single();
              
            if (profile) {
              setCurrentUser({
                username: profile.username,
                avatar: profile.avatar_url
              });
            }
          } else if (event === 'SIGNED_OUT') {
            setCurrentUser(null);
          }
        }
      );
      
      return () => {
        authListener?.subscription.unsubscribe();
      };
    }
  }, [user]);
  
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={currentUser || user} />
      
      <div className="flex flex-1">
        {showSidebar && <Sidebar />}
        
        <main className={`flex-1 ${showSidebar ? 'md:ml-56' : ''} animate-fade-in`}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default PageLayout;
