import type { LiveTournamentMatchEntry } from '../../liveTournamentTypes.ts';
import type { LiveTournamentBracketDeckSummary } from '../../liveTournamentTypes.ts';
import { LiveTournamentPlayerCard } from './LiveTournamentPlayerCard.tsx';

type MatchPlayer = LiveTournamentMatchEntry['player1'] | LiveTournamentMatchEntry['player2'];
type MatchTournamentPlayer =
  | LiveTournamentMatchEntry['tournamentPlayer1']
  | LiveTournamentMatchEntry['tournamentPlayer2'];

export function LiveBracketPlayer({
  player,
  tournamentPlayer,
  deck,
  gameWins,
  isWinner,
  isLoser,
  isHighlighted,
  isSelected,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: {
  player: MatchPlayer;
  tournamentPlayer: MatchTournamentPlayer;
  deck: LiveTournamentBracketDeckSummary | null;
  gameWins: number | null;
  isWinner: boolean;
  isLoser: boolean;
  isHighlighted: boolean;
  isSelected: boolean;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  return (
    <LiveTournamentPlayerCard
      playerDisplayName={player?.displayName}
      tournamentPlayer={tournamentPlayer}
      deck={deck}
      gameWins={gameWins}
      isWinner={isWinner}
      isLoser={isLoser}
      isHighlighted={isHighlighted}
      isSelected={isSelected}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    />
  );
}
