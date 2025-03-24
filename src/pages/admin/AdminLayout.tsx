
import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Video, 
  Settings, 
  FileText, 
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';

const AdminLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Logged out",
        description: "You have been successfully logged out"
      });
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
      toast({
        title: "Error",
        description: "There was a problem logging out",
        variant: "destructive"
      });
    }
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-metanna-blue text-white shadow-md">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-3">
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white hover:bg-metanna-blue/80 md:hidden"
              onClick={toggleSidebar}
            >
              {isSidebarOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
            <h1 className="text-xl font-bold">Metanna Admin</h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-metanna-blue/80"
            onClick={() => navigate('/')}
          >
            Return to Site
          </Button>
        </div>
      </header>

      <div className="flex h-[calc(100vh-56px)]">
        {/* Sidebar */}
        <aside className={`${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 fixed md:relative z-10 w-64 bg-white shadow-md transition-transform duration-300 ease-in-out h-full overflow-y-auto`}>
          <nav className="p-4 space-y-1">
            <NavLink
              to="/admin"
              end
              className={({ isActive }) =>
                `flex items-center p-3 text-gray-700 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-metanna-blue/10 text-metanna-blue'
                    : 'hover:bg-gray-100'
                }`
              }
            >
              <LayoutDashboard className="mr-3 h-5 w-5" />
              Dashboard
            </NavLink>
            <NavLink
              to="/admin/users"
              className={({ isActive }) =>
                `flex items-center p-3 text-gray-700 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-metanna-blue/10 text-metanna-blue'
                    : 'hover:bg-gray-100'
                }`
              }
            >
              <Users className="mr-3 h-5 w-5" />
              User Management
            </NavLink>
            <NavLink
              to="/admin/videos"
              className={({ isActive }) =>
                `flex items-center p-3 text-gray-700 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-metanna-blue/10 text-metanna-blue'
                    : 'hover:bg-gray-100'
                }`
              }
            >
              <Video className="mr-3 h-5 w-5" />
              Content Management
            </NavLink>
            <NavLink
              to="/admin/moderation-logs"
              className={({ isActive }) =>
                `flex items-center p-3 text-gray-700 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-metanna-blue/10 text-metanna-blue'
                    : 'hover:bg-gray-100'
                }`
              }
            >
              <FileText className="mr-3 h-5 w-5" />
              Moderation Logs
            </NavLink>
            <NavLink
              to="/admin/settings"
              className={({ isActive }) =>
                `flex items-center p-3 text-gray-700 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-metanna-blue/10 text-metanna-blue'
                    : 'hover:bg-gray-100'
                }`
              }
            >
              <Settings className="mr-3 h-5 w-5" />
              Platform Settings
            </NavLink>
            <button
              onClick={handleLogout}
              className="flex items-center p-3 text-gray-700 rounded-lg transition-colors hover:bg-gray-100 w-full text-left"
            >
              <LogOut className="mr-3 h-5 w-5" />
              Logout
            </button>
          </nav>
        </aside>

        {/* Main content */}
        <main className={`flex-1 p-6 overflow-y-auto ${
          isSidebarOpen ? 'md:ml-0' : 'ml-0'
        }`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
