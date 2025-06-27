import * as React from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group.tsx';
import { useCallback } from 'react';
import { Route } from '@/routes/tournaments/planetary-qualifiers';
import { BarChart, LineChart } from 'lucide-react';

interface SideStatViewSelectorProps {}

const SideStatViewSelector: React.FC<SideStatViewSelectorProps> = () => {
  const { pqSideStatView = 'deckKey' } = useSearch({ strict: false });
  const navigate = useNavigate({ from: Route.fullPath });

  const onValueChange = useCallback(
    (value: 'week' | 'deckKey') => {
      if (value) {
        navigate({
          search: prev => ({ ...prev, pqSideStatView: value }),
        });
      }
    },
    [navigate],
  );

  return (
    <ToggleGroup
      type="single"
      value={pqSideStatView}
      onValueChange={onValueChange}
      className="justify-start gap-2"
    >
      <ToggleGroupItem value="deckKey">
        <LineChart className="h-4 w-4 mr-2" />
        Weekly shift
      </ToggleGroupItem>
      <ToggleGroupItem value="week">
        <BarChart className="h-4 w-4 mr-2" />
        Week overviews
      </ToggleGroupItem>
    </ToggleGroup>
  );
};

export default SideStatViewSelector;
