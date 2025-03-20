
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Menu, X, Upload, LogIn, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import MetannaLogo from './MetannaLogo';
import { Input } from './ui/input';
import { supabase } from '@/integrations/supabase/client';

interface NavbarProps {
  user?: {
    username: string;
    avatar?: string;
  } | null;
  onUploadClick?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ user = null, onUploadClick }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState(user);
  const navigate = useNavigate();

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
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

    if (!user) {
      getUser();
    }

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    navigate('/login');
  };

  const activeUser = currentUser || user;

  return (
    <nav className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              {/* <MetannaLogo /> */}
                <Link to="/">
                  <img
                    src="/metanna_azul.png"
                    alt="Metanna Logo"
                    className="h-10 w-auto"
                  />
                </Link>
            </div>
          </div>

          <div className="hidden md:block flex-1 max-w-xl mx-8">
            <form onSubmit={handleSearch} className="relative">
              <Input
                type="search"
                placeholder="Search"
                className="w-full pl-10 pr-4 py-2 rounded-full border-gray-200 focus:border-metanna-blue focus:ring-metanna-blue"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
            </form>
          </div>

          <div className="hidden md:block">
            <div className="flex items-center space-x-4">
              {activeUser ? (
                <>
                  <Button
                    variant="ghost"
                    className="text-metanna-black hover:text-metanna-blue"
                    onClick={onUploadClick}
                  >
                    <Upload className="h-5 w-5" />
                  </Button>

                  <Button
                    asChild
                    variant="ghost"
                    className="text-metanna-black hover:text-metanna-blue"
                  >
                    <Link to="/notifications">
                      <Bell className="h-5 w-5" />
                    </Link>
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="relative rounded-full h-9 w-9 p-0 bg-metanna-blue text-white">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={activeUser.avatar} alt={activeUser.username} />
                          <AvatarFallback className="bg-metanna-blue text-white">
                            {activeUser.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 mt-2 animate-scale-in">
                      <div className="flex items-center justify-start p-2">
                        <div className="flex flex-col space-y-1 leading-none">
                          <p className="font-medium">{activeUser.username}</p>
                        </div>
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to={`/profile/${activeUser.username}`} className="cursor-pointer w-full">
                          Profile
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/edit-profile" className="cursor-pointer w-full">
                          Edit Profile
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="cursor-pointer text-destructive focus:text-destructive"
                        onClick={handleLogout}
                      >
                        Log out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <>
                  <Button asChild variant="ghost" className="gap-1 text-metanna-black hover:text-metanna-blue">
                    <Link to="/login">
                      <LogIn className="h-4 w-4 mr-1" />
                      Log In
                    </Link>
                  </Button>
                  <Button asChild className="bg-metanna-blue hover:bg-metanna-blue/90 text-white rounded-full">
                    <Link to="/signup">Sign Up</Link>
                  </Button>
                </>
              )}
            </div>
          </div>

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

      {/* Mobile Menu */}
      <div className={`md:hidden ${mobileMenuOpen ? 'block' : 'hidden'}`}>
        <div className="pt-2 pb-4 px-4 space-y-4 bg-white border-b border-gray-100">
          <form onSubmit={handleSearch} className="relative">
            <Input
              type="search"
              placeholder="Search"
              className="w-full pl-10 pr-4 py-2 rounded-full border-gray-200"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
          </form>

          {activeUser ? (
            <div className="space-y-2">
              <div className="flex items-center space-x-3 p-2 rounded-lg">
                <Avatar className="h-10 w-10 bg-metanna-blue text-white">
                  <AvatarImage src={activeUser.avatar} alt={activeUser.username} />
                  <AvatarFallback className="bg-metanna-blue text-white">
                    {activeUser.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{activeUser.username}</p>
                </div>
              </div>

              <button
                className="block p-2 rounded-lg text-base font-medium text-metanna-black hover:bg-gray-50"
                onClick={() => {
                  if (onUploadClick) {
                    onUploadClick();
                  }
                  setMobileMenuOpen(false);
                }}
              >
                Upload
              </button>

              <Link
                to="/notifications"
                className="block p-2 rounded-lg text-base font-medium text-metanna-black hover:bg-gray-50"
                onClick={() => setMobileMenuOpen(false)}
              >
                Notifications
              </Link>
              <Link
                to={`/profile/${activeUser.username}`}
                className="block p-2 rounded-lg text-base font-medium text-metanna-black hover:bg-gray-50"
                onClick={() => setMobileMenuOpen(false)}
              >
                Profile
              </Link>
              <Link
                to="/edit-profile"
                className="block p-2 rounded-lg text-base font-medium text-metanna-black hover:bg-gray-50"
                onClick={() => setMobileMenuOpen(false)}
              >
                Edit Profile
              </Link>
              <button
                className="block w-full text-left p-2 rounded-lg text-base font-medium text-destructive hover:bg-gray-50"
                onClick={() => {
                  handleLogout();
                  setMobileMenuOpen(false);
                }}
              >
                Log out
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <Link
                to="/login"
                className="block p-2 rounded-lg text-base font-medium text-metanna-black hover:bg-gray-50"
                onClick={() => setMobileMenuOpen(false)}
              >
                Log In
              </Link>
              <Link
                to="/signup"
                className="block w-full p-2 rounded-lg text-base font-medium text-white bg-metanna-blue hover:bg-metanna-blue/90 text-center"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
