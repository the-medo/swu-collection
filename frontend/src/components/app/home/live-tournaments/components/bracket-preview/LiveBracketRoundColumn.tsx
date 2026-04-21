import type { LiveTournamentMatchEntry } from '../../liveTournamentTypes.ts';
import { LiveBracketMatch } from './LiveBracketMatch.tsx';

export function LiveBracketRoundColumn({
  roundName,
  matches,
  roundIndex,
  highlightedPlayerId,
  setHighlightedPlayerId,
}: {
  roundName: string;
  matches: (LiveTournamentMatchEntry | null)[];
  roundIndex: number;
  highlightedPlayerId: number | null;
  setHighlightedPlayerId: (playerId: number | null) => void;
}) {
  return (
    <div className="flex w-[350px] flex-col">
      <div className="flex flex-col">
        {matches.map((match, matchIndex) => (
          <LiveBracketMatch
            key={match?.match.id ?? `${roundName}-${matchIndex}`}
            match={match}
            roundIndex={roundIndex}
            highlightedPlayerId={highlightedPlayerId}
            setHighlightedPlayerId={setHighlightedPlayerId}
          />
        ))}
      </div>
    </div>
  );
}
