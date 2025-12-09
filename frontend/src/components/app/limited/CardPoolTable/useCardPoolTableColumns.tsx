import { useMemo } from 'react';
import type { CardPool } from '../../../../../../server/db/schema/card_pool.ts';
import { ExtendedColumnDef, DataTableViewMode } from '@/components/ui/data-table.tsx';
import { useCardList } from '@/api/lists/useCardList.ts';
import { selectDefaultVariant } from '../../../../../../server/lib/cards/selectDefaultVariant.ts';
import CardImage from '@/components/app/global/CardImage.tsx';
import { cn } from '@/lib/utils.ts';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button.tsx';
import { cardPoolTypeRenderer } from '@/components/app/limited/components/cardPoolTypeRenderer.tsx';
import { cardPoolCustomRenderer } from '@/components/app/limited/components/cardPoolCustomRenderer.tsx';
import { cardPoolVisibilityRenderer } from '@/components/app/limited/components/cardPoolVisibilityRenderer.tsx';
import { cardPoolStatusRenderer } from '@/components/app/limited/components/cardPoolStatusRenderer.tsx';
import { dateRenderer } from '@/lib/table/dateRenderer.tsx';

interface UseCardPoolTableColumnsProps {
  view?: DataTableViewMode;
  isCompactBoxView?: boolean;
}

export const useCardPoolTableColumns = ({
  view = 'table',
  isCompactBoxView = false,
}: UseCardPoolTableColumnsProps): ExtendedColumnDef<CardPool>[] => {
  const { data: cardListData } = useCardList();

  return useMemo(() => {
    const defs: ExtendedColumnDef<CardPool>[] = [];

    // Name column
    defs.push({
      id: 'name',
      accessorKey: 'name',
      header: 'Name',
      displayBoxHeader: false,
      cell: ({ getValue, row }) => {
        const pool = row.original;
        const name = (getValue() as string) || 'Untitled pool';
        const poolId = pool.id as string;
        return (
          <Link to={`/limited/pool/$poolId/detail`} params={{ poolId }} className="font-bold">
            <Button
              variant="link"
              className={cn('flex flex-col gap-1 p-0 w-full items-start justify-center', {
                'items-center': view === 'box',
              })}
            >
              <span className={cn({ 'truncate ellipsis max-w-[75vw]': view === 'box' })}>
                {name}
              </span>
              {row.original.description && (
                <span
                  className={cn(
                    'text-xs font-normal italic max-w-80 truncate ellipsis overflow-hidden whitespace-nowrap',
                    { 'truncate ellipsis max-w-[75vw]': view === 'box' },
                  )}
                >
                  {row.original.description}
                </span>
              )}
            </Button>
            <div className="flex flex-row flex-wrap items-center gap-2">
              {row.original.type ? cardPoolTypeRenderer(row.original.type) : null}
              {typeof pool.custom === 'boolean' ? cardPoolCustomRenderer(pool.custom) : null}
              {pool.visibility ? cardPoolVisibilityRenderer(pool.visibility as any) : null}
              {pool.status ? cardPoolStatusRenderer(pool.status as any) : null}
            </div>
          </Link>
        );
      },
    });

    // Leaders column
    defs.push({
      id: 'leaders',
      header: 'Leaders',
      size: 24,
      displayBoxHeader: false,
      cell: ({ row }) => {
        const pool = row.original;
        const leaders = (pool.leaders ?? '').split(',').filter(Boolean).slice(0, 8);

        const leaderCards = leaders.map(cardId => cardListData?.cards[cardId]).filter(Boolean);

        return (
          <div className={cn('flex gap-1', { 'justify-center': view === 'box' })}>
            {leaderCards.map((card, idx) => (
              <div key={idx} className={idx > 0 ? '-ml-14' : ''}>
                <CardImage
                  card={card}
                  cardVariantId={card ? selectDefaultVariant(card) : undefined}
                  forceHorizontal={true}
                  size="w100"
                  backSideButton={false}
                />
              </div>
            ))}
          </div>
        );
      },
    });

    // UpdatedAt column
    defs.push({
      id: 'updatedAt',
      accessorKey: 'updated_at',
      size: 24,
      displayInBoxView: !isCompactBoxView,
      header: view === 'box' ? 'Updated' : () => <div className="text-right">Updated</div>,
      cell: ({ getValue }) => dateRenderer(getValue() as string),
    });

    return defs;
  }, [cardListData, view, isCompactBoxView]);
};
