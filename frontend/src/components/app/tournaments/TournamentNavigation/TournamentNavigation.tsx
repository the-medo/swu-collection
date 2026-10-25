import { competitionStyles } from '@/components/app/tournaments/competitionStyles';
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

const navItems = [
  { name: 'Featured', path: '/tournaments/featured' },
  {
    name: 'Planetary Qualifiers',
    path: '/tournaments/planetary-qualifiers',
    search: { weekId: 'all' },
  },
  { name: 'All Tournaments', path: '/tournaments/all' },
  { name: 'Map', path: '/tournaments/map' },
  { name: 'Your calendar', path: '/tournaments/calendar' },
];

export default function TournamentNavigation({ className }: { className?: string }) {
  const { isMobile } = useSidebar();
  const matchRoute = useMatchRoute();
  const activeItem = navItems.find(item => matchRoute({ to: item.path })) || navItems[0];

  if (isMobile) {
    return (
      <nav
        className={cn(
          'mb-4',
          competitionStyles.mainNav,
          competitionStyles.mainNavMobile,
          className,
        )}
        aria-label="Tournament browsing"
      >
        <Link
          to={activeItem.path}
          aria-current="page"
          search={prev => ({ ...activeItem.search, metaId: prev.metaId, formatId: prev.formatId })}
        >
          {activeItem.name}
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Tournament pages">
              <ChevronDown className="size-5" />
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
                  >
                    {item.name}
                  </Link>
                </DropdownMenuItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>
    );
  }

  return (
    <nav
      className={cn(
        'grid grid-cols-2 xl:grid-cols-5 gap-3 mb-4',
        competitionStyles.mainNav,
        className,
      )}
      aria-label="Tournament browsing"
    >
      {navItems.map(item => (
        <Link
          key={item.path}
          to={item.path}
          search={prev => ({ ...item.search, metaId: prev.metaId, formatId: prev.formatId })}
          aria-current={matchRoute({ to: item.path }) ? 'page' : undefined}
        >
          {item.name}
        </Link>
      ))}
    </nav>
  );
}
