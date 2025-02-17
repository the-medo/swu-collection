import {
  CollectionSortBy,
  SortByOptions,
} from '@/components/app/collections/CollectionContents/CollectionSettings/useCollectionLayoutStore.ts';
import { useCallback } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import * as React from 'react';

interface CollectionLayoutSortBySelectProps {
  index: number;
  options: SortByOptions[];
  value: SortByOptions | undefined;
  setValue: (value: CollectionSortBy | undefined, index: number) => void;
}

const CollectionLayoutSortBySelect: React.FC<CollectionLayoutSortBySelectProps> = ({
  index,
  options,
  value,
  setValue,
}) => {
  const onValueChange = useCallback(
    (v: string) => {
      setValue(v && v !== 'empty' ? (v as CollectionSortBy) : undefined, index);
    },
    [setValue, index],
  );

  return (
    <div className="w-[130px]">
      <Select value={value?.value} onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue placeholder="-" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="empty">-</SelectItem>
          {[value, ...options].map(l =>
            l ? (
              <SelectItem key={l.value} value={l.value}>
                {l.label}
              </SelectItem>
            ) : null,
          )}
        </SelectContent>
      </Select>
    </div>
  );
};

export default CollectionLayoutSortBySelect;
