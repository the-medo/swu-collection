import React from 'react';
import { useGetCardPool } from '@/api/card-pools/useGetCardPool.ts';
import LeadersColumn from '@/components/app/limited/CardPoolDetail/LeadersColumn.tsx';
import CardPoolColumn from '@/components/app/limited/CardPoolDetail/CardPoolColumn.tsx';
import DecksColumn from '@/components/app/limited/CardPoolDetail/DecksColumn.tsx';

export interface CardPoolDetailProps {
  poolId: string | undefined;
}

const CardPoolDetail: React.FC<CardPoolDetailProps> = ({ poolId }) => {
  const { data, isFetching, error } = useGetCardPool(poolId);

  if (isFetching) {
    return (
      <div className="p-4 text-sm opacity-80">Loading card pool...</div>
    );
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
    <div className="grid gap-4 grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {/* Left column: Leaders - always width 1 column */}
      <div className="col-span-1">
        <LeadersColumn pool={pool} />
      </div>

      {/* Middle column(s): Card pool - spans all remaining middle columns */}
      <div className="col-span-1 md:col-span-1 lg:col-span-2 xl:col-span-3">
        <CardPoolColumn pool={pool} />
      </div>

      {/* Right column: Decks - always width 1 column */}
      <div className="col-span-1">
        <DecksColumn pool={pool} />
      </div>
    </div>
  );
};

export default CardPoolDetail;
