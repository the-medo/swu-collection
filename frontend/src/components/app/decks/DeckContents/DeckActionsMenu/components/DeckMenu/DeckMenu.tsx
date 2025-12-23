import * as React from 'react';
import {
  NavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuContent,
} from '@/components/ui/navigation-menu.tsx';
import { MoreHorizontal } from 'lucide-react';
import DeckMenuContent from './DeckMenuContent.tsx';

interface DeckMenuProps {
  deckId: string;
}

const DeckMenu: React.FC<DeckMenuProps> = ({ deckId }) => {
  return (
    <NavigationMenuItem>
      <NavigationMenuTrigger className="justify-start border" showArrow={false}>
        <MoreHorizontal className="h-4 w-4" />
      </NavigationMenuTrigger>
      <NavigationMenuContent>
        <DeckMenuContent deckId={deckId} />
      </NavigationMenuContent>
    </NavigationMenuItem>
  );
};

export default DeckMenu;
