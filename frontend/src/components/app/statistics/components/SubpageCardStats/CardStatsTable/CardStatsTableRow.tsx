import * as React from 'react';
import { CardStatTableRow as CardStatTableRowType } from '../cardStatLib.ts';
import { getWinrateColorClass } from '../../../../tournaments/TournamentMatchups/utils/getWinrateColorClass.ts';
import { StatsTableCell } from './CardStatsTableHeader.tsx';
import { useCardList } from '@/api/lists/useCardList.ts';
import DeckCardHoverImage from '@/components/app/decks/DeckContents/DeckCards/DeckLayout/DeckCardHoverImage.tsx';
import CostIcon from '@/components/app/global/icons/CostIcon.tsx';
import AspectIcon from '@/components/app/global/icons/AspectIcon.tsx';
import InfoTooltip from '@/components/app/global/InfoTooltip/InfoTooltip.tsx';
import { ExternalLink } from 'lucide-react';

interface CardStatsTableRowProps {
  row: CardStatTableRowType;
}

const CardStatsTableRow: React.FC<CardStatsTableRowProps> = ({ row }) => {
  const { data: cardList } = useCardList();
  const card = cardList?.cards[row.cardId];

  const renderMetricCells = (total: number, wins: number, winrate: number) => (
    <>
      <StatsTableCell>{total}</StatsTableCell>
      <StatsTableCell>{wins}</StatsTableCell>
      <StatsTableCell className={getWinrateColorClass(winrate)} thickRightBorder>
        {winrate.toFixed(1)}%
      </StatsTableCell>
    </>
  );

  return (
    <tr className="hover:bg-slate-50 dark:hover:bg-slate-900 border-b border-slate-200 dark:border-slate-800 hover:brightness-90">
      <td className="px-4 py-2 font-medium sticky left-0 bg-white dark:bg-slate-950 border-x border-slate-200 dark:border-slate-800 border-r-2 border-r-slate-400 dark:border-r-slate-600 max-w-[250px]">
        {card ? (
          <DeckCardHoverImage card={card}>
            <div className="flex items-center justify-between gap-2 min-w-[200px]">
              <span className="truncate">{card?.name ?? row.cardId}</span>
              <div className="flex gap-1 items-center flex-shrink-0">
                {card?.cost !== undefined && card?.cost !== null && (
                  <CostIcon cost={card.cost} size="xSmall" />
                )}
                {card?.aspects?.map((a, i) => (
                  <AspectIcon key={`${a}${i}`} aspect={a} size="xSmall" />
                ))}
              </div>
            </div>
          </DeckCardHoverImage>
        ) : (
          <div className="flex gap-2 items-center">
            {row.cardId}{' '}
            <InfoTooltip
              tooltip={
                <div className="flex flex-col gap-2">
                  <span>Couldn't pair this ID in Swubase.</span>
                  <a
                    className="flex gap-2 underline"
                    href={`https://starwarsunlimited.com/cards?cid=${row.cardId}`}
                    target="_blank"
                  >
                    Try to open it in official DB <ExternalLink className="size-4" />
                  </a>
                </div>
              }
              className="p-0"
            />
          </div>
        )}
      </td>
      {renderMetricCells(row.included, row.includedInWins, row.includedWinrate)}
      {renderMetricCells(row.drawn, row.drawnInWins, row.drawnWinrate)}
      {renderMetricCells(row.played, row.playedInWins, row.playedWinrate)}
      {renderMetricCells(row.activated, row.activatedInWins, row.activatedWinrate)}
      {renderMetricCells(row.resourced, row.resourcedInWins, row.resourcedWinrate)}
      {renderMetricCells(row.discarded, row.discardedInWins, row.discardedWinrate)}
    </tr>
  );
};

export default CardStatsTableRow;
