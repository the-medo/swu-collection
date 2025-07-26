import React, { useMemo } from 'react';
import { ResponsivePie } from '@nivo/pie';
import { DeckCardsForLayout } from '@/components/app/decks/DeckContents/DeckCards/deckCardsLib.ts';
import { useCardList } from '@/api/lists/useCardList.ts';
import { SwuAspect } from '../../../../../../../types/enums.ts';
import { useTheme } from '@/components/theme-provider.tsx';
import { aspectColors } from '../../../../../../../shared/lib/aspectColors.ts';

interface DeckAspectChartProps {
  deckCardsForLayout: DeckCardsForLayout;
  onAspectClick?: (aspect: string) => void;
}

const DeckAspectChart: React.FC<DeckAspectChartProps> = ({ deckCardsForLayout, onAspectClick }) => {
  const { data: cardListData } = useCardList();
  const { theme } = useTheme();
  const { cardsByBoard } = deckCardsForLayout;

  // Handler for pie section click events
  const handlePieClick = (data: any) => {
    if (onAspectClick) {
      onAspectClick(data.id);
    }
  };

  // Only include mainboard cards (board 1)
  const mainboardCards = cardsByBoard[1];

  const aspectDistribution = useMemo(() => {
    if (!cardListData) return [];

    const aspectCounts: Record<string, number> = {
      [SwuAspect.VIGILANCE]: 0,
      [SwuAspect.COMMAND]: 0,
      [SwuAspect.AGGRESSION]: 0,
      [SwuAspect.CUNNING]: 0,
      [SwuAspect.HEROISM]: 0,
      [SwuAspect.VILLAINY]: 0,
      'No Aspect': 0,
    };

    // Count cards by aspect
    mainboardCards.forEach(card => {
      const cardData = cardListData.cards[card.cardId];
      if (!cardData) return;

      if (cardData.aspects && cardData.aspects.length > 0) {
        // Check if the card has any aspects other than Heroism and Villainy
        const mainAspects = cardData.aspects.filter(
          aspect => aspect !== SwuAspect.HEROISM && aspect !== SwuAspect.VILLAINY,
        );

        if (mainAspects.length > 0) {
          // If the card has main aspects, only count those
          mainAspects.forEach(aspect => {
            aspectCounts[aspect] = (aspectCounts[aspect] || 0) + card.quantity;
          });
        } else {
          // If the card only has Heroism and/or Villainy, count those
          cardData.aspects.forEach(aspect => {
            aspectCounts[aspect] = (aspectCounts[aspect] || 0) + card.quantity;
          });
        }
      } else {
        aspectCounts['No Aspect'] = (aspectCounts['No Aspect'] || 0) + card.quantity;
      }
    });

    // Convert to array format needed for the pie chart
    return Object.entries(aspectCounts)
      .filter(([_, count]) => count > 0) // Only include aspects with cards
      .map(([aspect, count]) => ({
        id: aspect,
        label: aspect,
        value: count,
        color: aspect !== 'No Aspect' ? aspectColors[aspect as SwuAspect] : '#888888',
      }));
  }, [mainboardCards, cardListData]);

  if (aspectDistribution.length === 0) {
    return <div>No aspect data available</div>;
  }

  return (
    <div className="w-full" style={{ height: '350px', width: '350px' }}>
      <ResponsivePie
        data={aspectDistribution}
        margin={{ top: 20, right: 20, bottom: 40, left: 20 }}
        innerRadius={0.5}
        padAngle={0.7}
        cornerRadius={3}
        activeOuterRadiusOffset={8}
        colors={{ datum: 'data.color' }}
        borderWidth={1}
        borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
        arcLinkLabel={''}
        arcLinkLabelsThickness={0}
        arcLabelsSkipAngle={10}
        arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
        onClick={handlePieClick}
        isInteractive={true}
        animate={true}
        legends={[
          {
            anchor: 'bottom',
            direction: 'row',
            justify: false,
            translateX: 0,
            translateY: 36,
            itemsSpacing: 0,
            itemWidth: 100,
            itemHeight: 18,
            itemTextColor: theme === 'dark' ? '#ffffff' : '#333333',
            itemDirection: 'left-to-right',
            itemOpacity: 1,
            symbolSize: 18,
            symbolShape: 'circle',
          },
        ]}
      />
    </div>
  );
};

export default DeckAspectChart;
