import { useMemo } from 'react';
import type {
  LiveTournamentBracketRound,
  LiveTournamentBracketStanding,
  LiveTournamentMatchEntry,
} from '../../liveTournamentTypes.ts';
import { getLiveMatchWinnerSide } from '../../liveTournamentUtils.ts';
import { LiveTournamentPlayerCard } from './LiveTournamentPlayerCard.tsx';

type StandingGroup = {
  label: string;
  standings: LiveTournamentBracketStanding[];
};

const roundOrder = ['Finals', 'Semifinals', 'Quarterfinals'] as const;

function getRound(rounds: LiveTournamentBracketRound[], roundName: string) {
  return rounds.find(round => round.roundName === roundName) ?? null;
}

function getMatchPlayers(match: LiveTournamentMatchEntry | null | undefined) {
  return [match?.player1?.displayName, match?.player2?.displayName].filter(
    (displayName): displayName is string => !!displayName,
  );
}

function getWinnerName(match: LiveTournamentMatchEntry | null | undefined) {
  if (!match) return null;

  const winnerSide = getLiveMatchWinnerSide(match);
  if (winnerSide === 'player1') return match.player1.displayName;
  if (winnerSide === 'player2') return match.player2?.displayName ?? null;

  return null;
}

function getLoserName(match: LiveTournamentMatchEntry | null | undefined) {
  if (!match) return null;

  const winnerSide = getLiveMatchWinnerSide(match);
  if (winnerSide === 'player1') return match.player2?.displayName ?? null;
  if (winnerSide === 'player2') return match.player1.displayName;

  return null;
}

function buildStandingGroups(
  topStandings: LiveTournamentBracketStanding[],
  rounds: LiveTournamentBracketRound[],
): StandingGroup[] {
  const standingByPlayer = new Map(
    topStandings.map(standing => [standing.player.displayName, standing] as const),
  );
  const remaining = new Map(standingByPlayer);
  const groups: StandingGroup[] = [];

  const takeStandings = (playerNames: (string | null | undefined)[]) => {
    const result: LiveTournamentBracketStanding[] = [];

    for (const playerName of playerNames) {
      if (!playerName) continue;

      const standing = remaining.get(playerName);
      if (!standing) continue;

      result.push(standing);
      remaining.delete(playerName);
    }

    return result;
  };

  const pushGroup = (label: string, playerNames: (string | null | undefined)[]) => {
    const standings = takeStandings(playerNames);
    if (standings.length > 0) groups.push({ label, standings });
  };

  const finals = getRound(rounds, 'Finals');
  const semifinals = getRound(rounds, 'Semifinals');
  const quarterfinals = getRound(rounds, 'Quarterfinals');
  const finalMatch = finals?.matches[0] ?? null;
  const finalWinner = getWinnerName(finalMatch);
  const finalLoser = getLoserName(finalMatch);
  const semifinalWinners = semifinals?.matches.map(getWinnerName).filter(Boolean) ?? [];
  const semifinalLosers = semifinals?.matches.map(getLoserName).filter(Boolean) ?? [];
  const quarterfinalWinners = quarterfinals?.matches.map(getWinnerName).filter(Boolean) ?? [];
  const quarterfinalLosers = quarterfinals?.matches.map(getLoserName).filter(Boolean) ?? [];

  if (finalWinner) {
    pushGroup('Champion', [finalWinner]);
    pushGroup('Finalist', [finalLoser]);
  } else if (finalMatch) {
    pushGroup('Top 2', getMatchPlayers(finalMatch));
  } else if (semifinalWinners.length > 0) {
    pushGroup('Top 2', semifinalWinners);
  }

  if (semifinalLosers.length > 0) {
    pushGroup('3rd-4th', semifinalLosers);
  } else if (!finalWinner && semifinals?.matches.length) {
    pushGroup('Top 4', semifinals.matches.flatMap(getMatchPlayers));
  } else if (quarterfinalWinners.length > 0) {
    pushGroup('Top 4', quarterfinalWinners);
  }

  pushGroup('5th-8th', quarterfinalLosers);

  for (const roundName of roundOrder) {
    const round = getRound(rounds, roundName);
    if (!round) continue;

    pushGroup(
      roundName === 'Quarterfinals' ? 'Top 8' : roundName === 'Semifinals' ? 'Top 4' : 'Top 2',
      round.matches.flatMap(getMatchPlayers),
    );
  }

  const leftover = topStandings.filter(standing => remaining.has(standing.player.displayName));
  if (leftover.length > 0) groups.push({ label: 'Top 8', standings: leftover });

  return groups;
}

export function LiveBracketTopStandings({
  topStandings,
  rounds,
  highlightedPlayerDisplayName,
  selectedDeckId,
  setHighlightedPlayerDisplayName,
  setSelectedDeckId,
}: {
  topStandings: LiveTournamentBracketStanding[];
  rounds: LiveTournamentBracketRound[];
  highlightedPlayerDisplayName: string | null;
  selectedDeckId: string | undefined;
  setHighlightedPlayerDisplayName: (playerDisplayName: string | null) => void;
  setSelectedDeckId: (deckId: string | undefined) => void;
}) {
  const standingGroups = useMemo(
    () => buildStandingGroups(topStandings, rounds),
    [topStandings, rounds],
  );

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
        <div className="space-y-3">
          {standingGroups.map((group, groupIndex) => (
            <section key={`${group.label}-${groupIndex}`} className="space-y-1.5">
              <h6 className="mb-0! text-xs font-semibold text-muted-foreground">{group.label}</h6>
              {group.standings.map(row => {
                const deckId = row.deck?.id;
                const playerDisplayName = row.player.displayName;

                return (
                  <LiveTournamentPlayerCard
                    key={`${group.label}-${row.standing.roundNumber}-${row.standing.rank}-${playerDisplayName}`}
                    playerDisplayName={playerDisplayName}
                    tournamentPlayer={row.tournamentPlayer}
                    deck={row.deck}
                    isHighlighted={highlightedPlayerDisplayName === playerDisplayName}
                    isSelected={selectedDeckId === deckId}
                    variant="standing"
                    onClick={deckId ? () => setSelectedDeckId(deckId) : undefined}
                    onMouseEnter={() => setHighlightedPlayerDisplayName(playerDisplayName)}
                    onMouseLeave={() => setHighlightedPlayerDisplayName(null)}
                  />
                );
              })}
            </section>
          ))}
        </div>
      )}
    </aside>
  );
}
