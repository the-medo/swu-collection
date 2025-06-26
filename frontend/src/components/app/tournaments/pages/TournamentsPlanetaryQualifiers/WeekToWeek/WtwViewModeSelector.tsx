import * as React from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group.tsx';
import { useCallback } from 'react';
import { Route } from '@/routes/tournaments/planetary-qualifiers';

interface WtwViewModeSelectorProps {}

const WtwViewModeSelector: React.FC<WtwViewModeSelectorProps> = () => {
  const { pqWtwViewMode = 'chart' } = useSearch({ strict: false });
  const navigate = useNavigate({ from: Route.fullPath });

  const onValueChange = useCallback(
    (value: 'chart' | 'table') => {
      if (value) {
        navigate({
          search: prev => ({ ...prev, pqWtwViewMode: value }),
        });
      }
    },
    [navigate],
  );

  return (
    <ToggleGroup
      type="single"
      value={pqWtwViewMode}
      onValueChange={onValueChange}
      className="justify-start gap-2"
    >
      <ToggleGroupItem value="chart">Chart</ToggleGroupItem>
      <ToggleGroupItem value="table">Table</ToggleGroupItem>
    </ToggleGroup>
  );
};

export default WtwViewModeSelector;
