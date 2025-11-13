import React, { useCallback } from 'react';
import LeaderSelector from '@/components/app/global/LeaderSelector/LeaderSelector.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Switch } from '@/components/ui/switch.tsx';
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
import { cardPoolSets } from '../../../../../../server/lib/card-pools/card-pool-info.ts';

interface CardPoolFiltersProps {
  initialized?: boolean;
}

const CardPoolFilters: React.FC<CardPoolFiltersProps> = ({ initialized }) => {
  const { set, type, custom, leader, activeFiltersCount, hasActiveFilters } =
    useCardPoolFilterStore();
  const { setSet, setType, setCustom, setLeader, resetFilters } = useCardPoolFilterStoreActions();

  const onLeaderChange = useCallback((leaderCardId: string | undefined) => {
    setLeader(leaderCardId);
  }, []);

  const onSetChange = useCallback((setId: string | null) => {
    setSet(setId || undefined);
  }, []);

  const onTypeChange = useCallback((v: string) => {
    setType((v || undefined) as CardPoolType | undefined);
  }, []);

  const onCustomToggle = useCallback((v: boolean) => {
    setCustom(v);
  }, []);

  const handleReset = useCallback(() => {
    setTimeout(() => resetFilters(), 50);
  }, []);

  if (!initialized) {
    return <div className="p-2 flex justify-center">Loading filters...</div>;
  }

  const typeOptions: { value: CardPoolType; label: string }[] = [
    { value: CardPoolType.Sealed, label: 'Sealed' },
    { value: CardPoolType.Prerelease, label: 'Prerelease' },
    { value: CardPoolType.Draft, label: 'Draft' },
  ];

  return (
    <div className="p-2 flex flex-wrap items-center gap-2">
      {/* Leader prepared for the future - control visible now */}
      <LeaderSelector
        trigger={null}
        size="w100"
        leaderCardId={leader}
        onLeaderSelected={onLeaderChange}
      />

      <div className="w-[230px]">
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
          <Button variant="outline" className="w-[200px] justify-between">
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

      {/* Custom toggle */}
      <div className="inline-flex items-center gap-2 px-3 py-2 border rounded-md">
        <Switch checked={!!custom} onCheckedChange={onCustomToggle} id="pool-custom-switch" />
        <label htmlFor="pool-custom-switch" className="text-sm">
          Custom only
        </label>
      </div>

      <div className="flex justify-end pt-2">
        <Button variant="secondary" size="sm" disabled={!hasActiveFilters} onClick={handleReset}>
          <RefreshCcw className="h-4 w-4 mr-2" /> Reset Filters ({activeFiltersCount})
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
