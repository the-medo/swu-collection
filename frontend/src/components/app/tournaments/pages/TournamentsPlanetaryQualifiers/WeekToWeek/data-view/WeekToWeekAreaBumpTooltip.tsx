import * as React from 'react';
import { MetaInfo } from '@/components/app/tournaments/TournamentMeta/MetaInfoSelector.tsx';
import { WeekToWeekData } from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/WeekToWeek/useWeekToWeekData.ts';
import { PQTop } from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/pqLib.ts';
import { cn } from '@/lib/utils.ts';
import { useLabel } from '@/components/app/tournaments/TournamentMeta/useLabel.tsx';

interface TooltipTableRowProps {
  label: string;
  value: number;
  percentage: string;
  totalValue: number;
  totalLabel: string;
  percentageTotal?: string;
  isHighlighted: boolean;
  showPercentageOfAll?: boolean;
}

const TooltipTableRow: React.FC<TooltipTableRowProps> = ({
  label,
  value,
  percentage,
  totalValue,
  totalLabel,
  percentageTotal,
  isHighlighted,
  showPercentageOfAll = true,
}) => {
  return (
    <tr>
      <td className="pr-2">{label}:</td>
      <td
        className={cn('text-right px-4', {
          'bg-primary/40 font-bold': isHighlighted,
        })}
      >
        {value}
      </td>
      <td
        className={cn('text-right pr-1', {
          'bg-primary/40 font-bold italic': isHighlighted,
        })}
      >
        {percentage}%
      </td>
      <td className="text-xs text-muted-foreground px-1">of</td>
      <td className="text-right text-xs text-muted-foreground pr-1">{totalValue}</td>
      <td className="text-xs text-muted-foreground pr-4">{totalLabel}</td>
      {showPercentageOfAll && percentageTotal && (
        <>
          <td className="text-right pr-1">{percentageTotal}%</td>
          <td className="text-xs text-muted-foreground pr-1">of all</td>
        </>
      )}
    </tr>
  );
};

interface WeekToWeekAreaBumpTooltipProps {
  deckKey: string;
  metaInfo: MetaInfo;
  top: PQTop;
  hoveredWeekId: string | null;
  data: WeekToWeekData;
  labelRenderer: ReturnType<typeof useLabel>;
}

const WeekToWeekAreaBumpTooltip: React.FC<WeekToWeekAreaBumpTooltipProps> = ({
  deckKey,
  metaInfo,
  top,
  hoveredWeekId,
  data,
  labelRenderer,
}) => {
  // If no week is hovered, show basic info
  if (!hoveredWeekId) {
    return (
      <div className="bg-card p-2 rounded-md shadow-md border">
        <div className="flex items-center gap-2">{labelRenderer(deckKey, metaInfo, 'compact')}</div>
      </div>
    );
  }

  // Get data for the hovered week
  const deckData = data.deckKeyToWeek[deckKey]?.[hoveredWeekId];
  const weekTotals = data.weekTotals[hoveredWeekId];

  if (!deckData || !weekTotals) {
    return (
      <div className="bg-card p-2 rounded-md shadow-md border">
        <div className="flex items-center gap-2">
          {labelRenderer(deckKey, metaInfo, 'compact')}
          <div>No data available for this week</div>
        </div>
      </div>
    );
  }

  // Calculate percentages
  const championPercentage =
    weekTotals.winner > 0 ? ((deckData.winner / weekTotals.winner) * 100).toFixed(1) : '0.0';
  const championPercentageTotal =
    weekTotals.total > 0 ? ((deckData.winner / weekTotals.total) * 100).toFixed(1) : '0.0';

  const top8Percentage =
    weekTotals.top8 > 0 ? ((deckData.top8 / weekTotals.top8) * 100).toFixed(1) : '0.0';
  const top8PercentageTotal =
    weekTotals.total > 0 ? ((deckData.top8 / weekTotals.total) * 100).toFixed(1) : '0.0';

  const totalPercentage =
    weekTotals.total > 0 ? ((deckData.total / weekTotals.total) * 100).toFixed(1) : '0.0';

  // Get the week number for display
  const weekNumber = data.weekMap[hoveredWeekId]?.weekNumber || '';

  return (
    <div className="bg-card p-3 rounded-md shadow-md border">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2 font-medium">
          {labelRenderer(deckKey, metaInfo, 'image-small')}
          <h4 className="text-muted-foreground mb-1">Week {weekNumber}</h4>
        </div>
        <div className="text-sm">
          <table className="w-full">
            <tbody>
              <TooltipTableRow
                label="Champions"
                value={deckData.winner}
                percentage={championPercentage}
                totalValue={weekTotals.winner}
                totalLabel="total champions"
                percentageTotal={championPercentageTotal}
                isHighlighted={top === 'champions'}
              />
              <TooltipTableRow
                label="Top 8"
                value={deckData.top8}
                percentage={top8Percentage}
                totalValue={weekTotals.top8}
                totalLabel="total top 8s"
                percentageTotal={top8PercentageTotal}
                isHighlighted={top === 'top8'}
              />
              <TooltipTableRow
                label="Total"
                value={deckData.total}
                percentage={totalPercentage}
                totalValue={weekTotals.total}
                totalLabel="total decks"
                isHighlighted={top === 'total'}
                showPercentageOfAll={false}
              />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default WeekToWeekAreaBumpTooltip;
