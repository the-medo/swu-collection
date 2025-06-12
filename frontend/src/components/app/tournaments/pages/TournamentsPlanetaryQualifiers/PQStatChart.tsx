import * as React from 'react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList } from 'recharts';
import { useCallback, useMemo, useState } from 'react';
import { useLabel } from '@/components/app/tournaments/TournamentMeta/useLabel.tsx';
import { MetaInfo } from '@/components/app/tournaments/TournamentMeta/MetaInfoSelector.tsx';
import { Props } from 'recharts/types/component/Label';
import { labelWidthBasedOnMetaInfo } from '@/components/app/tournaments/TournamentMeta/tournamentMetaLib.ts';
import { useTournamentMetaActions } from '@/components/app/tournaments/TournamentMeta/useTournamentMetaStore.ts';
import { TournamentGroupLeaderBase } from '../../../../../../../server/db/schema/tournament_group_leader_base';
import { Button } from '@/components/ui/button';

interface PQStatChartProps {
  metaInfo: MetaInfo;
  data: TournamentGroupLeaderBase[];
  top: 'winners' | 'top8' | 'total';
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

  // Generate key based on metaInfo
  const getKey = useCallback(
    (item: TournamentGroupLeaderBase): string => {
      switch (metaInfo) {
        case 'leaders':
          return item.leaderCardId;
        case 'leadersAndBase':
          return `${item.leaderCardId}|${item.baseCardId}`;
        case 'bases':
          return item.baseCardId;
        // For aspects, we would need additional data that's not available in TournamentGroupLeaderBase
        // Fallback to using the base card ID for these cases
        case 'aspects':
        case 'aspectsBase':
        case 'aspectsDetailed':
          return item.baseCardId;
        default:
          return `${item.leaderCardId}|${item.baseCardId}`;
      }
    },
    [metaInfo],
  );

  // Group and sum data based on the key
  const groupedData = useMemo(() => {
    const grouped: Record<string, number> = {};

    data.forEach(item => {
      const key = getKey(item);
      if (!grouped[key]) {
        grouped[key] = 0;
      }

      // Use the appropriate count based on the 'top' prop
      if (top === 'winners') {
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
  }, [data, getKey, top]);

  // Map all items for visualization
  const chartData = useMemo(() => {
    // If showAll is false, only show top 20 items
    const visibleData = showAll ? groupedData : groupedData.slice(0, 20);

    return visibleData.map(item => ({
      name: item.key || 'Unknown',
      value: item.count,
    }));
  }, [groupedData, showAll]);

  const chartContainerStyle = useMemo(
    () => ({ width: '100%', height: Math.max(400, chartData.length * (BAR_THICKNESS + 2)) }),
    [chartData],
  );

  // Calculate total count for percentage calculations
  const totalCount = useMemo(() => {
    return groupedData.reduce((sum, item) => sum + item.count, 0);
  }, [groupedData]);

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
    <div className="w-full">
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
                formatter={(value, _name, props) => {
                  const payload = props.payload;

                  return (
                    <div className="flex items-center gap-2">
                      {labelRenderer(payload.name, metaInfo, 'text')}
                      <span className="font-bold">{value as number}</span>
                      <span className="text-xs">
                        ({(((value as number) / totalCount) * 100).toFixed(1)}%)
                      </span>
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
          <ChartLegend>
            <ChartLegendContent />
          </ChartLegend>
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
