import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card.tsx';
import { Button } from '@/components/ui/button.tsx';
import { BookCopy, LinkIcon, ScrollText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast.ts';
import { useGetDeck } from '@/api/decks/useGetDeck.ts';
import { cn } from '@/lib/utils.ts';
import { useDuplicateDeck } from '@/api/decks/useDuplicateDeck.ts';
import { useNavigate } from '@tanstack/react-router';

interface DeckActionsProps {
  deckId: string;
}

const DeckActions: React.FC<DeckActionsProps> = ({ deckId }) => {
  const { toast } = useToast();
  const { data } = useGetDeck(deckId);
  const duplicateMutation = useDuplicateDeck();
  const navigate = useNavigate();

  const deckLink = `${window.location.origin}/decks/${deckId}`;

  const handleDuplicate = async () => {
    try {
      const result = await duplicateMutation.mutateAsync(deckId);
      void navigate({ to: `/decks/${result.data.id}` });
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  return (
    <Card className="border-0 shadow-none">
      <CardContent className="flex gap-2 items-center p-2 flex-wrap">
        <Button
          size="sm"
          className={cn({
            'opacity-80': !data?.deck.public,
          })}
          onClick={() => {
            navigator.clipboard.writeText(deckLink);
            toast({
              title: `Link copied to clipboard`,
            });
          }}
        >
          <LinkIcon className="h-4 w-4 mr-2" />
          Copy link {!data?.deck.public && '(private!)'}
        </Button>

        <Button size="sm" onClick={handleDuplicate} disabled={duplicateMutation.isPending}>
          <BookCopy className="h-4 w-4 mr-2" />
          {duplicateMutation.isPending ? 'Duplicating...' : 'Duplicate'}
        </Button>

        <Button size="sm" disabled onClick={() => {}}>
          <ScrollText className="h-4 w-4 mr-2" />
          Compare with other deck
        </Button>
      </CardContent>
    </Card>
  );
};

export default DeckActions;
