import React from 'react';
import { cn } from '@/lib/utils.ts';
import CreatePool from '@/components/app/limited/CreatePool/CreatePool.tsx';
import YourLatestPools from '@/components/app/limited/YourLatestPools/YourLatestPools.tsx';
import PublicLatestPools from '@/components/app/limited/PublicLatestPools/PublicLatestPools.tsx';

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
      <YourLatestPools />
      <PublicLatestPools />
    </div>
  );
};

export default Limited;
