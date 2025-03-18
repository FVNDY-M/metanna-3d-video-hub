
import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, 
  TrendingUp, 
  Compass, 
  Clock, 
  Heart, 
  ListVideo, 
  User 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SidebarLink {
  icon: React.ReactNode;
  label: string;
  href: string;
}

interface SidebarCategory {
  title?: string;
  links: SidebarLink[];
}

interface SidebarProps {
  className?: string;
  isCollapsed: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ className = '', isCollapsed }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [popularCreators, setPopularCreators] = useState<{username: string, id: string}[]>([]);

  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      setIsAuthenticated(!!data.session);
    };

    // Get popular creators
    const fetchPopularCreators = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, subscriber_count')
        .order('subscriber_count', { ascending: false })
        .limit(5);

      if (!error && data) {
        setPopularCreators(data);
      }
    };

    checkAuth();
    fetchPopularCreators();

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      setIsAuthenticated(event === 'SIGNED_IN');
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Define categories based on authentication status
  const publicCategories: SidebarCategory[] = [
    {
      links: [
        { icon: <Home className="h-5 w-5" />, label: 'Home', href: '/' },
        { icon: <TrendingUp className="h-5 w-5" />, label: 'Trending', href: '/trending' },
        { icon: <Compass className="h-5 w-5" />, label: 'Explore', href: '/explore' },
      ],
    },
    {
      title: 'Popular Creators',
      links: popularCreators.map(creator => ({
        icon: <User className="h-5 w-5" />, 
        label: creator.username, 
        href: `/creator/${creator.id}`
      })),
    },
  ];

  const authenticatedCategories: SidebarCategory[] = [
    ...publicCategories,
    {
      title: 'Your Library',
      links: [
        { icon: <Clock className="h-5 w-5" />, label: 'Watch Later', href: '/watch-later' },
        { icon: <Heart className="h-5 w-5" />, label: 'Liked Videos', href: '/liked' },
        { icon: <ListVideo className="h-5 w-5" />, label: 'Your Videos', href: '/your-videos' },
      ],
    },
  ];

  const categories = isAuthenticated ? authenticatedCategories : publicCategories;

  return (
    <aside 
      className={`hidden md:block ${isCollapsed ? 'w-16' : 'w-56'} min-w-${isCollapsed ? '16' : '56'} h-[calc(100vh-4rem)] sticky top-16 bg-white overflow-y-auto border-r border-gray-100 transition-all duration-300 ${className}`}
    >
      <div className="p-4">
        {categories.map((category, index) => (
          <div key={index} className="mb-8 last:mb-0">
            {category.title && !isCollapsed && (
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3 px-2">
                {category.title}
              </h3>
            )}
            <nav className="space-y-1">
              {category.links.map((link) => (
                <NavLink
                  key={link.href}
                  to={link.href}
                  className={({ isActive }) =>
                    `flex ${isCollapsed ? 'justify-center' : 'items-center'} px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      isActive
                        ? 'text-metanna-blue bg-metanna-blue/10'
                        : 'text-gray-700 hover:text-metanna-blue hover:bg-gray-50'
                    }`
                  }
                  title={isCollapsed ? link.label : undefined}
                >
                  <span className={isCollapsed ? '' : 'mr-3'}>{link.icon}</span>
                  {!isCollapsed && <span>{link.label}</span>}
                </NavLink>
              ))}
            </nav>
          </div>
        ))}
      </div>
    </aside>
  );
};

export default Sidebar;
