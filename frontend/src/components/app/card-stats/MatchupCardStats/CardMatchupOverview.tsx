import * as React from 'react';
import { useMatchupCardStatsStore } from './useMatchupCardStatsStore';
import { cn } from '@/lib/utils';
import { useCardList } from '@/api/lists/useCardList.ts';
import CardImage from '@/components/app/global/CardImage.tsx';
import { CardMatchupView } from './CardMatchupViewSelector';
import { MatchupCardStatsData } from './useMatchupCardStatsTableColumns';

interface CardMatchupOverviewProps {
  className?: string;
  data?: MatchupCardStatsData;
  selectedView?: CardMatchupView;
}

const CardMatchupOverview: React.FC<CardMatchupOverviewProps> = ({
  className,
  data,
  selectedView = '1',
}) => {
  const { selectedCardId } = useMatchupCardStatsStore();
  const { data: cardList } = useCardList();

  // Get the card data if available
  const card = selectedCardId && cardList ? cardList.cards[selectedCardId] : undefined;

  // Get the default variant ID for the card image
  const defaultVariantId = card?.variants ? Object.keys(card.variants)[0] : undefined;

  // Get the card stats for the selected card and view
  const cardStats = selectedCardId && data?.cardStats?.[selectedCardId]?.[selectedView];

  // Function to calculate win rate
  const calculateWinRate = (wins: number, total: number) => {
    return total > 0 ? (wins / total) * 100 : 0;
  };

  return (
    <div className={cn('w-[300px] border rounded-md p-4 flex flex-col gap-4', className)}>
      {selectedCardId && card ? (
        <div className="space-y-4">
          {/* Card Name */}
          <h2 className="text-xl font-bold">{card.name}</h2>

          {/* Card Image */}
          <div className="flex justify-center">
            <CardImage card={card} cardVariantId={defaultVariantId} size="w100" />
          </div>

          {/* Stats Sections */}
          {cardStats ? (
            <div className="space-y-4 mt-4">
              {Object.entries(cardStats).map(([count, stats]) => (
                <div key={count} className="border rounded-md p-3">
                  <h5 className="font-medium text-center mb-2">Count: {count}</h5>

                  <div className="space-y-2">
                    {/* Game Stats */}
                    <div className="bg-muted/30 p-2 rounded-md">
                      <h6 className="font-medium">Games</h6>
                      <div className="grid grid-cols-2 gap-1 text-sm">
                        <span>Total:</span>
                        <span className="text-right">
                          {stats.gameWins + stats.gameLosses + stats.gameDraws}
                        </span>
                        <span>Wins:</span>
                        <span className="text-right text-green-500">{stats.gameWins}</span>
                        <span>Losses:</span>
                        <span className="text-right text-red-500">{stats.gameLosses}</span>
                        <span>Draws:</span>
                        <span className="text-right">{stats.gameDraws}</span>
                        <span>Win Rate:</span>
                        <span className="text-right font-medium">
                          {calculateWinRate(
                            stats.gameWins,
                            stats.gameWins + stats.gameLosses + stats.gameDraws,
                          ).toFixed(2)}
                          %
                        </span>
                      </div>
                    </div>

                    {/* Match Stats */}
                    <div className="bg-muted/30 p-2 rounded-md">
                      <h6 className="font-medium">Matches</h6>
                      <div className="grid grid-cols-2 gap-1 text-sm">
                        <span>Total:</span>
                        <span className="text-right">
                          {stats.matchWins + stats.matchLosses + stats.matchDraws}
                        </span>
                        <span>Wins:</span>
                        <span className="text-right text-green-500">{stats.matchWins}</span>
                        <span>Losses:</span>
                        <span className="text-right text-red-500">{stats.matchLosses}</span>
                        <span>Draws:</span>
                        <span className="text-right">{stats.matchDraws}</span>
                        <span>Win Rate:</span>
                        <span className="text-right font-medium">
                          {calculateWinRate(
                            stats.matchWins,
                            stats.matchWins + stats.matchLosses + stats.matchDraws,
                          ).toFixed(2)}
                          %
                        </span>
                      </div>
                    </div>

                    {/* Overall Stats */}
                    <div className="bg-muted/30 p-2 rounded-md">
                      <h6 className="font-medium">Overall</h6>
                      <div className="grid grid-cols-2 gap-1 text-sm">
                        <span>Total Occurrences:</span>
                        <span className="text-right font-medium">{stats.total}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">
              No statistics available for this card in the selected view.
            </p>
          )}
        </div>
      ) : (
        <p className="text-muted-foreground">Select a card from the table to view details</p>
      )}
    </div>
  );
};

export default CardMatchupOverview;
