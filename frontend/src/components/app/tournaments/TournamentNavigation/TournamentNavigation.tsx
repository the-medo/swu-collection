import React from 'react';
import { Link, useMatchRoute } from '@tanstack/react-router';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/components/ui/sidebar.tsx';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

interface TournamentNavigationProps {
  className?: string;
}

const TournamentNavigation: React.FC<TournamentNavigationProps> = ({ className }) => {
  const { isMobile } = useSidebar();
  const matchRoute = useMatchRoute();

  const isActive = (path: string) => {
    return matchRoute({ to: path });
  };

  const navItems = [
    { name: 'Featured', path: '/tournaments/featured' },
    {
      name: 'Planetary Qualifiers',
      path: '/tournaments/planetary-qualifiers',
      search: { weekId: 'all' },
    },
    { name: 'All Tournaments', path: '/tournaments/all' },
  ];

  // Find the active item
  const activeItem = navItems.find(item => isActive(item.path)) || navItems[0];

  // Render different layouts based on isMobile
  if (isMobile) {
    return (
      <div className={cn('flex items-center gap-2 mb-4', className)}>
        {/* Show only the active link */}
        <Link
          key={activeItem.path}
          to={activeItem.path}
          search={prev => ({ ...activeItem.search, metaId: prev.metaId, formatId: prev.formatId })}
          className={cn(
            'relative flex-1 h-[60px] flex items-center justify-center rounded-md font-medium text-white text-2xl',
          )}
        >
          <div
            className="absolute inset-0 rounded-md bg-cover bg-center -z-10 grayscale"
            style={{ backgroundImage: 'url(https://images.swubase.com/button-bg.webp)' }}
          />
          <div className="absolute inset-0 rounded-md bg-cover bg-center -z-10 after:absolute after:inset-0 after:bg-primary/50 after:rounded-md after:content-['']" />
          {activeItem.name}
        </Link>

        {/* Dropdown for other options */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-[60px] w-[60px] bg-background/80 hover:bg-background/90"
            >
              <ChevronDown className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {navItems
              .filter(item => item.path !== activeItem.path)
              .map(item => (
                <DropdownMenuItem key={item.path} asChild>
                  <Link
                    to={item.path}
                    search={prev => ({
                      ...item.search,
                      metaId: prev.metaId,
                      formatId: prev.formatId,
                    })}
                    className="w-full cursor-pointer"
                    onClick={() => {
                      // Close the dropdown when an item is clicked
                      document.body.click();
                    }}
                  >
                    {item.name}
                  </Link>
                </DropdownMenuItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  // Desktop layout (unchanged)
  return (
    <div className={cn('flex flex-wrap gap-4 mb-4', className)}>
      {navItems.map(item => (
        <Link
          key={item.path}
          to={item.path}
          search={prev => ({ ...item.search, metaId: prev.metaId, formatId: prev.formatId })}
          className={cn(
            'relative min-w-[250px] w-1/4 h-[60px] flex grow items-center justify-center rounded-md font-medium transition-all text-xl',
            {
              'grayscale-0 grayscale-100 text-white text-2xl': isActive(item.path),
              'grayscale hover:grayscale-0 transition-all': !isActive(item.path),
            },
          )}
        >
          <div
            className={cn('absolute inset-0 rounded-md bg-cover bg-center -z-10 grayscale', {
              'opacity-40': !isActive(item.path),
            })}
            style={{ backgroundImage: 'url(https://images.swubase.com/button-bg.webp)' }}
          />
          <div
            className={cn('absolute inset-0 rounded-md bg-cover bg-center -z-10', {
              'opacity-40': !isActive(item.path),
              'after:absolute after:inset-0 after:bg-primary/50 after:rounded-md after:content-[""]':
                true,
            })}
          />
          {item.name}
        </Link>
      ))}
    </div>
  );
};

export default TournamentNavigation;
