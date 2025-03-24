
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Film, ClipboardList, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children, title }) => {
  const location = useLocation();

  const navItems = [
    { title: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
    { title: 'Video Management', icon: Film, path: '/admin/videos' },
    { title: 'User Management', icon: Users, path: '/admin/users' },
    { title: 'Moderation Logs', icon: ClipboardList, path: '/admin/logs' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Admin Header */}
      <header className="bg-metanna-blue text-white py-4 px-6 shadow">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">Admin Panel</h1>
          <Link to="/" className="text-sm hover:underline">
            Return to Main Site
          </Link>
        </div>
      </header>

      <div className="container mx-auto flex flex-1 py-6 px-4 md:px-6">
        {/* Sidebar */}
        <aside className="w-64 bg-white shadow rounded-lg mr-6 hidden md:block">
          <nav className="py-4">
            <ul className="space-y-1">
              {navItems.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={cn(
                      "flex items-center px-4 py-3 text-sm rounded-md transition-colors",
                      location.pathname === item.path
                        ? "bg-metanna-blue/10 text-metanna-blue font-medium"
                        : "text-gray-700 hover:bg-gray-100"
                    )}
                  >
                    <item.icon className="h-5 w-5 mr-3" />
                    <span>{item.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 bg-white rounded-lg shadow p-6">
          <div className="flex items-center space-x-2 mb-6">
            <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
          </div>
          
          {/* Mobile Navigation */}
          <div className="block md:hidden mb-6">
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex overflow-x-auto pb-2 space-x-4">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center px-3 py-2 text-sm rounded-md whitespace-nowrap transition-colors",
                      location.pathname === item.path
                        ? "bg-metanna-blue/10 text-metanna-blue font-medium"
                        : "text-gray-700 hover:bg-gray-100"
                    )}
                  >
                    <item.icon className="h-4 w-4 mr-1" />
                    <span>{item.title}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Breadcrumbs */}
          <div className="mb-6 text-sm text-gray-500 flex items-center">
            <Link to="/admin" className="hover:text-metanna-blue">Admin</Link>
            {location.pathname !== '/admin' && (
              <>
                <ChevronRight className="h-4 w-4 mx-1" />
                <span>{title}</span>
              </>
            )}
          </div>

          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
