import { limitedStyles } from '@/components/app/limited/limitedStyles';
import { cn } from '@/lib/utils';
import { createFileRoute } from '@tanstack/react-router';
import { Helmet } from 'react-helmet-async';
import { LimitedHeader } from '@/components/app/limited/LimitedHeader.tsx';
import PublicCardPools from '@/components/app/limited/PublicCardPools/PublicCardPools.tsx';

export const Route = createFileRoute('/limited/public/')({
  component: PagePublicCardPools,
});

function PagePublicCardPools() {
  return (
    <>
      <Helmet title="Public Card Pools | SWUBase" />
      <div className={cn('space-y-3 p-2 sm:p-3', limitedStyles.page)}>
        <LimitedHeader publicPools />
        <PublicCardPools />
      </div>
    </>
  );
}
