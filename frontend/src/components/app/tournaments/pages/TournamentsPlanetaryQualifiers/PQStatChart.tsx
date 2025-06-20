import * as React from 'react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList } from 'recharts';
import { useCallback, useMemo, useState } from 'react';
import { useLabel } from '@/components/app/tournaments/TournamentMeta/useLabel.tsx';
import { MetaInfo } from '@/components/app/tournaments/TournamentMeta/MetaInfoSelector.tsx';
import { Props } from 'recharts/types/component/Label';
import {
  getDeckKey2,
  labelWidthBasedOnMetaInfo,
} from '@/components/app/tournaments/TournamentMeta/tournamentMetaLib.ts';
import { useTournamentMetaActions } from '@/components/app/tournaments/TournamentMeta/useTournamentMetaStore.ts';
import { TournamentGroupLeaderBase } from '../../../../../../../server/db/schema/tournament_group_leader_base';
import { Button } from '@/components/ui/button';
import { useCardList } from '@/api/lists/useCardList.ts';

// Custom tooltip table component
interface PQStatTooltipProps {
  name: string;
  metaInfo: MetaInfo;
  labelRenderer: ReturnType<typeof useLabel>;
  keyData: {
    winner: number;
    top8: number;
    total: number;
  };
}

const PQStatTooltip: React.FC<PQStatTooltipProps> = ({
  name,
  metaInfo,
  labelRenderer,
  keyData,
}) => {
  // Calculate conversion rates
  const winnerToTotalRate =
    keyData.total > 0 ? ((keyData.winner / keyData.total) * 100).toFixed(1) + '%' : '0.0%';

  const top8ToTotalRate =
    keyData.total > 0 ? ((keyData.top8 / keyData.total) * 100).toFixed(1) + '%' : '0.0%';

  return (
    <div className="space-y-4 flex flex-col items-center text-center">
      <div className="flex justify-center">{labelRenderer(name, metaInfo, 'text')}</div>

      <div className="text-xs space-y-1 mt-2">
        <table>
          <thead>
            <tr className="bg-accent font-bold">
              <td></td>
              <td className="px-2 py-1">Count</td>
              <td className="px-2 py-1 flex flex-col gap-0 items-center">
                <span>Conversion rate</span>
                <span className="text-[10px]">(from {keyData.total} decks)</span>
              </td>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th className="text-left px-2 bg-accent">Total</th>
              <td className="text-right">{keyData.total}</td>
              <td className="i text-xs text-right">-</td>
            </tr>
            <tr>
              <th className="text-left px-2 bg-accent">Top 8</th>
              <td className="text-right">{keyData.top8}</td>
              <td className="i text-xs text-right">{top8ToTotalRate}</td>
            </tr>
            <tr>
              <th className="text-left px-2 bg-accent">Champions</th>
              <td className="text-right">{keyData.winner}</td>
              <td className="i text-xs text-right">{winnerToTotalRate}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

interface PQStatChartProps {
  metaInfo: MetaInfo;
  data: TournamentGroupLeaderBase[];
  top: 'champions' | 'top8' | 'total';
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

const PQStatChart: React.FC<PQStatChartProps> = ({ metaInfo, data, top }) => {
  const labelRenderer = useLabel();
  const { setTournamentDeckKey } = useTournamentMetaActions();
  const [showAll, setShowAll] = useState(false);
  const { data: cardListData } = useCardList();

  // Group and sum data based on the key
  const groupedData = useMemo(() => {
    const grouped: Record<string, number> = {};

    data.forEach(item => {
      const key = getDeckKey2(item.leaderCardId, item.baseCardId, metaInfo, cardListData);
      if (!grouped[key]) {
        grouped[key] = 0;
      }

      // Use the appropriate count based on the 'top' prop
      if (top === 'champions') {
        grouped[key] += item.winner;
      } else if (top === 'top8') {
        grouped[key] += item.top8;
      } else {
        grouped[key] += item.total;
      }
    });

    return Object.entries(grouped)
      .map(([key, count]) => ({ key, count }))
      .filter(item => item.count > 0) // Filter out items with zero count
      .sort((a, b) => b.count - a.count);
  }, [data, metaInfo, top, cardListData]);

  // Map all items for visualization
  const chartData = useMemo(() => {
    // If showAll is false, only show top 20 items
    const visibleData = showAll ? groupedData : groupedData.slice(0, 20);

    return visibleData.map(vd => {
      // Calculate counts for this key
      const keyData = {
        winner: 0,
        top8: 0,
        total: 0,
      };

      // Sum up the counts for this key
      data.forEach(item => {
        if (getDeckKey2(item.leaderCardId, item.baseCardId, metaInfo, cardListData) === vd.key) {
          keyData.winner += item.winner;
          keyData.top8 += item.top8;
          keyData.total += item.total;
        }
      });

      return {
        name: vd.key || 'Unknown',
        value: vd.count,
        keyData,
      };
    });
  }, [groupedData, showAll, data]);

  const chartContainerStyle = useMemo(
    () => ({ width: '100%', height: Math.max(400, chartData.length * (BAR_THICKNESS + 2)) }),
    [chartData],
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

  if (groupedData.length === 0) {
    return <p className="text-muted-foreground">No data available for the selected filters.</p>;
  }

  return (
    <div className="min-w-[330px]">
      <ChartContainer config={chartConfig} className="w-full" style={chartContainerStyle}>
        <BarChart
          layout="vertical"
          data={chartData}
          margin={{ top: 0, right: 50, left: 20, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis
            dataKey="name"
            type="category"
            width={labelWidthBasedOnMetaInfo[metaInfo]}
            tick={{ fontSize: 12, display: 'none' }}
            interval={0}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                hideLabel={true}
                formatter={(_value, _name, props) => {
                  const payload = props.payload;
                  const keyData = payload.keyData;

                  return (
                    <PQStatTooltip
                      name={payload.name}
                      metaInfo={metaInfo}
                      labelRenderer={labelRenderer}
                      keyData={keyData}
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
          </Bar>
        </BarChart>
      </ChartContainer>

      {/* Show toggle button only if there are more than 20 items */}
      {groupedData.length > 20 && (
        <div className="flex justify-center">
          <Button onClick={() => setShowAll(p => !p)} size="xs" variant="outline">
            {showAll ? 'Show Top 20' : 'Show All'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default PQStatChart;
