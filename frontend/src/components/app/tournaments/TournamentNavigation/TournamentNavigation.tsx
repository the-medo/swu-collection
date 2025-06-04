import React from 'react';
import { Link, useMatchRoute } from '@tanstack/react-router';
import { cn } from '@/lib/utils';

interface TournamentNavigationProps {
  className?: string;
}

const TournamentNavigation: React.FC<TournamentNavigationProps> = ({ className }) => {
  const matchRoute = useMatchRoute();

  const isActive = (path: string) => {
    return matchRoute({ to: path });
  };

  const navItems = [
    { name: 'Featured', path: '/tournaments/featured' },
    { name: 'Planetary Qualifiers', path: '/tournaments/planetary-qualifiers' },
    { name: 'All Tournaments', path: '/tournaments/all' },
  ];

  return (
    <div className={cn('flex flex-wrap gap-4 mb-4', className)}>
      {navItems.map(item => (
        <Link
          key={item.path}
          to={item.path}
          search={prev => ({ metaId: prev.metaId, formatId: prev.formatId })}
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
