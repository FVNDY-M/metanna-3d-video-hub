
import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, TrendingUp, Compass, Clock, Heart, ListVideo, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface SidebarLink {
  icon: React.ReactNode;
  label: string;
  href: string;
  authRequired?: boolean;
}

interface SidebarCategory {
  title?: string;
  links: SidebarLink[];
  authRequired?: boolean;
}

interface SidebarProps {
  className?: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  className = '', 
  collapsed = false, 
  onToggleCollapse 
}) => {
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [isCollapsed, setIsCollapsed] = useState(collapsed);
  
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
      }
    };
    
    fetchUser();
    
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null);
      }
    );
    
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);
  
  useEffect(() => {
    setIsCollapsed(collapsed);
  }, [collapsed]);
  
  // Fetch popular creators
  const { data: popularCreators } = useQuery({
    queryKey: ['popularCreators'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, subscriber_count')
        .order('subscriber_count', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  const handleToggleCollapse = () => {
    const newCollapsedState = !isCollapsed;
    setIsCollapsed(newCollapsedState);
    if (onToggleCollapse) {
      onToggleCollapse();
    }
  };
  
  const categories: SidebarCategory[] = [
    {
      links: [
        { icon: <Home className="h-5 w-5" />, label: 'Home', href: '/' },
        { icon: <TrendingUp className="h-5 w-5" />, label: 'Trending', href: '/trending' },
        { icon: <Compass className="h-5 w-5" />, label: 'Explore', href: '/explore' },
      ],
    },
    {
      title: 'Your Library',
      authRequired: true,
      links: [
        { icon: <Clock className="h-5 w-5" />, label: 'Watch Later', href: '/watch-later', authRequired: true },
        { icon: <Heart className="h-5 w-5" />, label: 'Liked Videos', href: '/liked', authRequired: true },
        { icon: <ListVideo className="h-5 w-5" />, label: 'Your Videos', href: '/your-videos', authRequired: true },
      ],
    },
    {
      title: 'Popular Creators',
      links: popularCreators 
        ? popularCreators.map(creator => ({
            icon: <User className="h-5 w-5" />,
            label: creator.username,
            href: `/creator/${creator.username}`,
          }))
        : [
            { icon: <User className="h-5 w-5" />, label: 'Loading...', href: '#' },
          ],
    },
  ];

  // Filter categories based on authentication status
  const filteredCategories = categories.filter(category => 
    !category.authRequired || (category.authRequired && user)
  );

  return (
    <aside 
      className={`
        hidden md:flex flex-col
        ${isCollapsed ? 'w-16' : 'w-56'} 
        min-h-[calc(100vh-4rem)] 
        sticky top-16 
        bg-white 
        overflow-y-auto 
        border-r border-gray-100 
        transition-all duration-300 ease-in-out
        ${className}
      `}
    >
      <button 
        onClick={handleToggleCollapse}
        className="absolute right-2 top-2 p-1 rounded-full hover:bg-gray-100 z-10"
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronLeft className="h-4 w-4 text-gray-500" />
        )}
      </button>

      <div className="p-4 flex-1">
        {filteredCategories.map((category, index) => {
          // Filter links based on authentication status
          const filteredLinks = category.links.filter(link => 
            !link.authRequired || (link.authRequired && user)
          );
          
          // Skip rendering empty categories
          if (filteredLinks.length === 0) return null;
          
          return (
            <div key={index} className="mb-8 last:mb-0">
              {category.title && !isCollapsed && (
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3 px-2">
                  {category.title}
                </h3>
              )}
              
              <nav className="space-y-1">
                {filteredLinks.map((link) => (
                  <NavLink
                    key={link.href}
                    to={link.href}
                    className={({ isActive }) =>
                      `flex items-center ${isCollapsed ? 'justify-center' : ''} px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        isActive
                          ? 'text-metanna-blue bg-metanna-blue/10'
                          : 'text-gray-700 hover:text-metanna-blue hover:bg-gray-50'
                      }`
                    }
                    title={isCollapsed ? link.label : undefined}
                  >
                    <span className={`${isCollapsed ? '' : 'mr-3'}`}>{link.icon}</span>
                    {!isCollapsed && <span className="truncate">{link.label}</span>}
                  </NavLink>
                ))}
              </nav>
            </div>
          );
        })}
      </div>
    </aside>
  );
};

export default Sidebar;
