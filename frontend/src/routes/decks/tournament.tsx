import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/decks/tournament')({
  component: TournamentDecks,
});

function TournamentDecks() {
  return (
    <div className="p-2">
      <h3>Welcome in tournament decks!</h3>
    </div>
  );
}
