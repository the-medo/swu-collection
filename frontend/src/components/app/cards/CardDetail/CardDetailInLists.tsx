import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useGetCardInLists } from '@/api/collections/useGetCardInLists.ts';
import SignIn from '@/components/app/auth/SignIn.tsx';
import { Button } from '@/components/ui/button.tsx';
import { useUser } from '@/hooks/useUser.ts';
import CollectionCardMatchesTable from '@/components/app/collections/CollectionContents/CollectionCards/CollectionCardMatchesTable.tsx';
import type {
  CardDataWithVariants,
  CardListVariants,
} from '../../../../../../lib/swu-resources/types.ts';
import { CollectionType } from '../../../../../../types/enums.ts';

const listTypeLabels: Record<number, string> = {
  [CollectionType.COLLECTION]: 'Collection',
  [CollectionType.WANTLIST]: 'Wantlist',
  [CollectionType.OTHER]: 'Card list',
};

interface CardDetailInListsProps {
  card: CardDataWithVariants<CardListVariants>;
  selectedVariantId?: string;
}

export default function CardDetailInLists({ card, selectedVariantId }: CardDetailInListsProps) {
  const user = useUser();
  return (
    <section
      aria-label="Card in my lists"
      className="min-w-0 space-y-3 rounded-lg border bg-muted/20 p-3"
    >
      {user ? (
        <CardDetailInListsContent
          key={`${user.id}:${card.cardId}`}
          card={card}
          selectedVariantId={selectedVariantId}
          userId={user.id}
          currency={user.currency ?? '-'}
        />
      ) : (
        <div className="flex justify-center">
          <SignIn
            trigger={
              <Button type="button" variant="outline" size="sm">
                Check in my lists
              </Button>
            }
          />
        </div>
      )}
    </section>
  );
}

function CardDetailInListsContent({
  card,
  selectedVariantId,
  userId,
  currency,
}: CardDetailInListsProps & { userId: string; currency: string }) {
  const [checked, setChecked] = useState(false);
  const { data, isFetching, isError, refetch } = useGetCardInLists(userId, card.cardId, checked);
  const totals: Record<number, number> = {
    [CollectionType.COLLECTION]: 0,
    [CollectionType.WANTLIST]: 0,
    [CollectionType.OTHER]: 0,
  };
  for (const list of data?.data ?? []) {
    const type = list.collection.collectionType;
    totals[type] = (totals[type] ?? 0) + list.cards.reduce((sum, row) => sum + row.amount, 0);
  }

  if (!checked) {
    return (
      <div className="flex justify-center">
        <Button type="button" variant="outline" size="sm" onClick={() => setChecked(true)}>
          Check in my lists
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <h3 className="!mb-0 !text-base font-semibold">In your lists</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isFetching}
          onClick={() => void refetch()}
        >
          {isFetching ? 'Checking...' : isError ? 'Retry' : 'Refresh'}
        </Button>
      </div>
      {data && (
        <p aria-label="List totals" className="text-sm text-muted-foreground">
          <span className="font-medium tabular-nums">{totals[CollectionType.COLLECTION]}</span> in
          collections{' · '}
          <span className="font-medium tabular-nums">{totals[CollectionType.WANTLIST]}</span> in
          wantlists{' · '}
          <span className="font-medium tabular-nums">{totals[CollectionType.OTHER]}</span> in card
          lists
        </p>
      )}
      {isFetching && !data && (
        <p role="status" className="text-sm text-muted-foreground">
          Checking your lists...
        </p>
      )}
      {isError && (
        <p role="alert" className="text-sm text-destructive">
          Unable to check this card in your lists. Please try again.
        </p>
      )}
      {data?.data.length === 0 && (
        <p role="status" className="text-sm text-muted-foreground">
          This card isn’t in any of your lists.
        </p>
      )}
      {data?.data.map(list => (
        <div
          key={list.collection.id}
          role="group"
          aria-label={list.collection.title}
          className="min-w-0 space-y-2"
        >
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <Link
              to="/collections/$collectionId"
              params={{ collectionId: list.collection.id }}
              className="min-w-0 break-words text-sm font-medium text-primary hover:underline"
            >
              {list.collection.title}
            </Link>
            <span className="text-xs text-muted-foreground">
              {listTypeLabels[list.collection.collectionType] ?? 'List'}
            </span>
          </div>
          <CollectionCardMatchesTable
            list={list}
            card={card}
            currency={currency}
            selectedVariantId={selectedVariantId}
          />
        </div>
      ))}
    </>
  );
}
