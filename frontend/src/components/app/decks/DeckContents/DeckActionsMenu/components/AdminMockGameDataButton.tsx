import * as React from 'react';
import { Button } from '@/components/ui/button.tsx';
import { Dices } from 'lucide-react';
import { NavigationMenuItem } from '@/components/ui/navigation-menu.tsx';
import { useKarabastMockGameResultCreate } from '@/api/game-results/useKarabastMockGameResultCreate';

interface AdminMockGameDataButtonProps {
  deckId: string;
  isAdmin: boolean;
}

const AdminMockGameDataButton: React.FC<AdminMockGameDataButtonProps> = ({ deckId, isAdmin }) => {
  const { mutate, isPending } = useKarabastMockGameResultCreate();

  if (!isAdmin) {
    return null;
  }

  return (
    <NavigationMenuItem>
      <Button
        size="iconMedium"
        variant="destructive"
        title="Admin: Mock game data"
        disabled={isPending}
        onClick={() => mutate({ deckId })}
      >
        <Dices className="h-4 w-4" />
      </Button>
    </NavigationMenuItem>
  );
};

export default AdminMockGameDataButton;
