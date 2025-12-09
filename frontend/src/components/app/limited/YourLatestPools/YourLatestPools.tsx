import React, { useMemo } from 'react';
import GridSection from '@/components/app/global/GridSection/GridSection.tsx';
import SectionHeader from '@/components/app/daily-snapshots/sections/components/SectionHeader.tsx';
import CardPoolBox from './CardPoolBox.tsx';
import { useGetCardPools } from '@/api/card-pools/useGetCardPools.ts';
import { useUser } from '@/hooks/useUser.ts';
import { Loader2 } from 'lucide-react';

const gridSizing = {
  4: { row: { from: 1, to: 1 }, col: { from: 2, to: 4 } },
  3: { row: { from: 1, to: 1 }, col: { from: 2, to: 3 } },
  2: { row: { from: 1, to: 1 }, col: { from: 2, to: 2 } },
  1: { row: { from: 1, to: 1 }, col: { from: 1, to: 1 } },
};

const YourLatestPools: React.FC = () => {
  const user = useUser();

  const { data, isFetching } = useGetCardPools({
    userId: user?.id,
    sort: 'updated_at',
    order: 'desc',
  });

  const pools = useMemo(() => {
    if (!data) return [] as any[];
    return data.pages.flatMap(page => page.data || []);
  }, [data]);

  const latestPools = pools.slice(0, 10);

  return (
    <GridSection sizing={gridSizing}>
      <SectionHeader
        headerAndTooltips={
          <>
            <div className="flex items-center gap-2 flex-wrap">
              <h4>Your latest pools</h4>
            </div>
          </>
        }
      />
      <div className="flex gap-2 mt-2 overflow-x-auto">
        {isFetching && (
          <div className="flex items-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading
          </div>
        )}
        {!isFetching && latestPools.length === 0 && (
          <div className="text-sm text-muted-foreground">You don't have any pools yet.</div>
        )}
        {!isFetching && latestPools.map(pool => <CardPoolBox key={pool.id} cardPool={pool} />)}
      </div>
    </GridSection>
  );
};

export default YourLatestPools;
