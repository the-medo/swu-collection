import React from 'react';
import { useCardList } from '@/api/lists/useCardList';
import GenericMultiSelect from '@/components/app/global/GenericMultiSelect/GenericMultiSelect.tsx';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator.tsx';
import { RefreshCcw } from 'lucide-react';
import {
  useCardPoolDeckDetailStore,
  useCardPoolDeckDetailStoreActions,
} from '../useCardPoolDeckDetailStore';

export interface CPLeftFiltersProps {
  className?: string;
}

const CPLeftFilters: React.FC<CPLeftFiltersProps> = ({ className }) => {
  const { data: cardListData } = useCardList();
  const { filterTraits, filterKeywords, activeFiltersCount } = useCardPoolDeckDetailStore();
  const { setFilterTraits, setFilterKeywords, resetFilters } = useCardPoolDeckDetailStoreActions();

  return (
    <div className={className}>
      <h3 className="text-sm font-semibold mb-2">Filters</h3>
      <div className="space-y-2">
        {cardListData ? (
          <GenericMultiSelect
            label="Traits"
            placeholder="Select traits..."
            options={cardListData.allTraits}
            value={filterTraits}
            onChange={setFilterTraits}
            maxCount={4}
          />
        ) : (
          <div className="text-center py-2">Loading traits...</div>
        )}
        {cardListData ? (
          <GenericMultiSelect
            label="Keywords"
            placeholder="Select keywords..."
            options={cardListData.allKeywords}
            value={filterKeywords}
            onChange={setFilterKeywords}
            maxCount={4}
          />
        ) : (
          <div className="text-center py-2">Loading keywords...</div>
        )}
      </div>
      <div className="px-6 my-2">
        <Separator />
      </div>
      <div className="flex items-center justify-between">
        <div className="text-xs">Applied: {activeFiltersCount}</div>
        {activeFiltersCount > 0 && (
          <Button size="sm" variant="secondary" onClick={resetFilters}>
            <RefreshCcw className="mr-2 h-4 w-4" /> Reset
          </Button>
        )}
      </div>
    </div>
  );
};

export default CPLeftFilters;
