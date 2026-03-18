import * as React from 'react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart.tsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList } from 'recharts';
import { useMemo } from 'react';
import { useLabel } from '@/components/app/tournaments/TournamentMeta/useLabel.tsx';
import { MetaInfo } from '@/components/app/tournaments/TournamentMeta/MetaInfoSelector.tsx';
import { Props } from 'recharts/types/component/Label';
import { labelWidthBasedOnMetaInfo } from '@/components/app/tournaments/TournamentMeta/tournamentMetaLib.ts';
import StatisticsMetaTooltip from '@/components/app/statistics/StatisticsMeta/StatisticsMetaTooltip.tsx';
import { StatisticsMetaDataItem } from '@/components/app/statistics/StatisticsMeta/statisticsMetaLib.ts';

interface StatisticsMetaBarChartProps {
  analysisData: StatisticsMetaDataItem[];
  metaInfo: MetaInfo;
  totalMatches: number;
}

const chartConfig = {
  count: {
    label: 'Matches',
    color: 'hsl(var(--primary))',
  },
};

const BAR_THICKNESS = 15;

interface CustomLabelProps extends Props {
  labelRenderer: ReturnType<typeof useLabel>;
  metaInfo: MetaInfo;
}

const CustomLabel = ({ x, y, value, labelRenderer, metaInfo }: CustomLabelProps) => {
  const labelX = (x as number) - 8;
  const labelY = y as number;
  const key = value as string | undefined;

  return (
    <foreignObject
      x={labelX - labelWidthBasedOnMetaInfo[metaInfo]}
      y={labelY}
      width={labelWidthBasedOnMetaInfo[metaInfo]}
      height={BAR_THICKNESS}
      style={{ overflow: 'visible' }}
    >
      <div className="flex items-center justify-end w-full h-full">
        {labelRenderer(key, metaInfo, 'compact', 'right')}
      </div>
    </foreignObject>
  );
};

const StatisticsMetaBarChart: React.FC<StatisticsMetaBarChartProps> = ({
  analysisData,
  metaInfo,
  totalMatches,
}) => {
  const labelRenderer = useLabel();

  const chartData = useMemo(
    () =>
      analysisData.map(item => ({
        key: item.key,
        count: item.count,
        item,
      })),
    [analysisData],
  );

  const chartContainerStyle = useMemo(
    () => ({ width: '100%', height: Math.max(400, chartData.length * (BAR_THICKNESS + 2)) }),
    [chartData],
  );

  if (analysisData.length === 0) {
    return <p className="text-muted-foreground">No opponent meta available for the selected filters.</p>;
  }

  return (
    <div className="w-full">
      <ChartContainer config={chartConfig} className="w-full" style={chartContainerStyle}>
        <BarChart
          layout="vertical"
          data={chartData}
          margin={{ top: 0, right: 50, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis
            dataKey="key"
            type="category"
            width={labelWidthBasedOnMetaInfo[metaInfo]}
            tick={{ fontSize: 12, display: 'none' }}
            interval={0}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                hideLabel={true}
                formatter={(_value, _name, props) => (
                  <StatisticsMetaTooltip
                    item={props.payload.item}
                    metaInfo={metaInfo}
                    totalMatches={totalMatches}
                    labelRenderer={labelRenderer}
                  />
                )}
              />
            }
          />
          <Bar
            dataKey="count"
            name="Matches"
            fill="var(--color-count)"
            barSize={BAR_THICKNESS}
            minPointSize={3}
            radius={[0, 4, 4, 0]}
          >
            <LabelList
              dataKey="key"
              position="left"
              content={props => (
                <CustomLabel {...props} labelRenderer={labelRenderer} metaInfo={metaInfo} />
              )}
            />
            <LabelList dataKey="count" position="right" style={{ fontWeight: 'bold' }} />
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  );
};

export default StatisticsMetaBarChart;
