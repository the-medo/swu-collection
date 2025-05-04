import * as React from 'react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList } from 'recharts';
import { useCallback, useMemo } from 'react';
import { useLabel } from '@/components/app/tournaments/TournamentMeta/useLabel.tsx';
import { MetaInfo } from '@/components/app/tournaments/TournamentMeta/MetaInfoSelector.tsx';
import TournamentMetaTooltip from './TournamentMetaTooltip';
import { Props } from 'recharts/types/component/Label';
import {
  AnalysisDataItem,
  getTotalDeckCountBasedOnMetaPart,
  labelWidthBasedOnMetaInfo,
} from '@/components/app/tournaments/TournamentMeta/tournamentMetaLib.ts';
import { useTournamentMetaActions } from '@/components/app/tournaments/TournamentMeta/useTournamentMetaStore.ts';

interface TournamentMetaChartProps {
  analysisData: AnalysisDataItem[];
  metaInfo: MetaInfo;
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
  const { setTournamentDeckKey } = useTournamentMetaActions();
  const { x, y, name, labelRenderer, metaInfo } = props;

  const labelX = (x as number) - 8; // Position left of the bar
  const labelY = y as number; // Center vertically

  const labelWidth = labelWidthBasedOnMetaInfo[metaInfo];

  return (
    <foreignObject
      x={labelX - labelWidth}
      y={labelY}
      width={labelWidth}
      height={BAR_THICKNESS}
      style={{ overflow: 'visible' }}
      className="cursor-pointer"
      onClick={() => {
        setTournamentDeckKey({
          key: name,
          metaInfo,
        });
      }}
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
  const { setTournamentDeckKey } = useTournamentMetaActions();

  // Map all items for visualization
  const chartData = useMemo(() => {
    return analysisData.map(item => ({
      name: item.key || 'Unknown',
      value: item.count,
      data: item.data, // additional data for tooltip
      winrate: item.winrate,
    }));
  }, [analysisData, metaPart]);

  const chartContainerStyle = useMemo(
    () => ({ width: '100%', height: Math.max(400, chartData.length * (BAR_THICKNESS + 2)) }),
    [chartData],
  );

  const totalDeckCountBasedOnMetaPart = useMemo(
    () => getTotalDeckCountBasedOnMetaPart(metaPart, totalDecks, day2Decks),
    [metaPart, totalDecks, day2Decks],
  );

  const onBarClick = useCallback(
    (p: { name: string }) => {
      setTournamentDeckKey({
        key: p.name,
        metaInfo,
      });
    },
    [metaInfo],
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
          margin={{ top: 0, right: 50, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis
            dataKey="name"
            type="category"
            width={labelWidthBasedOnMetaInfo[metaInfo]}
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

                  // Use the shared tooltip component
                  return (
                    <TournamentMetaTooltip
                      name={payload.name}
                      metaInfo={metaInfo as MetaInfo}
                      labelRenderer={labelRenderer}
                      value={value as number}
                      totalDeckCountBasedOnMetaPart={totalDeckCountBasedOnMetaPart}
                      data={data}
                      totalDecks={totalDecks}
                      day2Decks={day2Decks}
                    />
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
            className="cursor-pointer"
            onClick={onBarClick}
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
            <LabelList dataKey="value" position="insideRight" style={{ fontWeight: 'bold' }} />
            <LabelList
              dataKey="winrate"
              position="right"
              formatter={(value: string) => `(WR:${value}%)`}
              style={{
                fontSize: '10px',
                fontStyle: 'italic',
              }}
            />
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
