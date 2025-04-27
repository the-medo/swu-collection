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

interface AnalysisDataItem {
  key: string;
  count: number;
}

interface TournamentMetaChartProps {
  analysisData: AnalysisDataItem[];
  metaInfo: string;
  totalDecks: number;
}

const chartConfig = {
  data: {
    label: 'Count',
    color: 'hsl(var(--primary))',
  },
};

const BAR_THICKNESS = 15;

const CustomLabel = props => {
  const { x, y, width, height, value, name, viewBox, labelRenderer, metaInfo } = props;

  // Position adjustments
  const labelX = x - 8; // Position left of the bar
  const labelY = y + height / 2; // Center vertically

  return (
    <foreignObject
      x={labelX - 250}
      y={labelY - BAR_THICKNESS / 2}
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
  totalDecks,
}) => {
  const labelRenderer = useLabel();

  // Map all items for visualization
  const chartData = useMemo(
    () =>
      analysisData.map(item => ({
        name: item.key || 'Unknown',
        value: item.count,
        percentage: ((item.count / totalDecks) * 100).toFixed(1),
      })),
    [analysisData, totalDecks],
  );

  const chartContainerStyle = useMemo(
    () => ({ width: '100%', height: Math.max(400, chartData.length * (BAR_THICKNESS + 2)) }),
    [chartData],
  );

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
                formatter={(_value, _name, props) => {
                  return labelRenderer(props.payload.name, metaInfo as MetaInfo, 'image');
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
