import * as React from 'react';
import { SetShare, useSetShare } from '@/hooks/useSetShare/useSetShare.ts';
import { useMemo } from 'react';
import { ResponsivePie } from '@nivo/pie';

interface SetSharePieChartProps {
  setShare: SetShare;
  source: 'setShare' | 'rotationBlock';
}

const SetSharePieChart: React.FC<SetSharePieChartProps> = ({ setShare, source }) => {
  const { getSetShareChartData } = useSetShare();

  const {
    data: chartData,
    defs,
    fill,
  } = useMemo(() => getSetShareChartData(setShare, source), [getSetShareChartData, setShare]);

  return (
    <div className="mx-auto aspect-square h-[250px] max-h-[350px] w-full overflow-visible">
      <ResponsivePie
        data={chartData}
        margin={{ top: 40, right: 100, bottom: 30, left: 100 }}
        innerRadius={0.5}
        padAngle={0.7}
        cornerRadius={3}
        activeOuterRadiusOffset={8}
        arcLinkLabelsSkipAngle={10}
        colors={['#3B3B3B']}
        arcLinkLabelsThickness={2}
        arcLinkLabelsColor={{ from: 'color' }}
        arcLinkLabel={'label'}
        arcLabelsSkipAngle={10}
        arcLabelsTextColor={{
          from: 'color',
          modifiers: [['brighter', 10]],
        }}
        defs={defs}
        fill={fill}
      />
    </div>
  );
};

export default SetSharePieChart;
