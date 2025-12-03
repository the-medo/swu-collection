import * as React from 'react';
import { Button } from '@/components/ui/button.tsx';
import { BookCopy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast.ts';
import { useUser } from '@/hooks/useUser.ts';
import { useDuplicateDeck } from '@/api/decks/useDuplicateDeck.ts';
import { useNavigate } from '@tanstack/react-router';
import { NavigationMenuItem } from '@/components/ui/navigation-menu.tsx';

interface DuplicateButtonProps {
  deckId: string;
  isLimited?: boolean; // if true, navigate to limited deck route after duplication
}

const DuplicateButton: React.FC<DuplicateButtonProps> = ({ deckId, isLimited = false }) => {
  const user = useUser();
  const { toast } = useToast();
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
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  return (
    <NavigationMenuItem>
      <Button
        variant="outline"
        size="default"
        onClick={handleDuplicate}
        disabled={duplicateMutation.isPending}
      >
        <BookCopy className="h-4 w-4 mr-2" />
        {duplicateMutation.isPending ? 'Duplicating...' : 'Duplicate'}
      </Button>
    </NavigationMenuItem>
  );
};

export default DuplicateButton;
