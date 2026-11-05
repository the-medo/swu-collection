import * as React from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group.tsx';
import { BarChart, ChartScatter, TableIcon, TrendingUp } from 'lucide-react';

export type ViewMode = 'chart' | 'table';
export type TournamentViewMode = ViewMode | 'apr' | 'map';

type ViewModeSelectorProps =
  | { showApr?: false; value: ViewMode; onChange: (value: ViewMode) => void }
  | { showApr: true; value: TournamentViewMode; onChange: (value: TournamentViewMode) => void };

const ViewModeSelector: React.FC<ViewModeSelectorProps> = props => {
  const onValueChange = (value: string) => {
    if (value === 'chart' || value === 'table') props.onChange(value);
    else if ((value === 'apr' || value === 'map') && props.showApr) props.onChange(value);
  };

  return (
    <ToggleGroup
      type="single"
      value={props.value}
      onValueChange={onValueChange}
      className="justify-start gap-2"
    >
      <ToggleGroupItem value="chart">
        <BarChart className="h-4 w-4 mr-2" />
        Chart
      </ToggleGroupItem>
      <ToggleGroupItem value="table">
        <TableIcon className="h-4 w-4 mr-2" />
        Table
      </ToggleGroupItem>
      {props.showApr && (
        <ToggleGroupItem value="map" aria-label="Plot — Win rate and meta share">
          <ChartScatter className="h-4 w-4 mr-2" />
          Plot
        </ToggleGroupItem>
      )}
      {props.showApr && (
        <ToggleGroupItem value="apr" aria-label="APR — Adjusted performance rate">
          <TrendingUp className="h-4 w-4 mr-2" />
          APR
        </ToggleGroupItem>
      )}
    </ToggleGroup>
  );
};

export default ViewModeSelector;
