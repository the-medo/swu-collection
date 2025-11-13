import { createFileRoute } from '@tanstack/react-router';
import { Helmet } from 'react-helmet-async';
import PublicCardPools from '@/components/app/limited/PublicCardPools/PublicCardPools.tsx';

export const Route = createFileRoute('/limited/public/')({
  component: PagePublicCardPools,
});

function PagePublicCardPools() {
  return (
    <>
      <Helmet title="Public Card Pools | SWUBase" />
      <div className="p-2">
        <div className="flex flex-row gap-4 items-center justify-between mb-2">
          <h3>Card Pools</h3>
        </div>
        <PublicCardPools />
      </div>
    </>
  );
}
