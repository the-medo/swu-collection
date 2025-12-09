import React from 'react';
import { Button } from '@/components/ui/button';
import {
  useCardPoolDeckDetailStore,
  useCardPoolDeckDetailStoreActions,
} from '@/components/app/limited/CardPoolDeckDetail/useCardPoolDeckDetailStore.ts';
import {
  CardLocation,
  useUpdateCardPoolDeckCard,
} from '@/api/card-pools/useUpdateCardPoolDeckCard.ts';
import { cn } from '@/lib/utils.ts';

interface CPSelectionActionProps {
  deckId?: string;
  poolId?: string;
}

const CPSelectionAction: React.FC<CPSelectionActionProps> = ({ deckId, poolId }) => {
  const { selectedCardIds } = useCardPoolDeckDetailStore();
  const { clearSelectedCardIds } = useCardPoolDeckDetailStoreActions();
  const mutation = useUpdateCardPoolDeckCard(poolId, deckId);

  const selectedNumbers = React.useMemo(
    () =>
      Object.keys(selectedCardIds)
        .map(n => Number(n))
        .filter(n => Number.isFinite(n)),
    [selectedCardIds],
  );

  const hasSelection = selectedNumbers.length > 0;

  const handleMove = async (location: CardLocation) => {
    if (!hasSelection || !poolId || !deckId) return;
    try {
      await mutation.mutateAsync({ cardPoolNumbers: selectedNumbers, location });
    } finally {
      // Always clear selection after the action is finished (success or error per requirement ambiguity)
      clearSelectedCardIds();
    }
  };

  if (!hasSelection) return null;

  return (
    <div
      className={cn(
        'border-t border-border bg-[green] px-3 py-2 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-muted/60',
        'sticky bottom-0',
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={mutation.isPending}
            onClick={() => clearSelectedCardIds()}
            title="Deselect all selected cards"
          >
            Deselect all
          </Button>
          <div className="text-sm text-muted-foreground">
            Selected: <span className="font-medium text-foreground">{selectedNumbers.length}</span>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-end gap-2">
          <span className="text-sm text-muted-foreground hidden sm:inline">
            Move selection to this section:
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={mutation.isPending}
            onClick={() => void handleMove('pool')}
          >
            Card pool
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={mutation.isPending}
            onClick={() => void handleMove('trash')}
          >
            Trash
          </Button>
          <Button
            type="button"
            variant="default"
            size="sm"
            disabled={mutation.isPending}
            onClick={() => void handleMove('deck')}
          >
            Deck
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CPSelectionAction;
