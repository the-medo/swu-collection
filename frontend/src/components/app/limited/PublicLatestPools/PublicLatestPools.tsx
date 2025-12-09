import React, { useMemo } from 'react';
import GridSection from '@/components/app/global/GridSection/GridSection.tsx';
import GridSectionContent from '@/components/app/global/GridSection/GridSectionContent.tsx';
import SectionHeader from '@/components/app/daily-snapshots/sections/components/SectionHeader.tsx';
import { useGetCardPools } from '@/api/card-pools/useGetCardPools.ts';
import CardPoolTable from '@/components/app/limited/CardPoolTable/CardPoolTable.tsx';
import { Loader2 } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button.tsx';

const gridSizing = {
  4: { row: { from: 2, to: 3 }, col: { from: 2, to: 4 } },
  3: { row: { from: 2, to: 3 }, col: { from: 2, to: 3 } },
  2: { row: { from: 2, to: 3 }, col: { from: 2, to: 2 } },
  1: { row: { from: 3, to: 3 }, col: { from: 1, to: 1 } },
};

const PublicLatestPools: React.FC = () => {
  const { data, isFetching } = useGetCardPools({
    visibility: 'public',
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
      <GridSectionContent>
        <SectionHeader
          headerAndTooltips={
            <div className="flex items-center gap-2 w-full justify-between">
              <h4>Latest pools</h4>
            </div>
          }
          dropdownMenu={
            <Link to={'/limited/public'}>
              <Button variant="outline" size="xs">
                See all pools
              </Button>
            </Link>
          }
        />
        {isFetching ? (
          <div className="flex items-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading
          </div>
        ) : (
          <CardPoolTable pools={latestPools} loading={isFetching} />
        )}
      </GridSectionContent>
    </GridSection>
  );
};

export default PublicLatestPools;
