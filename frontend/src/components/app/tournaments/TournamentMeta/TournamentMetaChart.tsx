import * as React from 'react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList } from 'recharts';
import { useMemo } from 'react';
import { useLabel } from '@/components/app/tournaments/TournamentMeta/useLabel.tsx';
import { MetaInfo } from '@/components/app/tournaments/TournamentMeta/MetaInfoSelector.tsx';
import MetaPercentageTable from './MetaPercentageTable/MetaPercentageTable.tsx';
import { Props } from 'recharts/types/component/Label';
import { useComparerStore } from '@/components/app/comparer/useComparerStore.ts';

interface AnalysisDataItem {
  key: string;
  count: number;
  data?: {
    all: number;
    top8: number;
    day2: number;
    top64: number;
    conversionTop8: string;
    conversionDay2: string;
    conversionTop64: string;
  };
}

interface TournamentMetaChartProps {
  analysisData: AnalysisDataItem[];
  metaInfo: string;
  metaPart: string;
  totalDecks: number;
  day2Decks: number;
}

const chartConfig = {
  data: {
    label: 'Count',
    color: 'hsl(var(--primary))',
  },
};

const BAR_THICKNESS = 15;

interface CustomLabelProps extends Props {
  labelRenderer: ReturnType<typeof useLabel>;
  metaInfo: MetaInfo;
}

const CustomLabel = (props: CustomLabelProps) => {
  const { x, y, name, labelRenderer, metaInfo } = props;

  const labelX = (x as number) - 8; // Position left of the bar
  const labelY = y as number; // Center vertically

  return (
    <foreignObject
      x={labelX - 250}
      y={labelY}
      width={250}
      height={BAR_THICKNESS}
      style={{ overflow: 'visible' }}
    >
      <div className="flex items-center justify-end w-full h-full">
        {labelRenderer(name, metaInfo, 'compact')}
      </div>
    </foreignObject>
  );
};

const TournamentMetaChart: React.FC<TournamentMetaChartProps> = ({
  analysisData,
  metaInfo,
  metaPart,
  totalDecks,
  day2Decks,
}) => {
  const labelRenderer = useLabel();

  // Map all items for visualization
  const chartData = useMemo(() => {
    return analysisData.map(item => ({
      name: item.key || 'Unknown',
      value: item.count,
      data: item.data, // additional data for tooltip
    }));
  }, [analysisData, metaPart]);

  const chartContainerStyle = useMemo(
    () => ({ width: '100%', height: Math.max(400, chartData.length * (BAR_THICKNESS + 2)) }),
    [chartData],
  );

  const totalDeckCountBasedOnMetaPart = useMemo(() => {
    switch (metaPart) {
      case 'all':
        return totalDecks;
      case 'day2':
        return day2Decks;
      case 'top8':
        return 8;
      case 'top64':
        return 64;
    }
    return 0;
  }, [metaPart, totalDecks, day2Decks]);

  if (analysisData.length === 0) {
    return <p className="text-muted-foreground">No data available for the selected filters.</p>;
  }

  return (
    <div className="w-full">
      <ChartContainer config={chartConfig} className="w-full" style={chartContainerStyle}>
        <BarChart
          layout="vertical"
          data={chartData}
          margin={{ top: 20, right: 30, left: 100, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis
            dataKey="name"
            type="category"
            width={200}
            tick={{ fontSize: 12, display: 'none' }}
            // tickFormatter={props => labelRenderer(props, metaInfo as MetaInfo, 'compact')}
            interval={0}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                hideLabel={true}
                formatter={(value, _name, props) => {
                  const payload = props.payload;
                  const data = payload.data;

                  // Create tooltip content with deck name and additional data
                  return (
                    <div className="space-y-2">
                      {labelRenderer(payload.name, metaInfo as MetaInfo, 'image')}
                      <div className="flex gap-2 items-center">
                        <div className="rounded-full p-4 flex items-center justify-center size-[50px] border text-xl font-medium bg-accent">
                          {value}
                        </div>
                        <div className="text-lg">/</div>
                        <div className="text-lg">{totalDeckCountBasedOnMetaPart}</div>
                        <div className="ml-4 text-lg italic">
                          {totalDeckCountBasedOnMetaPart > 0
                            ? '(' +
                              (((value as number) / totalDeckCountBasedOnMetaPart) * 100).toFixed(
                                1,
                              ) +
                              '%)'
                            : ''}
                        </div>
                      </div>

                      {data && (
                        <MetaPercentageTable
                          data={data}
                          totalDecks={totalDecks}
                          day2Decks={day2Decks}
                        />
                      )}
                    </div>
                  );
                }}
              />
            }
          />
          <Bar
            dataKey="value"
            name="Count"
            fill="var(--color-data)"
            barSize={BAR_THICKNESS}
            minPointSize={3}
          >
            <LabelList
              dataKey="name"
              position="left"
              content={props => (
                <CustomLabel
                  {...props}
                  labelRenderer={labelRenderer}
                  metaInfo={metaInfo as MetaInfo}
                />
              )}
            />
            <LabelList dataKey="value" position="right" />
          </Bar>
          <ChartLegend>
            <ChartLegendContent />
          </ChartLegend>
        </BarChart>
      </ChartContainer>
    </div>
  );
};

export default TournamentMetaChart;
