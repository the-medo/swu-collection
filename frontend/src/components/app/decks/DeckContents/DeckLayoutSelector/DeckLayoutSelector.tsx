import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button.tsx';
import { Eye } from 'lucide-react';
import {
  DeckLayout,
  useDeckLayoutStore,
  useDeckLayoutStoreActions,
} from '@/components/app/decks/DeckContents/useDeckLayoutStore.ts';
import { deckLayoutArray, deckLayoutObj } from '../../../../../../../types/iterableEnumInfo.ts';
import { useCallback } from 'react';

interface DeckLayoutSelectorProps {}

const DeckLayoutSelector: React.FC<DeckLayoutSelectorProps> = ({}) => {
  const { layout } = useDeckLayoutStore();
  const { setLayout } = useDeckLayoutStoreActions();

  const onValueChange = useCallback((v: string) => {
    setLayout(v as DeckLayout);
  }, []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-[200px] justify-between">
          {layout !== undefined ? deckLayoutObj[layout]?.title : 'Unknown layout'}
          <Eye className="h-4 w-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuRadioGroup value={layout} onValueChange={onValueChange}>
          {deckLayoutArray.map(l => (
            <DropdownMenuRadioItem key={l} value={l}>
              {deckLayoutObj[l].title}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default DeckLayoutSelector;
