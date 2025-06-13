import * as React from 'react';
import CardImage from '@/components/app/global/CardImage.tsx';
import { useCardList } from '@/api/lists/useCardList.ts';
import { selectDefaultVariant } from '../../../../../../../../server/lib/cards/selectDefaultVariant.ts';
import { useMemo } from 'react';
import { TournamentGroupWithMeta } from '../../../../../../../../types/TournamentGroup.ts';
import { useLabel } from '@/components/app/tournaments/TournamentMeta/useLabel.tsx';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip.tsx';
import UnusualChampionTooltip from './UnusualChampionTooltip.tsx';

interface UnusualChampionsProps {
  tournamentGroups: TournamentGroupWithMeta[];
}

const UnusualChampions: React.FC<UnusualChampionsProps> = ({ tournamentGroups }) => {
  const { data: cardListData } = useCardList();
  const label = useLabel();

  // Calculate statistics for unusual champions
  const { unusualChampions, totalAttendance } = useMemo(() => {
    // Calculate total attendance across all tournaments
    const totalAttendance = tournamentGroups
      .flatMap(group => group.tournaments.map(t => t.tournament.attendance))
      .reduce((sum, attendance) => sum + attendance, 0);

    // Combine leaderBase data from all tournament groups
    const allLeaders = tournamentGroups.flatMap(group => group.leaderBase || []);

    // Group by leaderCardId to get total occurrences for each leader
    const leaderStats = allLeaders.reduce(
      (acc, leader) => {
        if (!acc[leader.leaderCardId]) {
          acc[leader.leaderCardId] = {
            leaderCardId: leader.leaderCardId,
            winner: 0,
            total: 0,
          };
        }
        acc[leader.leaderCardId].winner += leader.winner;
        acc[leader.leaderCardId].total += leader.total;
        return acc;
      },
      {} as Record<string, { leaderCardId: string; winner: number; total: number }>,
    );

    // Count total champions (leaders that won at least one tournament)
    const totalChampions = Object.values(leaderStats).filter(leader => leader.winner > 0).length;

    // Convert to array, filter winners, and sort by rarity
    const unusualChampions = Object.values(leaderStats)
      .filter(leader => leader.winner > 0) // Only include leaders that won at least one tournament
      .sort((a, b) => a.total - b.total) // Sort by total occurrences (ascending)
      .slice(0, 3); // Take the top 3 rarest

    return { unusualChampions, totalAttendance, totalChampions };
  }, [tournamentGroups]);

  return (
    <div className="border-b pb-4 px-4">
      <h4 className="text-md font-medium">Unusual PQ champions</h4>
      <div className="flex flex-wrap justify-around gap-2">
        {unusualChampions.map(champion => {
          const card = cardListData?.cards?.[champion.leaderCardId];
          const cardVariantId = card ? selectDefaultVariant(card) : undefined;

          return (
            <TooltipProvider key={champion.leaderCardId}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex flex-col items-center cursor-pointer hover:opacity-90">
                    <CardImage
                      card={card}
                      cardVariantId={cardVariantId}
                      size="w75"
                      backSideButton={false}
                      forceHorizontal={true}
                    />
                    <span className="text-xs mt-1">
                      {label(champion.leaderCardId, 'leaders', 'compact')}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="w-80">
                  <UnusualChampionTooltip
                    champion={champion}
                    totalAttendance={totalAttendance}
                    label={label}
                    tournamentGroups={tournamentGroups}
                  />
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    </div>
  );
};

export default UnusualChampions;
