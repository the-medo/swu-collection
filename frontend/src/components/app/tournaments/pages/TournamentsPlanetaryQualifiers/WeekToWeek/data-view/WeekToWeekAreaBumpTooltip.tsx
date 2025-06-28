import * as React from 'react';
import { MetaInfo } from '@/components/app/tournaments/TournamentMeta/MetaInfoSelector.tsx';
import { WeekToWeekData } from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/WeekToWeek/useWeekToWeekData.ts';

interface WeekToWeekAreaBumpTooltipProps {
  deckKey: string;
  metaInfo: MetaInfo;
  hoveredWeekId: string | null;
  data: WeekToWeekData;
  labelRenderer: (key: string, metaInfo: MetaInfo, mode: 'compact' | 'text') => React.ReactNode;
}

const WeekToWeekAreaBumpTooltip: React.FC<WeekToWeekAreaBumpTooltipProps> = ({
  deckKey,
  metaInfo,
  hoveredWeekId,
  data,
  labelRenderer,
}) => {
  // If no week is hovered, show basic info
  if (!hoveredWeekId) {
    return (
      <div className="bg-card p-2 rounded-md shadow-md border">
        <div className="flex items-center gap-2">
          {labelRenderer(deckKey, metaInfo, 'compact')}
        </div>
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
  const championPercentage = weekTotals.total > 0 
    ? ((deckData.winner / weekTotals.total) * 100).toFixed(1) 
    : '0.0';
  const top8Percentage = weekTotals.total > 0 
    ? ((deckData.top8 / weekTotals.total) * 100).toFixed(1) 
    : '0.0';
  const totalPercentage = weekTotals.total > 0 
    ? ((deckData.total / weekTotals.total) * 100).toFixed(1) 
    : '0.0';

  // Get the week number for display
  const weekNumber = data.weekMap[hoveredWeekId]?.weekNumber || '';

  return (
    <div className="bg-card p-3 rounded-md shadow-md border">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 font-medium">
          {labelRenderer(deckKey, metaInfo, 'compact')}
        </div>
        <div className="text-xs text-muted-foreground mb-1">
          Week {weekNumber}
        </div>
        <div className="text-sm">
          <div className="grid grid-cols-2 gap-x-4">
            <span>Champions:</span>
            <span>{deckData.winner} ({championPercentage}%)</span>

            <span>Top 8:</span>
            <span>{deckData.top8} ({top8Percentage}%)</span>

            <span>Total:</span>
            <span>{deckData.total} ({totalPercentage}%)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeekToWeekAreaBumpTooltip;