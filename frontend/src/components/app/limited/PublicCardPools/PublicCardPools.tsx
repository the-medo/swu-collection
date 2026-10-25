import { limitedStyles } from '@/components/app/limited/limitedStyles';
import { cn } from '@/lib/utils';
import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button.tsx';
import { Loader2 } from 'lucide-react';
import CardPoolFilters from '@/components/app/limited/CardPoolFilters/CardPoolFilters.tsx';
import CardPoolTable from '@/components/app/limited/CardPoolTable/CardPoolTable.tsx';
import { useGetCardPools } from '@/api/card-pools/useGetCardPools.ts';
import {
  useCardPoolFilterStore,
  useInitializeCardPoolFilterFromUrlParams,
} from '@/components/app/limited/CardPoolFilters/useCardPoolFilterStore.ts';

const PublicCardPools: React.FC = () => {
  const initialized = useInitializeCardPoolFilterFromUrlParams();
  const { toRequestParams } = useCardPoolFilterStore();

  const { data, isFetching, hasNextPage, fetchNextPage, isFetchingNextPage, isError, refetch } =
    useGetCardPools(toRequestParams());

  const pools = useMemo(() => {
    if (!data) return [];
    return data.pages.flatMap(page => page.data || []);
  }, [data]);

  const loading = isFetching && !data;

  if (!initialized) {
    return (
      <>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading{' '}
      </>
    );
  }

  return (
    <>
      <CardPoolFilters initialized={initialized} />
      {isError && !data ? (
        <div role="alert" className={cn('p-3 text-sm', limitedStyles.panel)}>
          Could not load card pools.{' '}
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      ) : (
        <div className={cn('overflow-hidden', limitedStyles.panel)}>
          <CardPoolTable pools={pools} loading={loading} />
        </div>
      )}

      {hasNextPage && (
        <div className="flex justify-center mt-4">
          <Button onClick={() => fetchNextPage()} disabled={isFetchingNextPage} variant="outline">
            {isFetchingNextPage ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading more
              </>
            ) : (
              'Load more card pools'
            )}
          </Button>
        </div>
      )}
    </>
  );
};

export default PublicCardPools;
