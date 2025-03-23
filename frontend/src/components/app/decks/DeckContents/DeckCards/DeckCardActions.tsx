import * as React from 'react';
import { ClipboardCopy, SquareArrowUpRight } from 'lucide-react';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import DeckCardQuantitySelector from '@/components/app/decks/DeckContents/DeckCards/DeckCardQuantitySelector.tsx';
import { DeckCardDropdownMenuProps } from '@/components/app/decks/DeckContents/DeckCards/DeckCardDropdownMenu.tsx';
import { useNavigate } from '@tanstack/react-router';
import { Route } from '@/routes/__root.tsx';
import { useToast } from '@/hooks/use-toast.ts';

type DeckCardActionsDisplay = 'dropdown-menu' | 'card-detail-modal';

interface DeckCardActionsProps extends DeckCardDropdownMenuProps {
  display: DeckCardActionsDisplay;
}

const DeckCardActions: React.FC<DeckCardActionsProps> = ({
  deckCard,
  card,
  owned = false,
  cardInBoards,
  onQuantityChange,
}) => {
  const { toast } = useToast();
  const navigate = useNavigate({ from: Route.fullPath });

  return (
    <>
      <div className="border-r p-2">
        <DropdownMenuItem
          className="cursor-pointer"
          onSelect={() => {
            navigate({
              search: prev => ({ ...prev, modalCardId: deckCard.cardId }),
            });
          }}
        >
          <SquareArrowUpRight />
          View details
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onSelect={() => {
            navigator.clipboard.writeText(card?.name || '');
            toast({
              title: `Card name copied to clipboard`,
            });
          }}
        >
          <ClipboardCopy />
          Copy name
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onSelect={() => {
            navigator.clipboard.writeText(card?.cardId || '');
            toast({
              title: `Card ID copied to clipboard`,
            });
          }}
        >
          <ClipboardCopy />
          Copy card ID
        </DropdownMenuItem>
      </div>
      <div className="p-2 pl-4">
        {onQuantityChange && (
          <div className="flex flex-col text-sm gap-2 w-[250px]">
            <div className="flex gap-2 justify-between items-center">
              <span className="font-semibold">Maindeck</span>
              <DeckCardQuantitySelector
                value={cardInBoards?.[1]}
                onChange={n => onQuantityChange(n, 1)}
                disabled={!owned}
              />
            </div>
            <div className="flex gap-2 justify-between items-center">
              <span className="font-semibold">Sideboard</span>
              <DeckCardQuantitySelector
                value={cardInBoards?.[2]}
                onChange={n => onQuantityChange(n, 2)}
                disabled={!owned}
              />
            </div>
            <div className="flex gap-2 justify-between items-center">
              <span className="font-semibold">Maybeboard</span>
              <DeckCardQuantitySelector
                value={cardInBoards?.[3]}
                onChange={n => onQuantityChange(n, 3)}
                disabled={!owned}
              />
            </div>
            <DropdownMenuSeparator />
          </div>
        )}
      </div>
    </>
  );
};

export default DeckCardActions;
