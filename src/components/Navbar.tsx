
import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import MetannaLogo from './MetannaLogo';
import { supabase } from '@/integrations/supabase/client';
import NavbarSearch from './navbar/NavbarSearch';
import UserMenu from './navbar/UserMenu';
import AuthButtons from './navbar/AuthButtons';
import MobileMenu from './navbar/MobileMenu';

interface NavbarProps {
  user?: {
    username: string;
    avatar?: string;
  } | null;
}

const Navbar: React.FC<NavbarProps> = ({ user = null }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(user);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for authenticated user on component mount
    const getUser = async () => {
      setIsLoading(true);
      try {
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
        } else {
          setCurrentUser(null);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        setCurrentUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    if (!user) {
      getUser();
    } else {
      setIsLoading(false);
    }

    // Subscribe to auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        
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
  }, [user]);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
  };

  const activeUser = currentUser || user;

  return (
    <nav className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <MetannaLogo />
            </div>
          </div>

          {/* Desktop Search */}
          <div className="hidden md:block flex-1 max-w-xl mx-8">
            <NavbarSearch />
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            {isLoading ? (
              <div className="w-32 h-8 bg-gray-200 animate-pulse rounded-full"></div>
            ) : activeUser ? (
              <UserMenu user={activeUser} />
            ) : (
              <AuthButtons />
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={toggleMobileMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-metanna-blue focus:outline-none"
            >
              <span className="sr-only">Open main menu</span>
              {mobileMenuOpen ? (
                <X className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <MobileMenu 
        isOpen={mobileMenuOpen} 
        user={activeUser} 
        onLogout={handleLogout}
        onClose={() => setMobileMenuOpen(false)}
      />
    </nav>
  );
};

export default Navbar;
