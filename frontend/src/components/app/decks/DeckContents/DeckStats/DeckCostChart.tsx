import React, { useMemo } from 'react';
import { DeckCardsForLayout } from '@/components/app/decks/DeckContents/DeckCards/deckCardsLib.ts';
import { useCardList } from '@/api/lists/useCardList.ts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface DeckCostChartProps {
  deckCardsForLayout: DeckCardsForLayout;
}

const chartConfig = {
  cost: {
    label: 'Cost',
    color: 'hsl(var(--muted-foreground))',
  },
  count: {
    label: 'Count',
    color: 'hsl(var(--primary))',
  },
};

const DeckCostChart: React.FC<DeckCostChartProps> = ({ deckCardsForLayout }) => {
  const { data: cardListData } = useCardList();
  const { cardsByBoard } = deckCardsForLayout;

  // Only include mainboard cards (board 1)
  const mainboardCards = cardsByBoard[1];

  const costDistribution = useMemo(() => {
    if (!cardListData) return [];

    const costCounts: Record<string, number> = {};

    // Count cards by cost
    mainboardCards.forEach(card => {
      const cardData = cardListData.cards[card.cardId];
      if (!cardData) return;

      const cost = cardData.cost !== null ? cardData.cost.toString() : 'X';
      costCounts[cost] = (costCounts[cost] || 0) + card.quantity;
    });

    // Find the maximum numeric cost
    let maxCost = 0;
    Object.keys(costCounts).forEach(cost => {
      if (cost !== 'X' && parseInt(cost) > maxCost) {
        maxCost = parseInt(cost);
      }
    });

    // Ensure all costs from 0 to maxCost are included
    for (let i = 0; i <= maxCost; i++) {
      if (!costCounts[i.toString()]) {
        costCounts[i.toString()] = 0;
      }
    }

    // Convert to array and sort by cost
    return Object.entries(costCounts)
      .map(([cost, count]) => ({ cost, count }))
      .sort((a, b) => {
        if (a.cost === 'X') return 1;
        if (b.cost === 'X') return -1;
        return parseInt(a.cost) - parseInt(b.cost);
      });
  }, [mainboardCards, cardListData]);

  if (costDistribution.length === 0) {
    return <div>No cost data available</div>;
  }

  return (
    <div className="w-full">
      <ChartContainer config={chartConfig} className="h-[300px]">
        <BarChart data={costDistribution} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="cost" />
          <YAxis />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, name) => {
                  return [value, name === 'count' ? 'Cards' : 'Cost'];
                }}
              />
            }
          />
          <Bar
            dataKey="count"
            name="count"
            fill="var(--color-count)"
            radius={[4, 4, 0, 0]}
            label={{ position: 'top', fill: 'hsl(var(--foreground))' }}
          />
        </BarChart>
      </ChartContainer>
    </div>
  );
};

export default DeckCostChart;
