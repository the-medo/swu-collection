import { useMemo, useState } from 'react';
import type { LiveTournamentMatchEntry } from '../../liveTournamentTypes.ts';
import {
  type BracketRound,
  topEightBracketMatchCountByRound,
  topEightBracketRoundOrder,
} from '../../liveTournamentUtils.ts';
import { LiveBracketRoundColumn } from './LiveBracketRoundColumn.tsx';

type DisplayRound = {
  roundName: (typeof topEightBracketRoundOrder)[number];
  matches: (LiveTournamentMatchEntry | null)[];
};

function findMatchContainingPlayer(
  matches: LiveTournamentMatchEntry[],
  playerDisplayName: string | null | undefined,
  usedMatchIds: Set<string>,
) {
  if (!playerDisplayName) return null;

  return (
    matches.find(
      match =>
        !usedMatchIds.has(match.match.id) &&
        (match.match.playerDisplayName1 === playerDisplayName ||
          match.match.playerDisplayName2 === playerDisplayName),
    ) ?? null
  );
}

function pushRemainingMatches(
  orderedMatches: (LiveTournamentMatchEntry | null)[],
  sourceMatches: LiveTournamentMatchEntry[],
  usedMatchIds: Set<string>,
) {
  sourceMatches.forEach(match => {
    if (usedMatchIds.has(match.match.id)) return;

    const emptyIndex = orderedMatches.findIndex(item => item === null);
    if (emptyIndex === -1) return;

    orderedMatches[emptyIndex] = match;
    usedMatchIds.add(match.match.id);
  });
}

function orderSemifinals(
  matches: LiveTournamentMatchEntry[],
  finalMatch: LiveTournamentMatchEntry | null,
) {
  const orderedMatches: (LiveTournamentMatchEntry | null)[] = [null, null];
  const usedMatchIds = new Set<string>();

  if (finalMatch) {
    const firstMatch = findMatchContainingPlayer(
      matches,
      finalMatch.match.playerDisplayName1,
      usedMatchIds,
    );
    if (firstMatch) {
      orderedMatches[0] = firstMatch;
      usedMatchIds.add(firstMatch.match.id);
    }

    const secondMatch = findMatchContainingPlayer(
      matches,
      finalMatch.match.playerDisplayName2,
      usedMatchIds,
    );
    if (secondMatch) {
      orderedMatches[1] = secondMatch;
      usedMatchIds.add(secondMatch.match.id);
    }
  }

  pushRemainingMatches(orderedMatches, matches, usedMatchIds);
  return orderedMatches;
}

function orderQuarterfinals(
  matches: LiveTournamentMatchEntry[],
  semifinals: (LiveTournamentMatchEntry | null)[],
) {
  const orderedMatches: (LiveTournamentMatchEntry | null)[] = [null, null, null, null];
  const usedMatchIds = new Set<string>();

  semifinals.forEach((semifinal, semifinalIndex) => {
    if (!semifinal) return;

    const slotStart = semifinalIndex * 2;
    const firstMatch = findMatchContainingPlayer(
      matches,
      semifinal.match.playerDisplayName1,
      usedMatchIds,
    );
    if (firstMatch) {
      orderedMatches[slotStart] = firstMatch;
      usedMatchIds.add(firstMatch.match.id);
    }

    const secondMatch = findMatchContainingPlayer(
      matches,
      semifinal.match.playerDisplayName2,
      usedMatchIds,
    );
    if (secondMatch) {
      orderedMatches[slotStart + 1] = secondMatch;
      usedMatchIds.add(secondMatch.match.id);
    }
  });

  pushRemainingMatches(orderedMatches, matches, usedMatchIds);
  return orderedMatches;
}

function buildDisplayRounds(rounds: BracketRound[]): DisplayRound[] {
  const matchesByRoundName = new Map(rounds.map(round => [round.roundName, round.matches]));
  const finalMatch = matchesByRoundName.get('Finals')?.[0] ?? null;
  const semifinalMatches = orderSemifinals(matchesByRoundName.get('Semifinals') ?? [], finalMatch);
  const quarterfinalMatches = orderQuarterfinals(
    matchesByRoundName.get('Quarterfinals') ?? [],
    semifinalMatches,
  );

  return topEightBracketRoundOrder.map(roundName => ({
    roundName,
    matches:
      roundName === 'Quarterfinals'
        ? quarterfinalMatches.slice(0, topEightBracketMatchCountByRound.Quarterfinals)
        : roundName === 'Semifinals'
          ? semifinalMatches.slice(0, topEightBracketMatchCountByRound.Semifinals)
          : [finalMatch].slice(0, topEightBracketMatchCountByRound.Finals),
  }));
}

export function LiveBracketRounds({ rounds }: { rounds: BracketRound[] }) {
  const [highlightedPlayerDisplayName, setHighlightedPlayerDisplayName] = useState<string | null>(
    null,
  );
  const displayRounds = useMemo(() => buildDisplayRounds(rounds), [rounds]);

  return (
    <div className="pb-1 overflow-x-auto">
      <div className="mx-auto min-w-max flex gap-8">
        {displayRounds.map((round, roundIndex) => (
          <LiveBracketRoundColumn
            key={round.roundName}
            roundName={round.roundName}
            matches={round.matches}
            roundIndex={roundIndex}
            highlightedPlayerDisplayName={highlightedPlayerDisplayName}
            setHighlightedPlayerDisplayName={setHighlightedPlayerDisplayName}
          />
        ))}
      </div>
    </div>
  );
}
