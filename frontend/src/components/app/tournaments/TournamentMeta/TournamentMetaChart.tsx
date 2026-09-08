import * as React from 'react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList, Cell } from 'recharts';
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
  top8Decks: number;
  top64Decks: number;
  championsDecks: number;
  highlightedKeys: ReadonlySet<string>;
  isHighlighting: boolean;
}

const chartConfig = {
  data: {
    label: 'Count',
    color: 'hsl(var(--primary))',
  },
};

const BAR_THICKNESS = 15;
const DIMMED_OPACITY = 0.3;

interface CustomLabelProps extends Props {
  labelRenderer: ReturnType<typeof useLabel>;
  metaInfo: MetaInfo;
  highlightedKeys: ReadonlySet<string>;
  isHighlighting: boolean;
}

const CustomLabel = (props: CustomLabelProps) => {
  const { setTournamentDeckKey } = useTournamentMetaActions();
  const { x, y, value, labelRenderer, metaInfo, highlightedKeys, isHighlighting } = props;

  const labelX = (x as number) - 8; // Position left of the bar
  const labelY = y as number; // Center vertically

  const labelWidth = labelWidthBasedOnMetaInfo[metaInfo];
  const key = value as string | undefined;

  return (
    <foreignObject
      x={labelX - labelWidth}
      y={labelY}
      width={labelWidth}
      height={BAR_THICKNESS}
      style={{
        overflow: 'visible',
        opacity: isHighlighting && key && !highlightedKeys.has(key) ? DIMMED_OPACITY : 1,
      }}
      className="cursor-pointer"
      onClick={() => {
        setTournamentDeckKey({
          key,
          metaInfo,
        });
      }}
    >
      <div className="flex items-center justify-end w-full h-full">
        {labelRenderer(key, metaInfo, 'compact')}
      </div>
    </foreignObject>
  );
};

interface CustomBarDataLabelProps extends Props {
  dimmed: boolean;
  type: 'count' | 'winrate';
}

const CustomBarDataLabel = ({
  x,
  y,
  width,
  height,
  value,
  dimmed,
  type,
}: CustomBarDataLabelProps) => {
  const labelX = Number(x) + Number(width) + (type === 'count' ? -5 : 6);
  const labelY = Number(y) + Number(height) / 2;

  if (!Number.isFinite(labelX) || !Number.isFinite(labelY)) return null;

  return (
    <text
      x={labelX}
      y={labelY}
      dominantBaseline="central"
      textAnchor={type === 'count' ? 'end' : 'start'}
      className="fill-muted-foreground pointer-events-none"
      opacity={dimmed ? DIMMED_OPACITY : 1}
      style={
        type === 'count'
          ? { fontWeight: 'bold' }
          : { fontSize: '10px', fontStyle: 'italic' }
      }
    >
      {type === 'count' ? value : `(WR:${value}%)`}
    </text>
  );
};

const TournamentMetaChart: React.FC<TournamentMetaChartProps> = ({
  analysisData,
  metaInfo,
  metaPart,
  totalDecks,
  day2Decks,
  top8Decks,
  top64Decks,
  championsDecks,
  highlightedKeys,
  isHighlighting,
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
      isHighlighted: highlightedKeys.has(item.key),
    }));
  }, [analysisData, highlightedKeys]);

  const chartContainerStyle = useMemo(
    () => ({ width: '100%', height: Math.max(400, chartData.length * (BAR_THICKNESS + 2)) }),
    [chartData],
  );

  const totalDeckCountBasedOnMetaPart = getTotalDeckCountBasedOnMetaPart(
    metaPart,
    totalDecks,
    day2Decks,
    top8Decks,
    top64Decks,
    championsDecks,
  );

  const onBarClick = useCallback(
    (p: { name: string }) => {
      setTournamentDeckKey({
        key: p.name,
        metaInfo,
      });
    },
    [metaInfo, setTournamentDeckKey],
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
                      top8Decks={top8Decks}
                      top64Decks={top64Decks}
                      championsDecks={championsDecks}
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
            {chartData.map(item => (
              <Cell
                key={item.name}
                opacity={isHighlighting && !item.isHighlighted ? DIMMED_OPACITY : 1}
                stroke={isHighlighting && item.isHighlighted ? 'hsl(var(--foreground))' : 'none'}
                strokeWidth={isHighlighting && item.isHighlighted ? 1 : 0}
              />
            ))}
            <LabelList
              dataKey="name"
              position="left"
              content={props => (
                <CustomLabel
                  {...props}
                  labelRenderer={labelRenderer}
                  metaInfo={metaInfo as MetaInfo}
                  highlightedKeys={highlightedKeys}
                  isHighlighting={isHighlighting}
                />
              )}
            />
            <LabelList
              dataKey="value"
              position="insideRight"
              content={props => {
                const item = chartData[props.index ?? -1];
                return (
                  <CustomBarDataLabel
                    {...props}
                    type="count"
                    dimmed={isHighlighting && !item?.isHighlighted}
                  />
                );
              }}
            />
            <LabelList
              dataKey="winrate"
              position="right"
              content={props => {
                const item = chartData[props.index ?? -1];
                return (
                  <CustomBarDataLabel
                    {...props}
                    type="winrate"
                    dimmed={isHighlighting && !item?.isHighlighted}
                  />
                );
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
