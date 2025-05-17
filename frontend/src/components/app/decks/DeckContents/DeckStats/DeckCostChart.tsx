import React, { useMemo } from 'react';
import { DeckCardsForLayout } from '@/components/app/decks/DeckContents/DeckCards/deckCardsLib.ts';
import { useCardList } from '@/api/lists/useCardList.ts';
import { ChartContainer } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface DeckCostChartProps {
  deckCardsForLayout: DeckCardsForLayout;
  onCostClick?: (cost: string) => void;
}

// Define colors for each card type (using more subtle colors)
const cardTypeColors: Record<string, string> = {
  Leader: 'hsl(215, 50%, 70%)', // Subtle Blue
  Base: 'hsl(280, 50%, 70%)', // Subtle Purple
  UnitGround: 'hsl(130, 40%, 60%)', // Subtle Green
  UnitSpace: 'hsl(190, 40%, 60%)', // Subtle Teal
  Event: 'hsl(30, 50%, 70%)', // Subtle Orange
  Upgrade: 'hsl(350, 50%, 70%)', // Subtle Red
  Unknown: 'hsl(0, 0%, 80%)', // Light Gray
};

// Create chart config with all card types
const chartConfig = {
  cost: {
    label: 'Cost',
    color: 'hsl(var(--muted-foreground))',
  },
  total: {
    label: 'Total',
    color: 'hsl(var(--primary))',
  },
  Leader: {
    label: 'Leader',
    color: cardTypeColors.Leader,
  },
  Base: {
    label: 'Base',
    color: cardTypeColors.Base,
  },
  UnitGround: {
    label: 'Unit - Ground',
    color: cardTypeColors.UnitGround,
  },
  UnitSpace: {
    label: 'Unit - Space',
    color: cardTypeColors.UnitSpace,
  },
  Event: {
    label: 'Event',
    color: cardTypeColors.Event,
  },
  Upgrade: {
    label: 'Upgrade',
    color: cardTypeColors.Upgrade,
  },
  Unknown: {
    label: 'Unknown',
    color: cardTypeColors.Unknown,
  },
} as const;

const DeckCostChart: React.FC<DeckCostChartProps> = ({ deckCardsForLayout, onCostClick }) => {
  const { data: cardListData } = useCardList();
  const { cardsByBoard } = deckCardsForLayout;

  // Handler for bar click events
  const handleBarClick = (data: any) => {
    if (onCostClick) {
      onCostClick(data.cost);
    }
  };

  // Only include mainboard cards (board 1)
  const mainboardCards = cardsByBoard[1];

  const costDistribution = useMemo(() => {
    if (!cardListData) return [];

    // Initialize data structure to track counts by cost and card type
    interface CostData {
      cost: string;
      total: number;
      Leader: number;
      Base: number;
      UnitGround: number;
      UnitSpace: number;
      Event: number;
      Upgrade: number;
      Unknown: number;
      [key: string]: number | string;
    }

    const costData: Record<string, CostData> = {};

    // Count cards by cost and card type
    mainboardCards.forEach(card => {
      const cardData = cardListData.cards[card.cardId];
      if (!cardData) return;

      const cost = cardData.cost !== null ? cardData.cost.toString() : 'X';

      // Initialize cost entry if it doesn't exist
      if (!costData[cost]) {
        costData[cost] = {
          cost,
          total: 0,
          Leader: 0,
          Base: 0,
          UnitGround: 0,
          UnitSpace: 0,
          Event: 0,
          Upgrade: 0,
          Unknown: 0,
        };
      }

      // Increment total count
      costData[cost].total += card.quantity;

      // Determine card type and increment appropriate counter
      const type = cardData.type;
      if (type === 'Unit') {
        const arena = cardData.arenas[0];
        if (arena === 'Ground') {
          costData[cost].UnitGround += card.quantity;
        } else if (arena === 'Space') {
          costData[cost].UnitSpace += card.quantity;
        } else {
          costData[cost].Unknown += card.quantity;
        }
      } else if (type === 'Leader' || type === 'Base' || type === 'Event' || type === 'Upgrade') {
        costData[cost][type] += card.quantity;
      } else {
        costData[cost].Unknown += card.quantity;
      }
    });

    // Find the maximum numeric cost
    let maxCost = 0;
    Object.keys(costData).forEach(cost => {
      if (cost !== 'X' && parseInt(cost) > maxCost) {
        maxCost = parseInt(cost);
      }
    });

    // Ensure all costs from 0 to maxCost are included
    for (let i = 0; i <= maxCost; i++) {
      const costStr = i.toString();
      if (!costData[costStr]) {
        costData[costStr] = {
          cost: costStr,
          total: 0,
          Leader: 0,
          Base: 0,
          UnitGround: 0,
          UnitSpace: 0,
          Event: 0,
          Upgrade: 0,
          Unknown: 0,
        };
      }
    }

    // Convert to array and sort by cost
    return Object.values(costData).sort((a, b) => {
      if (a.cost === 'X') return 1;
      if (b.cost === 'X') return -1;
      return parseInt(a.cost as string) - parseInt(b.cost as string);
    });
  }, [mainboardCards, cardListData]);

  if (costDistribution.length === 0) {
    return <div>No cost data available</div>;
  }

  // Custom tooltip component to show breakdown by card type
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    // Find the data for this cost
    const costData = costDistribution.find(item => item.cost === label);
    if (!costData) return null;

    // Get card type counts (excluding cost and total)
    const cardTypeCounts = Object.entries(costData)
      .filter(([key]) => key !== 'cost' && key !== 'total' && (costData[key] as number) > 0)
      .sort((a, b) => (b[1] as number) - (a[1] as number)) as [
      keyof typeof chartConfig,
      number | string,
    ][];

    return (
      <div className="bg-card p-3 rounded-md shadow-md border">
        <p className="font-bold text-sm mb-1">Cost: {label}</p>
        <p className="font-semibold text-sm mb-2">Total: {costData.total} cards</p>
        <div className="text-xs space-y-1">
          {cardTypeCounts.map(([type, count]) => (
            <div key={type} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: cardTypeColors[type] }}
              />
              <span>
                {chartConfig[type]?.label}: {count}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="w-[400px]">
      <ChartContainer config={chartConfig} className="h-[350px] w-[350px]">
        <BarChart data={costDistribution} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="cost" />
          <YAxis />
          <Tooltip content={<CustomTooltip />} />
          <Legend verticalAlign="bottom" height={36} wrapperStyle={{ paddingTop: '10px' }} />
          {/* Stacked bars for each card type */}
          <Bar
            dataKey="UnitGround"
            stackId="a"
            fill={cardTypeColors.UnitGround}
            name="Unit - Ground"
            radius={[0, 0, 0, 0]}
            onClick={handleBarClick}
            className="cursor-pointer"
          />
          <Bar
            dataKey="UnitSpace"
            stackId="a"
            fill={cardTypeColors.UnitSpace}
            name="Unit - Space"
            radius={[0, 0, 0, 0]}
            onClick={handleBarClick}
            className="cursor-pointer"
          />
          <Bar
            dataKey="Event"
            stackId="a"
            fill={cardTypeColors.Event}
            name="Event"
            radius={[0, 0, 0, 0]}
            onClick={handleBarClick}
            className="cursor-pointer"
          />
          <Bar
            dataKey="Upgrade"
            stackId="a"
            fill={cardTypeColors.Upgrade}
            name="Upgrade"
            radius={[0, 0, 0, 0]}
            onClick={handleBarClick}
            className="cursor-pointer"
          />
          <Bar
            dataKey="Leader"
            stackId="a"
            fill={cardTypeColors.Leader}
            name="Leader"
            radius={[0, 0, 0, 0]}
            legendType="none"
            onClick={handleBarClick}
            className="cursor-pointer"
          />
          <Bar
            dataKey="Base"
            stackId="a"
            fill={cardTypeColors.Base}
            name="Base"
            radius={[0, 0, 0, 0]}
            legendType="none"
            onClick={handleBarClick}
            className="cursor-pointer"
          />
          <Bar
            dataKey="Unknown"
            stackId="a"
            fill={cardTypeColors.Unknown}
            name="Unknown"
            radius={[4, 4, 0, 0]} // Only round the top corners of the last bar
            legendType="none"
            onClick={handleBarClick}
            className="cursor-pointer"
          />
        </BarChart>
      </ChartContainer>
    </div>
  );
};

export default DeckCostChart;
