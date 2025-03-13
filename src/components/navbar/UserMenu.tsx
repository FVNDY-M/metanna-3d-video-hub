
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Upload, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';

interface UserMenuProps {
  user: {
    username: string;
    avatar?: string;
  };
}

const UserMenu: React.FC<UserMenuProps> = ({ user }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="flex items-center space-x-4">
      <Button
        asChild
        variant="ghost"
        className="text-metanna-black hover:text-metanna-blue"
      >
        <Link to="/upload">
          <Upload className="h-5 w-5" />
        </Link>
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
              <AvatarImage src={user.avatar} alt={user.username} />
              <AvatarFallback className="bg-metanna-blue text-white">
                {user.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 mt-2 animate-scale-in">
          <div className="flex items-center justify-start p-2">
            <div className="flex flex-col space-y-1 leading-none">
              <p className="font-medium">{user.username}</p>
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to="/profile" className="cursor-pointer w-full">
              Profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/settings" className="cursor-pointer w-full">
              Settings
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
    </div>
  );
};

export default UserMenu;
