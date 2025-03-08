import { createFileRoute } from '@tanstack/react-router';
import { Button } from '@/components/ui/button.tsx';
import NewDeckDialog from '@/components/app/dialogs/NewDeckDialog/NewDeckDialog.tsx';
import PublicDecks from '@/components/app/decks/PublicDecks/PublicDecks.tsx';

export const Route = createFileRoute('/decks/public')({
  component: PagePublicDecks,
});

function PagePublicDecks() {
  return (
    <div className="p-2">
      <div className="flex flex-row gap-4 items-center justify-between mb-2">
        <h3>Decks</h3>
        <NewDeckDialog trigger={<Button>New deck</Button>} />
      </div>
      <PublicDecks />
    </div>
  );
}
