import * as React from 'react';
import { NavigationMenuLink } from '@/components/ui/navigation-menu.tsx';
import {
  Check,
  X,
  FileJson,
  FileText,
  ClipboardCopy,
  Scale,
  BookCopy,
  Loader2,
} from 'lucide-react';
import { useGetUserSetting } from '@/api/user/useGetUserSetting.ts';
import { useSetUserSetting } from '@/api/user/useSetUserSetting.ts';
import { cn } from '@/lib/utils.ts';
import { useUser } from '@/hooks/useUser.ts';
import { useMemo } from 'react';
import { useGetDeck } from '@/api/decks/useGetDeck.ts';
import { useGetDeckCards } from '@/api/decks/useGetDeckCards.ts';
import { useCardList } from '@/api/lists/useCardList.ts';
import { ComparerEntryAdditionalData } from '@/components/app/comparer/useComparerStore.ts';
import { useToast } from '@/hooks/use-toast.ts';
import { useDuplicateDeck } from '@/api/decks/useDuplicateDeck.ts';
import { useNavigate } from '@tanstack/react-router';
import {
  useComparerStore,
  useComparerStoreActions,
} from '@/components/app/comparer/useComparerStore.ts';
import {
  createDeckJsonExport,
  createDeckTextExport,
  downloadAsFile,
} from '../../../../../../../../../server/lib/decks/deckExport.ts';

interface DeckMenuContentProps {
  deckId: string;
}

const DeckMenuContent: React.FC<DeckMenuContentProps> = ({ deckId }) => {
  const user = useUser();
  const { toast } = useToast();

  // User setting: display collection info
  const { data: collectionInfoInDecks } = useGetUserSetting('collectionInfoInDecks');
  const { mutate: setCollectionInfoInDecks } = useSetUserSetting('collectionInfoInDecks');
  const toggleCollectionInfo = () =>
    user ? setCollectionInfoInDecks(!collectionInfoInDecks) : void 0;

  // Data for items moved from compact menu
  const { data: deckData } = useGetDeck(deckId);
  const { data: deckCardsData } = useGetDeckCards(deckId);
  const { data: cardListData } = useCardList();

  const additionalData: ComparerEntryAdditionalData = useMemo(
    () => ({
      title: deckData?.deck.name,
    }),
    [deckData?.deck],
  );

  const isLimited = !!deckData?.deck.cardPoolId;

  // Export handlers (moved from ExportOptionsMenu)
  const handleExportJSON = () => {
    if (!deckData || !deckCardsData || !cardListData) {
      toast({
        variant: 'destructive',
        title: 'Unable to export deck',
        description: 'Required data is not available. Please try again later.',
      });
      return;
    }
    const jsonData = createDeckJsonExport(
      deckData.deck,
      deckCardsData.data,
      deckData.user,
      cardListData.cards,
    );
    const jsonString = JSON.stringify(jsonData, null, 2);
    const safeFileName = deckData.deck.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    downloadAsFile(jsonString, `${safeFileName}.json`, 'application/json');
    toast({
      title: 'Deck exported as JSON',
      description: `${deckData.deck.name} was exported successfully.`,
    });
  };

  const handleExportText = () => {
    if (!deckData || !deckCardsData || !cardListData) {
      toast({
        variant: 'destructive',
        title: 'Unable to export deck',
        description: 'Required data is not available. Please try again later.',
      });
      return;
    }
    const textData = createDeckTextExport(deckData.deck, deckCardsData.data, cardListData.cards);
    const safeFileName = deckData.deck.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    downloadAsFile(textData, `${safeFileName}.txt`, 'text/plain');
    toast({
      title: 'Deck exported as text',
      description: `${deckData.deck.name} was exported successfully.`,
    });
  };

  const handleCopyJSON = () => {
    if (!deckData || !deckCardsData || !cardListData) {
      toast({
        variant: 'destructive',
        title: 'Unable to copy deck',
        description: 'Required data is not available. Please try again later.',
      });
      return;
    }
    const jsonData = createDeckJsonExport(
      deckData.deck,
      deckCardsData.data,
      deckData.user,
      cardListData.cards,
    );
    const jsonString = JSON.stringify(jsonData, null, 2);
    navigator.clipboard.writeText(jsonString);
    toast({
      title: 'JSON copied to clipboard',
      description: `${deckData.deck.name} was copied in JSON format.`,
    });
  };

  const handleCopyText = () => {
    if (!deckData || !deckCardsData || !cardListData) {
      toast({
        variant: 'destructive',
        title: 'Unable to copy deck',
        description: 'Required data is not available. Please try again later.',
      });
      return;
    }
    const textData = createDeckTextExport(deckData.deck, deckCardsData.data, cardListData.cards);
    navigator.clipboard.writeText(textData);
    toast({
      title: 'Text copied to clipboard',
      description: `${deckData.deck.name} was copied in text format.`,
    });
  };

  // Comparer handlers (moved from AddToComparerButton via ComparerButton)
  const { entries } = useComparerStore();
  const { addComparerEntry, removeComparerEntry } = useComparerStoreActions();
  const isInComparer = entries.some(entry => entry.id === deckId);
  const handleComparerToggle = () => {
    if (isInComparer) {
      removeComparerEntry(deckId);
    } else {
      addComparerEntry({ id: deckId, dataType: 'deck', additionalData });
    }
  };

  // Duplicate handler (moved from DuplicateButton)
  const duplicateMutation = useDuplicateDeck();
  const navigate = useNavigate();
  const handleDuplicate = async () => {
    if (!user) {
      toast({
        variant: 'warning',
        title: 'Unable to duplicate a deck',
        description: 'Please sign in to do this action.',
      });
      return;
    }
    try {
      const result = await duplicateMutation.mutateAsync(deckId);
      const target = isLimited ? `/limited/deck/${result.data.id}` : `/decks/${result.data.id}`;
      void navigate({ to: target });
    } catch {
      // handled by mutation
    }
  };

  return (
    <div className="p-2 grid grid-cols-1 gap-4 w-[260px]">
      <div className="col-span-1 grid grid-cols-1 gap-1">
        {/* Display collection info toggle */}
        <li
          onClick={toggleCollectionInfo}
          className={cn(
            'rounded hover:bg-accent hover:text-accent-foreground p-2 cursor-pointer',
            collectionInfoInDecks && 'bg-accent/50 text-accent-foreground',
            !user && 'opacity-50 cursor-not-allowed',
          )}
        >
          <NavigationMenuLink asChild>
            <div className="text-sm leading-none font-medium flex items-center justify-between">
              Display collection info
              {collectionInfoInDecks ? (
                <Check className="h-4 w-4 ml-2" />
              ) : (
                <X className="h-4 w-4 ml-2" />
              )}
            </div>
          </NavigationMenuLink>
        </li>

        {/* Duplicate deck */}
        <li
          onClick={duplicateMutation.isPending ? undefined : handleDuplicate}
          className={cn(
            'rounded hover:bg-accent hover:text-accent-foreground p-2 cursor-pointer',
            duplicateMutation.isPending && 'opacity-50 cursor-not-allowed',
          )}
          title={user ? 'Duplicate deck' : 'Sign in to duplicate'}
        >
          <NavigationMenuLink asChild>
            <div className="text-sm leading-none font-medium flex items-center">
              {duplicateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <BookCopy className="h-4 w-4 mr-2" />
              )}
              {duplicateMutation.isPending ? 'Duplicating...' : 'Duplicate'}
            </div>
          </NavigationMenuLink>
        </li>

        {/* Add/Remove to comparer */}
        <li
          onClick={handleComparerToggle}
          className="rounded hover:bg-accent hover:text-accent-foreground p-2 cursor-pointer"
        >
          <NavigationMenuLink asChild>
            <div className="text-sm leading-none font-medium flex items-center">
              <Scale className="h-4 w-4 mr-2" />
              {isInComparer ? 'Remove from comparer' : 'Add to comparer'}
            </div>
          </NavigationMenuLink>
        </li>

        <hr />
        {/* Export options (flattened) */}
        <li
          onClick={handleExportJSON}
          className="rounded hover:bg-accent hover:text-accent-foreground p-2 cursor-pointer"
        >
          <NavigationMenuLink asChild>
            <div className="text-sm leading-none font-medium flex items-center">
              <FileJson className="h-4 w-4 mr-2" /> Download .json
            </div>
          </NavigationMenuLink>
        </li>
        <li
          onClick={handleExportText}
          className="rounded hover:bg-accent hover:text-accent-foreground p-2 cursor-pointer"
        >
          <NavigationMenuLink asChild>
            <div className="text-sm leading-none font-medium flex items-center">
              <FileText className="h-4 w-4 mr-2" /> Download .txt
            </div>
          </NavigationMenuLink>
        </li>
        <li
          onClick={handleCopyJSON}
          className="rounded hover:bg-accent hover:text-accent-foreground p-2 cursor-pointer"
        >
          <NavigationMenuLink asChild>
            <div className="text-sm leading-none font-medium flex items-center">
              <ClipboardCopy className="h-4 w-4 mr-2" /> Copy JSON
            </div>
          </NavigationMenuLink>
        </li>
        <li
          onClick={handleCopyText}
          className="rounded hover:bg-accent hover:text-accent-foreground p-2 cursor-pointer"
        >
          <NavigationMenuLink asChild>
            <div className="text-sm leading-none font-medium flex items-center">
              <ClipboardCopy className="h-4 w-4 mr-2" /> Copy text
            </div>
          </NavigationMenuLink>
        </li>
      </div>
    </div>
  );
};

export default DeckMenuContent;
