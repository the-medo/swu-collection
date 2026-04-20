import { Star } from 'lucide-react';
import { useLabel } from '@/components/app/tournaments/TournamentMeta/useLabel.tsx';
import type { LiveTournamentWeekendTournamentEntry } from '../liveTournamentTypes.ts';

export function WinningDeck({ entry }: { entry: LiveTournamentWeekendTournamentEntry }) {
  const labelRenderer = useLabel();
  const deck = entry.winningDeck?.deck;

  if (!deck?.leaderCardId1 || !deck.baseCardId) return null;

  const leaderBaseKey = `${deck.leaderCardId1}|${deck.baseCardId}`;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border bg-background px-3 py-2">
      <Star className="h-4 w-4 text-primary" />
      <span className="text-sm font-medium">Winner</span>
      <div className="min-w-0 text-sm">
        {labelRenderer(leaderBaseKey, 'leadersAndBase', 'compact')}
      </div>
    </div>
  );
}
