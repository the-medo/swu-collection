import * as React from 'react';
import { Button } from '@/components/ui/button.tsx';
import { Loader2, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast.ts';
import { useUser } from '@/hooks/useUser.ts';
import { usePostDeckFavorite } from '@/api/decks/usePostDeckFavorite.ts';
import { NavigationMenuItem } from '@/components/ui/navigation-menu.tsx';

interface FavoriteButtonProps {
  deckId: string;
  isFavorite: boolean;
}

const FavoriteButton: React.FC<FavoriteButtonProps> = ({ deckId, isFavorite }) => {
  const user = useUser();
  const { toast } = useToast();
  const favoriteDeckMutation = usePostDeckFavorite(deckId);

  const handleFavoriteClick = () => {
    if (!user) {
      toast({
        variant: 'warning',
        title: 'Unable to favorite a deck',
        description: 'Please sign in to do this action.',
      });
      return;
    }

    favoriteDeckMutation.mutate({ isFavorite: !isFavorite });
  };

  return (
    <NavigationMenuItem>
      <Button
        variant={isFavorite ? 'default' : 'outline'}
        size="icon"
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
    </NavigationMenuItem>
  );
};

export default FavoriteButton;