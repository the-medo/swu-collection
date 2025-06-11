import * as React from 'react';
import { Link, useSearch } from '@tanstack/react-router';
import { cn } from '@/lib/utils';

interface PQPageNavigationProps {}

const PQPageNavigation: React.FC<PQPageNavigationProps> = () => {
  const { page } = useSearch({ strict: false });

  return (
    <div className="grid grid-cols-3 mb-2 rounded-lg bg-muted p-1">
      <Link
        to="/tournaments/planetary-qualifiers"
        search={prev => ({ ...prev, page: 'tournaments' })}
        className={cn(
          'flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-all',
          page === 'tournaments'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        Tournaments
      </Link>
      <Link
        to="/tournaments/planetary-qualifiers"
        search={prev => ({ ...prev, page: 'top8' })}
        className={cn(
          'flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-all',
          page === 'top8'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        Top 8
      </Link>
      <Link
        to="/tournaments/planetary-qualifiers"
        search={prev => ({ ...prev, page: 'winners' })}
        className={cn(
          'flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-all',
          page === 'winners'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        Winners
      </Link>
    </div>
  );
};

export default PQPageNavigation;
