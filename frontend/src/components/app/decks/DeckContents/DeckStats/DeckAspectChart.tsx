import React, { useMemo } from 'react';
import { ResponsivePie } from '@nivo/pie';
import { DeckCardsForLayout } from '@/components/app/decks/DeckContents/DeckCards/deckCardsLib.ts';
import { useCardList } from '@/api/lists/useCardList.ts';
import { SwuAspect } from '../../../../../../../types/enums.ts';
import { useTheme } from '@/components/theme-provider.tsx';

interface DeckAspectChartProps {
  deckCardsForLayout: DeckCardsForLayout;
}

// Define aspect colors - same as in usePieChartColors.tsx
const aspectColors: Record<SwuAspect, string> = {
  [SwuAspect.VIGILANCE]: '#6694ce', // c61 m34 y0 k0
  [SwuAspect.COMMAND]: '#41ad49', // c75 m5 y100 k0
  [SwuAspect.AGGRESSION]: '#d2232a', // c15 m100 y100 k0
  [SwuAspect.CUNNING]: '#fdb933', // c0 m30 y90 k0
  [SwuAspect.HEROISM]: '#c6c1a0', // c18 m14 y36 k6
  [SwuAspect.VILLAINY]: '#040004', // c50 m80 y0 k100
};

const DeckAspectChart: React.FC<DeckAspectChartProps> = ({ deckCardsForLayout }) => {
  const { data: cardListData } = useCardList();
  const { theme } = useTheme();
  const { cardsByBoard } = deckCardsForLayout;

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
          aspect => aspect !== SwuAspect.HEROISM && aspect !== SwuAspect.VILLAINY
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
    <div className="w-full" style={{ height: '350px' }}>
      <ResponsivePie
        data={aspectDistribution}
        margin={{ top: 40, right: 80, bottom: 80, left: 80 }}
        innerRadius={0.5}
        padAngle={0.7}
        cornerRadius={3}
        activeOuterRadiusOffset={8}
        colors={{ datum: 'data.color' }}
        borderWidth={1}
        borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
        arcLinkLabelsSkipAngle={10}
        arcLinkLabelsTextColor={theme === 'dark' ? '#ffffff' : '#333333'}
        arcLinkLabelsThickness={2}
        arcLinkLabelsColor={{ from: 'color' }}
        arcLabelsSkipAngle={10}
        arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
        legends={[
          {
            anchor: 'bottom',
            direction: 'row',
            justify: false,
            translateX: 0,
            translateY: 56,
            itemsSpacing: 0,
            itemWidth: 100,
            itemHeight: 18,
            itemTextColor: theme === 'dark' ? '#ffffff' : '#333333',
            itemDirection: 'left-to-right',
            itemOpacity: 1,
            symbolSize: 18,
            symbolShape: 'circle',
          }
        ]}
      />
    </div>
  );
};

export default DeckAspectChart;
