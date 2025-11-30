import React from 'react';
import { useGetCardPool } from '@/api/card-pools/useGetCardPool.ts';
import LeadersColumn from '@/components/app/limited/CardPoolDetail/LeadersColumn.tsx';
import CardPoolColumn from '@/components/app/limited/CardPoolDetail/CardPoolColumn.tsx';
import DecksColumn from '@/components/app/limited/CardPoolDetail/DecksColumn.tsx';
import { Helmet } from 'react-helmet-async';
import LoadingTitle from '../../global/LoadingTitle';
import { useUser } from '@/hooks/useUser.ts';
import { Button } from '@/components/ui/button.tsx';
import EditCardPoolDialog from '@/components/app/dialogs/EditCardPoolDialog.tsx';
import { cardPoolVisibilityRenderer } from '@/components/app/limited/components/cardPoolVisibilityRenderer.tsx';

export interface CardPoolDetailProps {
  poolId: string | undefined;
}

const CardPoolDetail: React.FC<CardPoolDetailProps> = ({ poolId }) => {
  const { data, isFetching, error } = useGetCardPool(poolId);
  const user = useUser();

  if (isFetching) {
    return <div className="p-4 text-sm opacity-80">Loading card pool...</div>;
  }

  if (error) {
    return (
      <div className="p-4 text-sm text-red-400">
        {error.status === 404 ? 'Card pool not found.' : 'Failed to load card pool.'}
      </div>
    );
  }

  // We will mock the inner layout for now, but we already fetched the pool info
  const pool = data?.data;

  return (
    <>
      <Helmet title={`${pool?.name || 'Loading card pool'} | SWUBase`} />
      <div className="flex max-lg:flex-col gap-4 items-center md:justify-between">
        <LoadingTitle mainTitle={pool?.name} loading={isFetching} />
        {user && pool && (
          <div className="flex flex-row gap-4 items-center">
            {pool.visibility ? cardPoolVisibilityRenderer(pool.visibility as any) : null}
            {user.id === pool.userId && (
              <EditCardPoolDialog pool={pool} trigger={<Button>Edit card pool</Button>} />
            )}
          </div>
        )}
      </div>
      <div className="flex flex-row gap-4 text-sm italic mb-2">{pool?.description}</div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        <div className="col-span-1">
          <DecksColumn pool={pool} />
        </div>
        <div className="col-span-1">
          <LeadersColumn pool={pool} />
        </div>
        <div className="col-span-1 md:col-span-1 lg:col-span-2 xl:col-span-3">
          <CardPoolColumn pool={pool} />
        </div>
      </div>
    </>
  );
};

export default CardPoolDetail;
