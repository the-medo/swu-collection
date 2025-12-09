import React from 'react';
import CostIcon from '@/components/app/global/icons/CostIcon.tsx';
import {
  useCardPoolDeckDetailStore,
  useCardPoolDeckDetailStoreActions,
} from '@/components/app/limited/CardPoolDeckDetail/useCardPoolDeckDetailStore.ts';
import { Button } from '@/components/ui/button.tsx';
import { ButtonGroup } from '@/components/ui/button-group.tsx';
import { XIcon } from 'lucide-react';
import { useGetUserSetting } from '@/api/user/useGetUserSetting.ts';

const costs: number[] = [0, 1, 2, 3, 4, 5, 6];

const CPCostFilters: React.FC = () => {
  const { filterCost } = useCardPoolDeckDetailStore();
  const { setFilterCost } = useCardPoolDeckDetailStoreActions();
  const { data: catPosition } = useGetUserSetting('cpLayout_catPosition');
  const compact = (catPosition ?? 'top') === 'left';

  const isSelected = (c: number) => !!filterCost[c];
  const hasAnySpecificSelected = Object.keys(filterCost).some(k => k !== 'all');

  const toggleCost = (c: number) => {
    // Start from current selection excluding 'all'
    const next: Record<number, true> = {};
    for (const key of Object.keys(filterCost)) {
      if (key === 'all') continue;
      const num = Number(key);
      if (!Number.isNaN(num)) next[num] = true;
    }

    if (next[c]) {
      // Deselect this cost
      delete next[c];
    } else {
      // Select this cost
      next[c] = true;
    }

    // If no specific selected, fall back to 'all'
    if (Object.keys(next).length === 0) {
      setFilterCost({ all: true });
    } else {
      setFilterCost(next);
    }
  };

  return (
    <ButtonGroup className="flex-wrap">
      {costs.map(c => {
        const displayValue = c === 6 ? '6+' : c;
        const selected = isSelected(c) && hasAnySpecificSelected;
        return (
          <Button
            key={c}
            onClick={() => toggleCost(c)}
            variant={selected ? 'default' : 'outline'}
            size={compact ? 'xs' : 'sm'}
            aria-pressed={selected}
            aria-label={`Filter by cost ${displayValue}`}
            title={`Cost: ${displayValue}`}
          >
            <CostIcon cost={displayValue} size={compact ? 'small' : 'medium'} />
          </Button>
        );
      })}

      {/* Reset filters button */}
      <Button
        onClick={() => setFilterCost({ all: true })}
        variant="outline"
        size={compact ? 'xs' : 'sm'}
        className="ring-0"
        aria-label="Reset cost filters"
        title="Reset cost filters"
      >
        <XIcon />
      </Button>
    </ButtonGroup>
  );
};

export default CPCostFilters;
