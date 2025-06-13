import * as React from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group.tsx';
import { useCallback } from 'react';
import { Route } from '@/routes/tournaments/planetary-qualifiers';
import { Trophy } from 'lucide-react';

interface PQPageNavigationProps {}

const PQPageNavigation: React.FC<PQPageNavigationProps> = () => {
  const { page = 'champions' } = useSearch({ strict: false });
  const navigate = useNavigate({ from: Route.fullPath });

  const onValueChange = useCallback(
    (value: 'top8' | 'total' | 'tournaments' | 'champions') => {
      if (value) {
        navigate({
          search: prev => ({ ...prev, page: value }),
        });
      }
    },
    [navigate],
  );

  return (
    <ToggleGroup
      type="single"
      value={page}
      onValueChange={onValueChange}
      className="justify-start gap-2"
    >
      <ToggleGroupItem value="champions">
        <Trophy />
        Champions
      </ToggleGroupItem>
      <ToggleGroupItem value="top8">Top 8</ToggleGroupItem>
      <ToggleGroupItem value="total">Total</ToggleGroupItem>
    </ToggleGroup>
  );
};

export default PQPageNavigation;
