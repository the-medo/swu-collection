import React from 'react';
import { Badge } from '@/components/ui/badge.tsx';
import { Button } from '@/components/ui/button.tsx';
import { XIcon } from 'lucide-react';
import { cn } from '@/lib/utils.ts';
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
    <div className="flex items-center gap-2 flex-wrap">
      {TYPES.map(t => {
        const selected = isSelected(t);
        return (
          <Badge
            key={t}
            role="button"
            tabIndex={0}
            onClick={() => toggleType(t)}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleType(t);
              }
            }}
            aria-pressed={selected}
            aria-label={`Filter by type ${t}`}
            title={`Type: ${t}`}
            className={cn(
              'cursor-pointer select-none',
              selected ? 'ring-4 ring-foreground bg-foreground text-background' : 'ring-0'
            )}
            variant={selected ? 'default' : 'outline'}
          >
            {t}
          </Badge>
        );
      })}

      <Button
        onClick={reset}
        variant="ghost"
        size="iconMedium"
        className="p-1 ring-0"
        aria-label="Reset type filters"
        title="Reset type filters"
      >
        <XIcon />
      </Button>
    </div>
  );
};

export default CPTypeFilters;
