import { limitedStyles } from '@/components/app/limited/limitedStyles';
import { cn } from '@/lib/utils';
import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useUser } from '@/hooks/useUser.ts';
import { Link } from '@tanstack/react-router';
import { ArrowRight, CalendarDays } from 'lucide-react';
import CreatePool from '@/components/app/limited/CreatePool/CreatePool.tsx';
import YourLatestPools from '@/components/app/limited/YourLatestPools/YourLatestPools.tsx';
import PublicLatestPools from '@/components/app/limited/PublicLatestPools/PublicLatestPools.tsx';

const Limited: React.FC = () => {
  const user = useUser();
  return (
    <div className={cn('space-y-5 p-3 sm:p-5', limitedStyles.page, limitedStyles.landing)}>
      <Helmet title="Sealed deck & card pools | SWUBase" />
      <header className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2">
        <div>
          <h1 className={limitedStyles.title}>Sealed deck</h1>
          <p className="m-0! mt-1! text-sm text-muted-foreground">
            Fresh packs. Unexpected leaders. Your next build.
          </p>
        </div>
        <Link to="/" search={{ homeMode: 'today' }} className={limitedStyles.dailyLink}>
          <CalendarDays size={16} aria-hidden="true" /> Play the daily pool{' '}
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </header>
      <div className={limitedStyles.landingLayout}>
        <CreatePool />
        <div className={cn('min-w-0 space-y-6', limitedStyles.poolBrowser)}>
          {user && <YourLatestPools />}
          <PublicLatestPools />
        </div>
      </div>
    </div>
  );
};

export default Limited;
