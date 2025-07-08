import * as React from 'react';
import { useMatchupCardStatsStore } from './useMatchupCardStatsStore';
import { cn } from '@/lib/utils';
import { useCardList } from '@/api/lists/useCardList.ts';
import CardImage from '@/components/app/global/CardImage.tsx';
import { CardMatchupView, cardMatchupViewArray } from './CardMatchupViewSelector';
import { CardStat, MatchupCardStatsData } from './useMatchupCardStatsTableColumns';
import { MatchupDisplayMode } from '@/components/app/tournaments/TournamentMatchups/types';
import { getWinrateColorClass } from '@/components/app/tournaments/TournamentMatchups/utils/getWinrateColorClass.ts';
import { Badge } from '@/components/ui/badge.tsx';
import CardMatchupDecksDialog from './CardMatchupDecksDialog';

interface CardMatchupOverviewProps {
  className?: string;
  data?: MatchupCardStatsData;
  displayMode?: MatchupDisplayMode;
}

// Map of view values to display names
const viewLabels: Record<CardMatchupView, string> = {
  '1': 'Main deck',
  '2': 'Sideboard',
  'both-decks-together': 'Main + sideboard',
  'both-decks-divided': 'Main + sideboard separated',
};

const CardMatchupOverview: React.FC<CardMatchupOverviewProps> = ({
  className,
  data,
  displayMode = 'winrate',
}) => {
  const { selectedCardId } = useMatchupCardStatsStore();
  const { data: cardList } = useCardList();

  // Get the card data if available
  const card = selectedCardId && cardList ? cardList.cards[selectedCardId] : undefined;

  // Get the default variant ID for the card image
  const defaultVariantId = card?.variants ? Object.keys(card.variants)[0] : undefined;

  // Function to calculate win rate
  const calculateWinRate = (wins: number, total: number) => {
    return total > 0 ? (wins / total) * 100 : 0;
  };

  // Function to render stats for a specific count and view
  const renderStats = (stats: CardStat, count: string, view: CardMatchupView) => {
    // Calculate totals and win rates
    const totalGames = stats.gameWins + stats.gameLosses + stats.gameDraws;
    const totalMatches = stats.matchWins + stats.matchLosses + stats.matchDraws;
    const gameWinRate = calculateWinRate(stats.gameWins, totalGames);
    const matchWinRate = calculateWinRate(stats.matchWins, totalMatches);

    // Determine the value to display based on displayMode
    let value;
    let colorClass;
    let valueClass = 'w-[80px] text-right font-medium';

    switch (displayMode) {
      case 'gameWinLoss':
        value = `${stats.gameWins}/${stats.gameLosses}${stats.gameDraws > 0 ? `/${stats.gameDraws}` : ''}`;
        colorClass = getWinrateColorClass(gameWinRate);
        break;
      case 'gameWinrate':
        value = `${gameWinRate.toFixed(2)}%`;
        colorClass = getWinrateColorClass(gameWinRate);
        break;
      case 'winLoss':
        value = `${stats.matchWins}/${stats.matchLosses}${stats.matchDraws > 0 ? `/${stats.matchDraws}` : ''}`;
        colorClass = getWinrateColorClass(matchWinRate);
        break;
      case 'winrate':
      default:
        value = `${matchWinRate.toFixed(2)}%`;
        colorClass = getWinrateColorClass(matchWinRate);
        break;
    }
    valueClass = cn(valueClass, colorClass);

    return (
      <div key={count} className="py-[2px] border-b hover:bg-accent">
        <div className="grid grid-cols-3 gap-2 text-xs">
          <span className="font-medium">{count}</span>
          <CardMatchupDecksDialog
            trigger={
              <span className="text-muted-foreground text-right px-1 cursor-pointer underline decoration-dotted hover:decoration-solid">
                {stats.total} matches
              </span>
            }
            cardId={selectedCardId || ''}
            cardName={card?.name || ''}
            count={count}
            view={view}
          />
          <Badge className={valueClass}>{value}</Badge>
        </div>
      </div>
    );
  };

  // Function to render a section for a specific view
  const renderSection = (view: CardMatchupView) => {
    const cardStats = selectedCardId && data?.cardStats?.[selectedCardId]?.[view];

    if (!cardStats || Object.keys(cardStats).length === 0) {
      return (
        <p className="text-muted-foreground">No statistics available for this card in this view.</p>
      );
    }

    return (
      <div className="space-y-0">
        {Object.entries(cardStats)
          .sort(([countA], [countB]) => countB.localeCompare(countA)) // Sort by count in descending order
          .map(([count, stats]) => renderStats(stats, count, view))}
      </div>
    );
  };

  return (
    <div className={cn('w-[300px] border rounded-md p-2 flex flex-col gap-2', className)}>
      {selectedCardId && card ? (
        <div className="space-y-2">
          {/* Card Name */}
          <h2 className="text-xl font-bold">{card.name}</h2>

          {/* Card Image */}
          <div className="flex justify-center">
            <CardImage card={card} cardVariantId={defaultVariantId} size="w100" />
          </div>

          {/* Stats Sections */}
          <div className="space-y-4">
            {cardMatchupViewArray.map(view => (
              <div key={view}>
                <h6 className="mb-0">{viewLabels[view]}</h6>
                {renderSection(view)}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-muted-foreground">Select a card from the table to view details</p>
      )}
    </div>
  );
};

export default CardMatchupOverview;
