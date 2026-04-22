import type { LiveTournamentMatchEntry } from '../../liveTournamentTypes.ts';
import { LiveBracketMatch } from './LiveBracketMatch.tsx';

export function LiveBracketRoundColumn({
  roundName,
  matches,
  roundIndex,
  highlightedPlayerDisplayName,
  setHighlightedPlayerDisplayName,
}: {
  roundName: string;
  matches: (LiveTournamentMatchEntry | null)[];
  roundIndex: number;
  highlightedPlayerDisplayName: string | null;
  setHighlightedPlayerDisplayName: (playerDisplayName: string | null) => void;
}) {
  return (
    <div className="flex w-[350px] flex-col">
      <div className="flex flex-col">
        {matches.map((match, matchIndex) => (
          <LiveBracketMatch
            key={match?.match.id ?? `${roundName}-${matchIndex}`}
            match={match}
            roundIndex={roundIndex}
            highlightedPlayerDisplayName={highlightedPlayerDisplayName}
            setHighlightedPlayerDisplayName={setHighlightedPlayerDisplayName}
          />
        ))}
      </div>
    </div>
  );
}
