import * as React from 'react';
import { SetShare, useSetShare } from '@/hooks/useSetShare/useSetShare.ts';
import { useMemo } from 'react';
import { ResponsivePie } from '@nivo/pie';
import { getGenericPieChartTooltip } from '@/components/app/global/GenericPieChartTooltip/GenericPieChartTooltip.tsx';
import { useTheme } from '@/components/theme-provider.tsx';

interface SetSharePieChartProps {
  setShare: SetShare;
  source: 'setShare' | 'rotationBlock';
  onClick?: (id: string) => void;
  showLabels?: boolean;
}

const SetSharePieChart: React.FC<SetSharePieChartProps> = ({
  setShare,
  source,
  onClick,
  showLabels = true,
}) => {
  const { getSetShareChartData } = useSetShare();
  const { theme } = useTheme();

  const handlePieClick = (data: any) => {
    if (onClick) {
      onClick(data.id);
    }
  };

  const { data: chartData, fill } = useMemo(
    () => getSetShareChartData(setShare, source),
    [getSetShareChartData, setShare],
  );

  const chartOptions = showLabels
    ? {
        margin: { top: 40, right: 100, bottom: 30, left: 100 },
        innerRadius: 0.5,
        padAngle: 0.7,
        cornerRadius: 3,
        activeOuterRadiusOffset: 8,
        arcLinkLabelsSkipAngle: 10,
        arcLinkLabelsThickness: 2,
        arcLinkLabelsColor: { from: 'color' },
        arcLinkLabel: 'label',
        arcLabelsSkipAngle: 10,
      }
    : {
        margin: { top: 20, right: 20, bottom: 40, left: 20 },
        innerRadius: 0.5,
        padAngle: 0.7,
        cornerRadius: 3,
        activeOuterRadiusOffset: 8,
        arcLinkLabelsSkipAngle: 10,
        arcLinkLabelsThickness: 0,
        arcLinkLabel: '',
      };

  return (
    <div className="mx-auto aspect-square h-[250px] max-h-[350px] w-full overflow-visible">
      <ResponsivePie
        data={chartData}
        arcLabelsTextColor={'white'}
        colors={{ datum: 'data.color' }}
        fill={fill}
        onClick={handlePieClick}
        isInteractive={true}
        tooltip={getGenericPieChartTooltip}
        animate={true}
        arcLinkLabelsTextColor={theme === 'light' ? '#3B3B3B' : 'white'}
        {...chartOptions}
      />
    </div>
  );
};

export default SetSharePieChart;
