import * as React from 'react';
import { Button } from '@/components/ui/button.tsx';
import { Pencil } from 'lucide-react';
import { NavigationMenuItem } from '@/components/ui/navigation-menu.tsx';

interface AdminEditButtonProps {
  deckId: string;
  isAdmin: boolean;
}

const AdminEditButton: React.FC<AdminEditButtonProps> = ({ deckId, isAdmin }) => {
  if (!isAdmin) {
    return null;
  }

  return (
    <NavigationMenuItem>
      <Button
        size="iconMedium"
        variant="destructive"
        title="Edit deck"
        onClick={() => window.open(`/decks/${deckId}/edit`, '_blank')}
      >
        <Pencil className="h-4 w-4" />
      </Button>
    </NavigationMenuItem>
  );
};

export default AdminEditButton;