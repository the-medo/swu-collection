import * as React from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group.tsx';
import { useCallback } from 'react';
import { Route } from '@/routes/tournaments/planetary-qualifiers';
import { PercentIcon, HashIcon } from 'lucide-react';

interface DataViewTypeSelectorProps {}

const DataViewTypeSelector: React.FC<DataViewTypeSelectorProps> = () => {
  const { pqWtwDataViewType = 'count' } = useSearch({ strict: false });
  const navigate = useNavigate({ from: Route.fullPath });

  const onValueChange = useCallback(
    (value: 'count' | 'percentage') => {
      if (value) {
        navigate({
          search: prev => ({ ...prev, pqWtwDataViewType: value }),
        });
      }
    },
    [navigate],
  );

  return (
    <ToggleGroup
      type="single"
      value={pqWtwDataViewType}
      onValueChange={onValueChange}
      className="justify-start gap-2"
    >
      <ToggleGroupItem value="count">
        <HashIcon className="h-4 w-4 mr-2" />
        Count
      </ToggleGroupItem>
      <ToggleGroupItem value="percentage">
        <PercentIcon className="h-4 w-4 mr-2" />
        Percentage
      </ToggleGroupItem>
    </ToggleGroup>
  );
};

export default DataViewTypeSelector;