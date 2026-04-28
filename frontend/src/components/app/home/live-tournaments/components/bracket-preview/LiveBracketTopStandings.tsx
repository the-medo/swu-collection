import type { LiveTournamentBracketStanding } from '../../liveTournamentTypes.ts';
import { LiveTournamentPlayerCard } from './LiveTournamentPlayerCard.tsx';

export function LiveBracketTopStandings({
  topStandings,
  highlightedPlayerDisplayName,
  selectedDeckId,
  setHighlightedPlayerDisplayName,
  setSelectedDeckId,
}: {
  topStandings: LiveTournamentBracketStanding[];
  highlightedPlayerDisplayName: string | null;
  selectedDeckId: string | undefined;
  setHighlightedPlayerDisplayName: (playerDisplayName: string | null) => void;
  setSelectedDeckId: (deckId: string | undefined) => void;
}) {
  return (
    <aside className="min-w-0 rounded-md border bg-primary/5 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h5 className="mb-0! text-sm font-semibold">Current top 8</h5>
        {topStandings.length > 0 && (
          <span className="text-xs text-muted-foreground">{topStandings.length} players</span>
        )}
      </div>

      {topStandings.length === 0 ? (
        <div className="rounded-md border border-dashed bg-background/70 p-3 text-sm text-muted-foreground">
          Current standings are not available yet.
        </div>
      ) : (
        <div className="space-y-1.5">
          {topStandings.map(row => {
            const deckId = row.deck?.id;
            const playerDisplayName = row.player.displayName;

            return (
              <LiveTournamentPlayerCard
                key={`${row.standing.roundNumber}-${row.standing.rank}-${playerDisplayName}`}
                playerDisplayName={playerDisplayName}
                tournamentPlayer={row.tournamentPlayer}
                deck={row.deck}
                rank={row.standing.rank}
                matchRecord={row.standing.matchRecord}
                points={row.standing.points}
                isHighlighted={highlightedPlayerDisplayName === playerDisplayName}
                isSelected={selectedDeckId === deckId}
                variant="standing"
                onClick={deckId ? () => setSelectedDeckId(deckId) : undefined}
                onMouseEnter={() => setHighlightedPlayerDisplayName(playerDisplayName)}
                onMouseLeave={() => setHighlightedPlayerDisplayName(null)}
              />
            );
          })}
        </div>
      )}
    </aside>
  );
}
