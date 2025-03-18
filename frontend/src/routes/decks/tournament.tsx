import { createFileRoute } from '@tanstack/react-router';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Link } from '@tanstack/react-router';

export const Route = createFileRoute('/decks/tournament')({
  component: TournamentDecks,
});

function TournamentDecks() {
  return (
    <div className="p-4 space-y-8">
      <h3>Tournament Decks</h3>

      <Alert variant="warning" className="max-w-3xl">
        <AlertCircle className="h-5 w-5" />
        <AlertTitle>Coming Soon!</AlertTitle>
        <AlertDescription>
          The tournament decks feature is currently in planning phase. This page will allow you to
          browse, analyze, and get inspiration from top-performing decks in recent Star Wars:
          Unlimited tournaments.
        </AlertDescription>
      </Alert>

      <div className="space-y-4 mt-8">
        <h4>What to expect:</h4>
        <ul className="list-disc ml-8 space-y-2">
          <li>Winning decklists from official tournaments</li>
          <li>Deck performance statistics and meta analysis</li>
          <li>Filtering by format, tournament type, and date</li>
          <li>Ability to favorite and clone top-performing decks</li>
        </ul>
      </div>

      <div className="flex gap-4 mt-8">
        <Button asChild>
          <Link to="/decks/public">Browse Public Decks</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/decks/your">View Your Decks</Link>
        </Button>
      </div>
    </div>
  );
}
