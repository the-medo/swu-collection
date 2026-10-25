import { limitedStyles } from '@/components/app/limited/limitedStyles';
import { cn } from '@/lib/utils';
import React from 'react';
import { useGetCardPool } from '@/api/card-pools/useGetCardPool.ts';
import LeadersSection from '@/components/app/limited/CardPoolDetail/LeadersSection.tsx';
import CardPoolSection from '@/components/app/limited/CardPoolDetail/CardPoolSection.tsx';
import DecksColumn from '@/components/app/limited/CardPoolDetail/DecksColumn.tsx';
import { Helmet } from 'react-helmet-async';
import { Link } from '@tanstack/react-router';
import { ArrowLeft, Pencil } from 'lucide-react';
import { cardPoolTypeRenderer } from '../components/cardPoolTypeRenderer.tsx';
import { useUser } from '@/hooks/useUser.ts';
import { Button } from '@/components/ui/button.tsx';
import EditCardPoolDialog from '@/components/app/dialogs/EditCardPoolDialog.tsx';
import { cardPoolVisibilityRenderer } from '@/components/app/limited/components/cardPoolVisibilityRenderer.tsx';
import CPExplainerTooltip from '@/components/app/limited/CardPoolDetail/CPExplainerTooltip.tsx';
import type { Visibility } from '../../../../../../shared/types/visibility.ts';

export interface CardPoolDetailProps {
  poolId: string | undefined;
  initialDeckVisibility?: Visibility;
}

const CardPoolDetail: React.FC<CardPoolDetailProps> = ({ poolId, initialDeckVisibility }) => {
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

  const pool = data?.data;

  return (
    <>
      <Helmet title={`${pool?.name || 'Loading card pool'} | SWUBase`} />
      <div className={cn('space-y-3 p-2 sm:p-3', limitedStyles.page)}>
        <header className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2 max-sm:basis-full">
            <Button asChild variant="ghost" size="iconMedium">
              <Link to="/limited" aria-label="Back to sealed deck">
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
            <h1 className={limitedStyles.title}>{pool?.name || 'Card pool'}</h1>
            <CPExplainerTooltip />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {pool?.set && (
              <span className="text-xs font-medium uppercase text-muted-foreground">
                {pool.set}
              </span>
            )}
            {pool?.type && cardPoolTypeRenderer(pool.type)}
            {pool?.visibility && cardPoolVisibilityRenderer(pool.visibility)}
            {user && pool && user.id === pool.userId && (
              <EditCardPoolDialog
                pool={pool}
                trigger={
                  <Button size="sm" variant="outline">
                    <Pencil className="size-3.5" /> Edit pool
                  </Button>
                }
              />
            )}
          </div>
        </header>
        {pool?.description && (
          <p className="m-0! text-sm text-muted-foreground [overflow-wrap:anywhere]">
            {pool.description}
          </p>
        )}

        <div className="grid items-start gap-3 grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="col-span-1">
            <DecksColumn pool={pool} initialDeckVisibility={initialDeckVisibility} />
          </div>
          <div className="min-w-0 flex flex-col gap-3">
            <LeadersSection pool={pool} />
            <CardPoolSection pool={pool} />
          </div>
        </div>
      </div>
    </>
  );
};

export default CardPoolDetail;
