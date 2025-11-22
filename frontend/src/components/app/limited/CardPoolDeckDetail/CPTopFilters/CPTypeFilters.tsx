import React from 'react';
import { Button } from '@/components/ui/button.tsx';
import { XIcon } from 'lucide-react';
import { ButtonGroup } from '@/components/ui/button-group.tsx';
import {
  useCardPoolDeckDetailStore,
  useCardPoolDeckDetailStoreActions,
} from '@/components/app/limited/CardPoolDeckDetail/useCardPoolDeckDetailStore.ts';

const TYPES = ['Ground', 'Space', 'Event', 'Upgrade'] as const;

const CPTypeFilters: React.FC = () => {
  const { filterType } = useCardPoolDeckDetailStore();
  const { setFilterType } = useCardPoolDeckDetailStoreActions();

  const isSelected = (t: (typeof TYPES)[number]) => filterType.includes(t);

  const toggleType = (t: (typeof TYPES)[number]) => {
    const selected = isSelected(t);
    if (selected) {
      setFilterType(filterType.filter(x => x !== t));
    } else {
      setFilterType([...filterType, t]);
    }
  };

  const reset = () => setFilterType([]);

  return (
    <ButtonGroup className="flex-wrap">
      {TYPES.map(t => {
        const selected = isSelected(t);
        return (
          <Button
            key={t}
            onClick={() => toggleType(t)}
            aria-pressed={selected}
            aria-label={`Filter by type ${t}`}
            title={`Type: ${t}`}
            variant={selected ? 'default' : 'outline'}
            size="sm"
          >
            {t}
          </Button>
        );
      })}
      <Button
        onClick={reset}
        size="sm"
        variant="outline"
        className="ring-0"
        aria-label="Reset type filters"
        title="Reset type filters"
      >
        <XIcon />
      </Button>
    </ButtonGroup>
  );
};

export default CPTypeFilters;
