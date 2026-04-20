import type { BracketRound } from '../liveTournamentUtils.ts';

export function BracketPreview({ rounds }: { rounds: BracketRound[] }) {
  if (rounds.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="text-xs font-medium uppercase text-muted-foreground">Top cut</div>
      <div className="grid gap-2">
        {rounds.map(round => (
          <div key={round.roundName} className="rounded-md border bg-background p-2">
            <div className="mb-2 text-sm font-medium">{round.roundName}</div>
            <div className="space-y-1 text-xs">
              {round.matches.map(match => {
                const score =
                  match.match.player1GameWin !== null && match.match.player2GameWin !== null
                    ? `${match.match.player1GameWin}-${match.match.player2GameWin}`
                    : 'vs';

                return (
                  <div key={match.match.id} className="flex items-center justify-between gap-2">
                    <span className="min-w-0 flex-1 truncate">
                      {match.player1?.displayName ?? `Player ${match.match.playerId1}`}
                    </span>
                    <span className="shrink-0 text-muted-foreground">{score}</span>
                    <span className="min-w-0 flex-1 truncate text-right">
                      {match.player2?.displayName ??
                        (match.match.playerId2 ? `Player ${match.match.playerId2}` : 'Bye')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
