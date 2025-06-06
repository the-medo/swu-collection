import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
  BookCopy,
  ClipboardCopy,
  Download,
  FileJson,
  FileText,
  LinkIcon,
  Loader2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast.ts';
import { useGetDeck } from '@/api/decks/useGetDeck.ts';
import { cn } from '@/lib/utils.ts';
import { useDuplicateDeck } from '@/api/decks/useDuplicateDeck.ts';
import { useNavigate } from '@tanstack/react-router';
import { useGetDeckCards } from '@/api/decks/useGetDeckCards.ts';
import { useCardList } from '@/api/lists/useCardList.ts';
import {
  createDeckJsonExport,
  createDeckTextExport,
  downloadAsFile,
} from '../../../../../../server/lib/decks/deckExport.ts';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.tsx';
import DeckImageButton from '@/components/app/decks/DeckContents/DeckImage/DeckImageButton.tsx';
import { usePostDeckFavorite } from '@/api/decks/usePostDeckFavorite';
import { Star } from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import AddToComparerButton from '@/components/app/comparer/SidebarComparer/AddToComparerButton.tsx';
import { ComparerEntryAdditionalData } from '@/components/app/comparer/useComparerStore.ts';
import { useMemo } from 'react';

interface DeckActionsProps {
  deckId: string;
}

const DeckActions: React.FC<DeckActionsProps> = ({ deckId }) => {
  const user = useUser();
  const { toast } = useToast();
  const { data: deckData } = useGetDeck(deckId);
  const { data: deckCardsData } = useGetDeckCards(deckId);
  const { data: cardListData } = useCardList();
  const duplicateMutation = useDuplicateDeck();
  const navigate = useNavigate();
  const favoriteDeckMutation = usePostDeckFavorite(deckId);

  const deckLink = `${window.location.origin}/decks/${deckId}`;

  const isFavorite = !!deckData?.isFavorite;

  const additionalData: ComparerEntryAdditionalData = useMemo(
    () => ({
      title: deckData?.deck.name,
    }),
    [deckData?.deck],
  );

  const handleFavoriteClick = () => {
    if (!user) {
      toast({
        variant: 'warning',
        title: 'Unable to favorite a deck',
        description: 'Please sign in to do this action.',
      });
      return; // User must be logged in to favorite
    }

    favoriteDeckMutation.mutate({ isFavorite: !isFavorite });
  };

  const handleDuplicate = async () => {
    if (!user) {
      toast({
        variant: 'warning',
        title: 'Unable to duplicate a deck',
        description: 'Please sign in to do this action.',
      });
      return; // User must be logged in to favorite
    }

    try {
      const result = await duplicateMutation.mutateAsync(deckId);
      void navigate({ to: `/decks/${result.data.id}` });
    } catch (error) {
      // Error is handled by the mutation
    }
  };

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

  return (
    <Card className="border-0 shadow-none">
      <CardContent className="flex gap-2 items-center p-2 flex-wrap">
        <Button
          variant={isFavorite ? 'default' : 'outline'}
          size="iconMedium"
          onClick={handleFavoriteClick}
          title={isFavorite ? 'Unfavorite this deck' : 'Favorite this deck'}
          disabled={favoriteDeckMutation.isPending}
        >
          {favoriteDeckMutation.isPending ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Star className={isFavorite ? 'fill-current' : ''} />
          )}
        </Button>
        <Button
          size="xs"
          className={cn({
            'opacity-80': !deckData?.deck.public,
          })}
          onClick={() => {
            navigator.clipboard.writeText(deckLink);
            toast({
              title: `Link copied to clipboard`,
            });
          }}
        >
          <LinkIcon className="h-4 w-4 mr-2" />
          Copy link {!deckData?.deck.public && '(private!)'}
        </Button>

        <Button size="xs" onClick={handleDuplicate} disabled={duplicateMutation.isPending}>
          <BookCopy className="h-4 w-4 mr-2" />
          {duplicateMutation.isPending ? 'Duplicating...' : 'Duplicate'}
        </Button>

        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button size="xs">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Download</DropdownMenuLabel>
            <DropdownMenuItem onClick={handleExportJSON}>
              <FileJson className="h-4 w-4 mr-2" />
              Download .json
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportText}>
              <FileText className="h-4 w-4 mr-2" />
              Download .txt
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuLabel>Copy to clipboard</DropdownMenuLabel>
            <DropdownMenuItem onClick={handleCopyJSON}>
              <ClipboardCopy className="h-4 w-4 mr-2" />
              Copy JSON format
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleCopyText}>
              <ClipboardCopy className="h-4 w-4 mr-2" />
              Copy text format
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DeckImageButton deckId={deckId} />

        <AddToComparerButton
          id={deckId}
          dataType="deck"
          additionalData={additionalData}
          size="xs"
        />
      </CardContent>
    </Card>
  );
};

export default DeckActions;
