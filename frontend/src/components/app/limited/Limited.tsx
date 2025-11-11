import React from 'react';
import { cn } from '@/lib/utils.ts';
import CreatePool from '@/components/app/limited/CreatePool/CreatePool.tsx';
import LatestPools from '@/components/app/limited/LatestPools/LatestPools.tsx';
import PublicPools from '@/components/app/limited/PublicPools/PublicPools.tsx';

const Limited: React.FC = () => {
  return (
    <div
      className={cn(
        'grid gap-4',
        // 2 cols on small, then 3, 4, and your fixed 5-col layout at xl
        'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
        'auto-rows-[minmax(12rem,auto)]',
        'grid-flow-dense',
      )}
    >
      <CreatePool />
      <LatestPools />
      <PublicPools />
    </div>
  );
};

export default Limited;
