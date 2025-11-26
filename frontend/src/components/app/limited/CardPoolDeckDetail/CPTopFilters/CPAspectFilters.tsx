import React from 'react';
import AspectIcon from '@/components/app/global/icons/AspectIcon.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Checkbox } from '@/components/ui/checkbox.tsx';
import { cn } from '@/lib/utils.ts';
import { XIcon } from 'lucide-react';
import { ButtonGroup } from '@/components/ui/button-group.tsx';
import { aspectArray } from '../../../../../../../types/iterableEnumInfo.ts';
import {
  useCardPoolDeckDetailStore,
  useCardPoolDeckDetailStoreActions,
} from '@/components/app/limited/CardPoolDeckDetail/useCardPoolDeckDetailStore.ts';
import { useCPLeaderBaseAspects } from '@/components/app/limited/CardPoolDeckDetail/CPTopFilters/useCPLeaderBaseAspects.ts';
import { useGetUserSetting } from '@/api/user/useGetUserSetting.ts';

interface CPAspectFiltersProps {
  deckId?: string;
}

const CPAspectFilters: React.FC<CPAspectFiltersProps> = ({ deckId }) => {
  const { filterAspects, exactAspects } = useCardPoolDeckDetailStore();
  const { setFilterAspects, setExactAspects } = useCardPoolDeckDetailStoreActions();
  const leaderBaseAspects = useCPLeaderBaseAspects(deckId);
  const isOnlyLeaderBaseSelected = filterAspects === 'showOnlyLeaderAndBaseAspects';
  const { data: catPosition } = useGetUserSetting('cpLayout_catPosition');
  const compact = (catPosition ?? 'top') === 'left';

  const onReset = () => {
    setFilterAspects('all');
    setExactAspects(false);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <ButtonGroup className="flex-wrap">
        {/* Leader + Base aspects button */}
        <Button
          variant={isOnlyLeaderBaseSelected ? 'default' : 'outline'}
          size={compact ? 'xs' : 'sm'}
          onClick={() => setFilterAspects('showOnlyLeaderAndBaseAspects')}
          aria-pressed={isOnlyLeaderBaseSelected}
          aria-label={`Filter by leader/base aspects: ${leaderBaseAspects.join(', ')}`}
          title={
            leaderBaseAspects.length
              ? `Leader/Base: ${leaderBaseAspects.join(', ')}`
              : 'Leader/Base aspects'
          }
        >
          <div className="flex items-center gap-1">
            {leaderBaseAspects.length > 0 ? (
              leaderBaseAspects.map(a => (
                <AspectIcon key={a} aspect={a} size={compact ? 'xSmall' : 'small'} />
              ))
            ) : (
              <span className="text-xs opacity-70">Leader/Base</span>
            )}
          </div>
        </Button>

        {/* Individual aspect buttons */}
        {aspectArray.map(a => {
          const selected = filterAspects === a;
          return (
            <Button
              key={a}
              onClick={() => setFilterAspects(a)}
              variant={selected ? 'default' : 'outline'}
              size={compact ? 'xs' : 'sm'}
              aria-pressed={selected}
              aria-label={`Filter by aspect ${a}`}
              title={`Aspect: ${a}`}
            >
              <AspectIcon aspect={a} size={compact ? 'xSmall' : 'medium'} />
            </Button>
          );
        })}

        {/* Reset filters button */}
        <Button
          onClick={onReset}
          variant="outline"
          size={compact ? 'xs' : 'sm'}
          className="ring-0"
          aria-label="Reset aspect filters"
          title="Reset aspect filters"
        >
          <XIcon />
        </Button>
      </ButtonGroup>

      {/* Exact aspects checkbox */}
      <label
        className={cn(
          'flex items-center gap-2 text-xs opacity-90',
          compact ? 'ml-1' : 'ml-2',
          isOnlyLeaderBaseSelected ? 'opacity-60' : '',
        )}
      >
        <Checkbox
          checked={exactAspects}
          onCheckedChange={checked => setExactAspects(Boolean(checked))}
          disabled={isOnlyLeaderBaseSelected}
          aria-label="Exact aspects"
        />
        Exact aspects
      </label>
    </div>
  );
};

export default CPAspectFilters;
