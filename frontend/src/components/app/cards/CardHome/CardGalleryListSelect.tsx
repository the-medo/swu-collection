import { useId } from 'react';
import { Link } from '@tanstack/react-router';
import { Label } from '@/components/ui/label.tsx';
import { Button } from '@/components/ui/button.tsx';
import CardDetailListSelect from '../CardDetail/CardDetailListSelect.tsx';
import InfoTooltip from '@/components/app/global/InfoTooltip/InfoTooltip.tsx';
import type { CardGalleryListState } from './useCardGalleryList.ts';

export default function CardGalleryListSelect({ list }: { list: CardGalleryListState }) {
  const id = useId();
  if (!list.userId) return null;
  return (
    <div className="w-full min-w-0 space-y-1 sm:w-72">
      <div className="flex items-center gap-1">
        <Label htmlFor={id} className="text-xs text-muted-foreground">
          Destination list
        </Label>
        <InfoTooltip
          tooltip={
            <>
              <p>Choose a list to view and update the quantity of each card version.</p>
              <p>EN · Near Mint · Foil follows the card version</p>
              <p>
                Your selection is remembered for five minutes after choosing a list or saving a
                quantity. Clear it to hide the quantity controls.
              </p>
            </>
          }
        />
      </div>
      <CardDetailListSelect
        id={id}
        collections={list.collections}
        value={list.selected?.id}
        onChange={list.changeList}
        disabled={list.lists.isPending || list.pending}
      />
      {list.lists.isError && (
        <div role="alert" className="text-xs text-destructive">
          Unable to load your lists.{' '}
          <Button
            variant="link"
            size="sm"
            disabled={list.lists.isFetching}
            onClick={() => void list.lists.refetch()}
          >
            Retry lists
          </Button>
        </div>
      )}
      {list.lists.isSuccess && !list.collections.length && (
        <p className="text-xs text-muted-foreground">
          No lists yet.{' '}
          <Link to="/collections/your" className="underline">
            Create a list
          </Link>
        </p>
      )}
      {list.selected && list.contents.isFetching && (
        <p role="status" className="text-xs text-muted-foreground">
          Loading list contents…
        </p>
      )}
      {list.selected && list.contents.isError && (
        <div role="alert" className="text-xs text-destructive">
          Unable to load list contents.{' '}
          <Button
            variant="link"
            size="sm"
            disabled={list.contents.isFetching}
            onClick={() => void list.contents.refetch()}
          >
            Retry contents
          </Button>
        </div>
      )}
    </div>
  );
}
