import { useGetDeckTournament } from '@/api/decks/useGetDeckTournament.ts';
import { useLabel } from '@/components/app/tournaments/TournamentMeta/useLabel.tsx';
import { getDeckLeadersAndBaseKey } from '@/components/app/tournaments/TournamentMeta/tournamentMetaLib.ts';
import { useCardList } from '@/api/lists/useCardList.ts';
import { cn } from '@/lib/utils.ts';
import { Link } from '@tanstack/react-router';
import * as React from 'react';
import { ExternalLink } from 'lucide-react';

interface DeckMatchesProps {
  deckId: string;
  setDeckId?: (id: string) => void;
}

const DeckMatches: React.FC<DeckMatchesProps> = ({ deckId, setDeckId }) => {
  const { data: tournamentData } = useGetDeckTournament(deckId);
  const labelRenderer = useLabel();
  const { data: cardListData } = useCardList();

  if (!tournamentData || !tournamentData.data) return null;

  const tournament = tournamentData?.data.tournament;
  const tournamentDeck = tournamentData?.data.tournamentDeck;
  const playerName = tournamentDeck.meleePlayerUsername;

  return (
    <>
      <table>
        {tournament && (
          <thead>
            <td colSpan={5} className="p-1 font-semibold text-xs bg-primary/10">
              <div className=" flex justify-between">
                <Link
                  to="/tournaments/$tournamentId"
                  params={{ tournamentId: tournament.id }}
                  className="flex gap-1 items-center"
                >
                  <ExternalLink className="size-3" />
                  {tournament.name}
                </Link>
                <span>({tournament.attendance} players)</span>
              </div>
            </td>
          </thead>
        )}
        <thead>
          <td colSpan={5} className="p-1 font-semibold text-xs">
            Player: {playerName} #{tournamentDeck.placement} ({tournamentDeck.recordWin}-
            {tournamentDeck.recordLose}-{tournamentDeck.recordDraw})
          </td>
        </thead>
        {tournamentData?.data.matches.map(d => {
          const isP1 = d.match.p1Username === playerName;
          const isWin =
            (isP1 && d.match.gameWin > d.match.gameLose) ||
            (!isP1 && d.match.gameLose > d.match.gameWin);
          const isDraw = d.match.result === 1;

          return (
            <tr
              className={cn('border', {
                'bg-green-100 dark:bg-green-900': isWin,
                'bg-red-100 dark:bg-red-900': !isWin && !isDraw,
                'hover:underline cursor-pointer': !!setDeckId,
              })}
              onClick={
                d.opponentDeck && setDeckId ? () => setDeckId(d.opponentDeck!.id) : undefined
              }
            >
              <td
                className={cn('font-bold px-1 text-sm w-[40px]', {
                  'text-green-600': isWin,
                  'text-red-500': !isWin && !isDraw,
                })}
              >
                {isP1
                  ? `${d.match.gameWin}-${d.match.gameLose}`
                  : `${d.match.gameLose}-${d.match.gameWin}`}
              </td>
              <td className="text-[10px]">
                <div className="w-[60px] truncate overflow-hidden whitespace-nowrap">
                  {isP1 ? d.match.p2Username : d.match.p1Username}
                </div>
              </td>
              <td className="px-1 w-[200px] text-[12px]">
                {labelRenderer(
                  getDeckLeadersAndBaseKey(d.opponentDeck, cardListData),
                  'leadersAndBase',
                  'compact',
                )}
              </td>
            </tr>
          );
        })}
      </table>
    </>
  );
};

export default DeckMatches;
