import * as React from 'react';
import { Button } from '@/components/ui/button.tsx';
import { NavigationMenuItem } from '@/components/ui/navigation-menu.tsx';
import { RefreshCw } from 'lucide-react';
import { useRefreshImportedDeck } from '@/api/decks/useRefreshImportedDeck.ts';
import { useToast } from '@/hooks/use-toast.ts';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog.tsx';
import { useState } from 'react';
import {
  deckBuilderSourceLabels,
  type DeckBuilderSource,
} from '../../../../../../../../types/DeckImport.ts';

interface RefreshImportedDeckButtonProps {
  deckId: string;
  source: DeckBuilderSource;
}

const RefreshImportedDeckButton: React.FC<RefreshImportedDeckButtonProps> = ({
  deckId,
  source,
}) => {
  const refreshImportedDeck = useRefreshImportedDeck();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const sourceName = deckBuilderSourceLabels[source];

  const refresh = () => {
    refreshImportedDeck.mutate(deckId, {
      onSuccess: result => {
        const errors = result.data.errors;
        toast(
          errors.length > 0
            ? {
                variant: 'warning',
                title: 'Deck refreshed with missing cards',
                description: errors.join('; '),
              }
            : { title: `Deck refreshed from ${sourceName}` },
        );
        setOpen(false);
      },
    });
  };

  return (
    <NavigationMenuItem>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            disabled={refreshImportedDeck.isPending}
            aria-label={`Refresh from ${sourceName}`}
            title={`Refresh from ${sourceName}`}
          >
            <RefreshCw
              className={refreshImportedDeck.isPending ? 'h-4 w-4 animate-spin' : 'h-4 w-4'}
            />
            <span className="sr-only">
              {refreshImportedDeck.isPending ? 'Refreshing deck' : `Refresh from ${sourceName}`}
            </span>
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Refresh this deck from {sourceName}?</AlertDialogTitle>
            <AlertDialogDescription>
              This replaces the leader, base, and card list with the latest shared deck. Your title,
              description, format, and visibility are kept, but manual card edits will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={refreshImportedDeck.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={refreshImportedDeck.isPending} onClick={refresh}>
              {refreshImportedDeck.isPending ? 'Refreshing...' : 'Refresh deck'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </NavigationMenuItem>
  );
};

export default RefreshImportedDeckButton;
