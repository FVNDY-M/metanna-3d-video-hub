
import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, TrendingUp, Compass, Clock, Heart, ListVideo, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface SidebarLink {
  icon: React.ReactNode;
  label: string;
  href: string;
}

interface Creator {
  id: string;
  username: string;
  avatar_url: string | null;
  subscriber_count: number;
}

interface SidebarCategory {
  title?: string;
  links: SidebarLink[];
  creators?: Creator[];
}

interface SidebarProps {
  className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ className = '' }) => {
  const [popularCreators, setPopularCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPopularCreators = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, subscriber_count')
          .order('subscriber_count', { ascending: false })
          .limit(5);

        if (error) {
          console.error('Error fetching popular creators:', error);
          return;
        }

        setPopularCreators(data || []);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPopularCreators();
  }, []);

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
      links: [
        { icon: <Clock className="h-5 w-5" />, label: 'Watch Later', href: '/watch-later' },
        { icon: <Heart className="h-5 w-5" />, label: 'Liked Videos', href: '/liked' },
        { icon: <ListVideo className="h-5 w-5" />, label: 'Your Videos', href: '/your-videos' },
      ],
    },
  ];

  return (
    <aside className={`hidden md:block w-56 min-w-56 h-[calc(100vh-4rem)] sticky top-16 bg-white overflow-y-auto border-r border-gray-100 ${className}`}>
      <div className="p-4">
        {categories.map((category, index) => (
          <div key={index} className="mb-8 last:mb-0">
            {category.title && (
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
                    `flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      isActive
                        ? 'text-metanna-blue bg-metanna-blue/10'
                        : 'text-gray-700 hover:text-metanna-blue hover:bg-gray-50'
                    }`
                  }
                >
                  <span className="mr-3">{link.icon}</span>
                  <span>{link.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        ))}

        {/* Popular Creators Section */}
        <div className="mb-8 last:mb-0">
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3 px-2">
            Popular Creators
          </h3>
          <nav className="space-y-1">
            {loading ? (
              Array(5).fill(0).map((_, i) => (
                <div 
                  key={i}
                  className="flex items-center px-3 py-2 text-sm font-medium rounded-lg text-gray-700 animate-pulse"
                >
                  <div className="h-5 w-5 rounded-full bg-gray-200 mr-3"></div>
                  <div className="h-4 w-24 bg-gray-200 rounded"></div>
                </div>
              ))
            ) : (
              popularCreators.map((creator) => (
                <NavLink
                  key={creator.id}
                  to={`/creator/${creator.username}`}
                  className={({ isActive }) =>
                    `flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      isActive
                        ? 'text-metanna-blue bg-metanna-blue/10'
                        : 'text-gray-700 hover:text-metanna-blue hover:bg-gray-50'
                    }`
                  }
                >
                  <span className="mr-3">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={creator.avatar_url || undefined} alt={creator.username} />
                      <AvatarFallback className="text-xs bg-indigo-600 text-white">
                        {creator.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </span>
                  <span>{creator.username}</span>
                  {/* <span className="ml-auto text-xs text-gray-500">{creator.subscriber_count}</span> */}
                </NavLink>
              ))
            )}
          </nav>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
