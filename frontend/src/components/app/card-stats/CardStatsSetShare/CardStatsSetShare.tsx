import { CardStatData } from '@/components/app/card-stats/types.ts';
import * as React from 'react';
import { useSetShare } from '@/hooks/useSetShare/useSetShare.ts';
import { useMemo, useState } from 'react';
import { Switch } from '@/components/ui/switch.tsx';
import SetSharePieCharts from '@/components/app/global/SetSharePieCharts/SetSharePieCharts.tsx';

interface CardStatsSetShareProps {
  data: CardStatData[];
}

const CardStatsSetShare: React.FC<CardStatsSetShareProps> = ({ data }) => {
  const { getEmptySetShare, addCardStatsToSetShare } = useSetShare();
  const [mdCards, setMdCards] = useState(true);
  const [sbCards, setSbCards] = useState(true);

  const setShare = useMemo(() => {
    const share = getEmptySetShare();
    addCardStatsToSetShare(
      share,
      data.map(d => d.cardStat),
      mdCards,
      sbCards,
    );
    return share;
  }, [data, getEmptySetShare, mdCards, sbCards]);

  return (
    <div className="flex gap-4">
      <SetSharePieCharts setShare={setShare} />
      <div className="flex flex-col gap-2 min-w-[200px] items-center justify-center">
        <div className="flex gap-2">
          <Switch checked={mdCards} onCheckedChange={() => setMdCards(p => !p)} />{' '}
          <span>Maindeck cards</span>
        </div>
        <div className="flex gap-2">
          <Switch checked={sbCards} onCheckedChange={() => setSbCards(p => !p)} />{' '}
          <span>Sideboard cards</span>
        </div>
      </div>
    </div>
  );
};

export default CardStatsSetShare;
