
import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, TrendingUp, Compass, Clock, Heart, ListVideo, User } from 'lucide-react';

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
}

const Sidebar: React.FC<SidebarProps> = ({ className = '' }) => {
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
    {
      title: 'Popular Creators',
      links: [
        { icon: <User className="h-5 w-5" />, label: 'Tesla', href: '/creator/tesla' },
        { icon: <User className="h-5 w-5" />, label: 'Marvel', href: '/creator/marvel' },
        { icon: <User className="h-5 w-5" />, label: 'Michel Rojkind', href: '/creator/michel-rojkind' },
        { icon: <User className="h-5 w-5" />, label: 'Caspar David Friedrich', href: '/creator/caspar-david-friedrich' },
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
      </div>
    </aside>
  );
};

export default Sidebar;
