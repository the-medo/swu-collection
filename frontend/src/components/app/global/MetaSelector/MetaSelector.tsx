import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.tsx';
import { Button } from '@/components/ui/button.tsx';
import { MetaQueryParams, useGetMetas } from '@/api/meta';

export interface MetaSelectorProps {
  value?: number;
  onChange: (value: number) => void;
  queryParams?: MetaQueryParams;
}

const MetaSelector: React.FC<MetaSelectorProps> = ({ value, onChange, queryParams = {} }) => {
  const { data, isLoading, error } = useGetMetas(queryParams);

  // Find the selected meta to display its name in the button
  const selectedMeta = data?.data.find(item => item.meta.id === value);

  // Convert value to string for RadioGroup since it expects a string
  const valueAsString = value !== undefined ? String(value) : undefined;

  const handleValueChange = React.useCallback(
    (newValue: string) => {
      console.log('New value selected:', newValue);
      onChange(Number(newValue));
    },
    [onChange],
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="min-w-[150px] w-full text-xs justify-between"
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : selectedMeta ? selectedMeta.meta.name : 'Select Meta'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {error ? (
          <div className="p-2 text-sm text-red-500">Error loading metas</div>
        ) : (
          <DropdownMenuRadioGroup value={valueAsString} onValueChange={handleValueChange}>
            {data?.data.map(item => (
              <DropdownMenuRadioItem key={item.meta.id} value={String(item.meta.id)}>
                {item.meta.name} ({item.format.name})
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default MetaSelector;
