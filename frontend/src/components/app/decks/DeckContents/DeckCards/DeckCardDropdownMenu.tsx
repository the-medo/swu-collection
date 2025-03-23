import * as React from 'react';
import { DeckCardRowProps } from './DeckCardRow';
import { ChevronDownCircle } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from '@/components/ui/dropdown-menu';
import DeckCardActions from '@/components/app/decks/DeckContents/DeckCards/DeckCardActions.tsx';
import { DeckCardQuantityChangeHandler } from '@/components/app/decks/DeckContents/DeckCards/deckCardsLib.ts';

export interface DeckCardDropdownMenuProps extends DeckCardRowProps {
  owned?: boolean;
  onQuantityChange?: DeckCardQuantityChangeHandler;
}

const DeckCardDropdownMenu: React.FC<DeckCardDropdownMenuProps> = ({ ...props }) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="iconXSmall">
          <ChevronDownCircle className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="flex flex-row ">
        <DeckCardActions {...props} display="dropdown-menu" />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default DeckCardDropdownMenu;
