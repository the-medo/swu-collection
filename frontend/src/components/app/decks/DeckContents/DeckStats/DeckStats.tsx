import React, { useMemo, useRef, useState } from 'react';
import { useDeckData } from '@/components/app/decks/DeckContents/useDeckData.ts';
import DeckCostChart from './DeckCostChart';
import DeckAspectChart from './DeckAspectChart';
import DeckStatsSelectedCards, { FilterType } from './DeckStatsSelectedCards';
import { useSetShare } from '@/hooks/useSetShare/useSetShare.ts';
import SetSharePieChart from '@/components/app/global/SetSharePieCharts/SetSharePieChart.tsx';

interface DeckStatsProps {
  deckId: string;
}

const DeckStats: React.FC<DeckStatsProps> = ({ deckId }) => {
  const resultsRef = useRef<HTMLDivElement>(null);
  const { deckCardsForLayout, isLoading } = useDeckData(deckId);
  const { getEmptySetShare, addDeckCardsToSetShare } = useSetShare();
  const [filterType, setFilterType] = useState<FilterType>(null);
  const [filterValue, setFilterValue] = useState<string | null>(null);

  const setShare = useMemo(() => {
    const share = getEmptySetShare();
    // Object.values(deckCardsForLayout?.cardsByBoard ?? {}).forEach(cards =>
    //   addDeckCardsToSetShare(share, cards),
    // );

    /** Currently, only maindeck is supported */
    addDeckCardsToSetShare(share, deckCardsForLayout?.cardsByBoard[1]);
    return share;
  }, [deckCardsForLayout?.cardsByBoard, getEmptySetShare, addDeckCardsToSetShare]);

  const scrollIntoView = () => {
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Handlers for chart click events
  const handleCostClick = (cost: string) => {
    setFilterType('cost');
    setFilterValue(cost);
    scrollIntoView();
  };

  const handleAspectClick = (aspect: string) => {
    setFilterType('aspect');
    setFilterValue(aspect);
    scrollIntoView();
  };

  const handleSetClick = (set: string) => {
    setFilterType('set');
    setFilterValue(set);
    scrollIntoView();
  };

  const handleRotationBlockClick = (rotationBlock: string) => {
    setFilterType('rotationBlock');
    setFilterValue(rotationBlock);
    scrollIntoView();
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex flex-row flex-wrap gap-8 w-full p-2">
      <div className="flex flex-wrap gap-8 flex-1">
        <div className="flex flex-col">
          <h3 className="text-lg font-semibold">Cost Distribution</h3>
          <div className="max-w-[350px]">
            <DeckCostChart deckCardsForLayout={deckCardsForLayout} onCostClick={handleCostClick} />
          </div>
        </div>

        <div className="flex flex-col">
          <h3 className="text-lg font-semibold">Aspect Distribution</h3>
          <div className="max-w-[350px]">
            <DeckAspectChart
              deckCardsForLayout={deckCardsForLayout}
              onAspectClick={handleAspectClick}
            />
          </div>
        </div>

        <div className="flex flex-col">
          <h3 className="text-lg font-semibold">Set distribution</h3>
          <div className="">
            <SetSharePieChart
              setShare={setShare}
              source={'setShare'}
              onClick={handleSetClick}
              showLabels={false}
            />
          </div>
        </div>

        <div className="flex flex-col">
          <h3 className="text-lg font-semibold">Rotation blocks distribution</h3>
          <div className="">
            <SetSharePieChart
              setShare={setShare}
              source={'rotationBlock'}
              onClick={handleRotationBlockClick}
              showLabels={false}
            />
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-8 flex-1 max-w-[400px] min-w-[400px]" ref={resultsRef}>
        <DeckStatsSelectedCards
          deckId={deckId}
          deckCardsForLayout={deckCardsForLayout}
          filterType={filterType}
          filterValue={filterValue}
        />
      </div>
    </div>
  );
};

export default DeckStats;
