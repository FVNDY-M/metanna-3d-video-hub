
import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        // First check if user is authenticated
        const { data: sessionData } = await supabase.auth.getSession();
        
        if (!sessionData.session) {
          setIsAdmin(false);
          setIsLoading(false);
          return;
        }
        
        // Then check if user has admin role
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', sessionData.session.user.id)
          .single();
        
        if (error) {
          console.error('Error fetching admin status:', error);
          setIsAdmin(false);
        } else {
          setIsAdmin(profileData?.role === 'admin');
        }
      } catch (error) {
        console.error('Error in admin check:', error);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminStatus();
  }, []);

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Checking admin permissions...</div>;
  }

  if (!isAdmin) {
    toast.error('You do not have permission to access this page');
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;
