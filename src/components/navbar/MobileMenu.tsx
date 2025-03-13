
import React from 'react';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import NavbarSearch from './NavbarSearch';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    username: string;
    avatar?: string;
  } | null;
  onLogout: () => void;
}

const MobileMenu: React.FC<MobileMenuProps> = ({ 
  isOpen, 
  user, 
  onLogout,
  onClose
}) => {
  return (
    <div className={`md:hidden ${isOpen ? 'block' : 'hidden'}`}>
      <div className="pt-2 pb-4 px-4 space-y-4 bg-white border-b border-gray-100">
        <NavbarSearch />

        {user ? (
          <div className="space-y-2">
            <div className="flex items-center space-x-3 p-2 rounded-lg">
              <Avatar className="h-10 w-10 bg-metanna-blue text-white">
                <AvatarImage src={user.avatar} alt={user.username} />
                <AvatarFallback className="bg-metanna-blue text-white">
                  {user.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{user.username}</p>
              </div>
            </div>
            
            <Link
              to="/upload"
              className="block p-2 rounded-lg text-base font-medium text-metanna-black hover:bg-gray-50"
              onClick={onClose}
            >
              Upload
            </Link>
            <Link
              to="/notifications"
              className="block p-2 rounded-lg text-base font-medium text-metanna-black hover:bg-gray-50"
              onClick={onClose}
            >
              Notifications
            </Link>
            <Link
              to="/profile"
              className="block p-2 rounded-lg text-base font-medium text-metanna-black hover:bg-gray-50"
              onClick={onClose}
            >
              Profile
            </Link>
            <Link
              to="/settings"
              className="block p-2 rounded-lg text-base font-medium text-metanna-black hover:bg-gray-50"
              onClick={onClose}
            >
              Settings
            </Link>
            <button
              className="block w-full text-left p-2 rounded-lg text-base font-medium text-destructive hover:bg-gray-50"
              onClick={() => {
                onLogout();
                onClose();
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
              onClick={onClose}
            >
              Log In
            </Link>
            <Link
              to="/signup"
              className="block w-full p-2 rounded-lg text-base font-medium text-white bg-metanna-blue hover:bg-metanna-blue/90 text-center"
              onClick={onClose}
            >
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileMenu;
