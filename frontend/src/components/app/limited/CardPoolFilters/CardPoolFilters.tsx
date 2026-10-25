import React, { useCallback } from 'react';
import { Button } from '@/components/ui/button.tsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.tsx';
import { SlidersHorizontal, RefreshCcw } from 'lucide-react';
import {
  useCardPoolFilterStore,
  useCardPoolFilterStoreActions,
} from '@/components/app/limited/CardPoolFilters/useCardPoolFilterStore.ts';
import { SwuSet } from '../../../../../../types/enums.ts';
import { CardPoolType } from '../../../../../../shared/types/cardPools.ts';
import SetSelect from '@/components/app/global/SetSelect.tsx';
import { cardPoolSets } from '../../../../../../lib/swu-resources/card-pool-info.ts';

interface CardPoolFiltersProps {
  initialized?: boolean;
}

const CardPoolFilters: React.FC<CardPoolFiltersProps> = ({ initialized }) => {
  const { set, type, activeFiltersCount, hasActiveFilters } = useCardPoolFilterStore();
  const { setSet, setType, resetFilters } = useCardPoolFilterStoreActions();

  const onSetChange = useCallback(
    (setId: string | null) => {
      setSet(setId || undefined);
    },
    [setSet],
  );

  const onTypeChange = useCallback(
    (v: string) => {
      setType((v || undefined) as CardPoolType | undefined);
    },
    [setType],
  );

  const handleReset = useCallback(() => {
    resetFilters();
  }, [resetFilters]);

  if (!initialized) {
    return <div className="p-2 flex justify-center">Loading filters...</div>;
  }

  const typeOptions: { value: CardPoolType; label: string }[] = [
    { value: CardPoolType.Sealed, label: 'Sealed' },
    { value: CardPoolType.Prerelease, label: 'Prerelease' },
    // { value: CardPoolType.Draft, label: 'Draft' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="w-full sm:w-[230px]">
        <SetSelect
          value={set as SwuSet | null}
          emptyOption={true}
          onChange={onSetChange}
          allowClear
          showFullName
          forcedSetList={cardPoolSets}
        />
      </div>

      {/* Type selector */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="min-w-36 justify-between">
            {type ? typeLabel(type) : 'All Types'}
            <SlidersHorizontal className="h-4 w-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuRadioGroup value={type ?? ''} onValueChange={onTypeChange}>
            <DropdownMenuRadioItem value="">All Types</DropdownMenuRadioItem>
            {typeOptions.map(o => (
              <DropdownMenuRadioItem key={o.value} value={o.value}>
                {o.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex justify-end">
        <Button variant="secondary" size="sm" disabled={!hasActiveFilters} onClick={handleReset}>
          <RefreshCcw className="h-4 w-4 mr-2" /> Reset{' '}
          {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ''}
        </Button>
      </div>
    </div>
  );
};

function typeLabel(t: CardPoolType): string {
  switch (t) {
    case 'sealed':
      return 'Sealed';
    case 'prerelease':
      return 'Prerelease';
    case 'draft':
      return 'Draft';
    default:
      return 'Type';
  }
}

export default CardPoolFilters;
