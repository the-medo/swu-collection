import React, { useMemo } from 'react';
import AspectIcon from '@/components/app/global/icons/AspectIcon.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Checkbox } from '@/components/ui/checkbox.tsx';
import { cn } from '@/lib/utils.ts';
import { XIcon } from 'lucide-react';
import { aspectArray } from '../../../../../../../types/iterableEnumInfo.ts';
import { SwuAspect } from '../../../../../../../types/enums.ts';
import {
  useCardPoolDeckDetailStore,
  useCardPoolDeckDetailStoreActions,
} from '@/components/app/limited/CardPoolDeckDetail/useCardPoolDeckDetailStore.ts';
import { useCardList } from '@/api/lists/useCardList.ts';
import { useGetDeck } from '@/api/decks/useGetDeck.ts';

interface CPAspectFiltersProps {
  deckId?: string;
}

const CPAspectFilters: React.FC<CPAspectFiltersProps> = ({ deckId }) => {
  const { selectedLeaderId, selectedBaseId, filterAspects, exactAspects } =
    useCardPoolDeckDetailStore();
  const { setFilterAspects, setExactAspects } = useCardPoolDeckDetailStoreActions();
  const { data: cardListData } = useCardList();
  const { data: deckData } = useGetDeck(deckId);

  const deckLeaderId = deckData?.deck?.leaderCardId1 ?? '';
  const deckBaseId = deckData?.deck?.baseCardId ?? '';

  const leaderBaseAspects = useMemo(() => {
    const set = new Set<SwuAspect>();
    const leaderId = selectedLeaderId === '' ? deckLeaderId : selectedLeaderId;
    const baseId = selectedBaseId === '' ? deckBaseId : selectedBaseId;

    const leader = leaderId ? cardListData?.cards?.[leaderId] : undefined;
    const base = baseId ? cardListData?.cards?.[baseId] : undefined;
    (leader?.aspects as SwuAspect[] | undefined)?.forEach(a => set.add(a));
    (base?.aspects as SwuAspect[] | undefined)?.forEach(a => set.add(a));
    return Array.from(set);
  }, [selectedLeaderId, selectedBaseId, cardListData?.cards, deckLeaderId, deckBaseId]);

  const isOnlyLeaderBaseSelected = filterAspects === 'showOnlyLeaderAndBaseAspects';

  const onReset = () => {
    setFilterAspects('all');
    setExactAspects(false);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Leader + Base aspects button */}
      <Button
        variant="outline"
        size="sm"
        className={cn('px-2 h-8', isOnlyLeaderBaseSelected ? 'ring-4 ring-foreground' : 'ring-0')}
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
            leaderBaseAspects.map(a => <AspectIcon key={a} aspect={a} size="small" />)
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
            variant="ghost"
            size="iconMedium"
            className={cn('p-1', selected ? 'ring-4 ring-foreground bg-foreground' : 'ring-0')}
            aria-pressed={selected}
            aria-label={`Filter by aspect ${a}`}
            title={`Aspect: ${a}`}
          >
            <AspectIcon aspect={a} />
          </Button>
        );
      })}

      {/* Reset filters button */}
      <Button
        onClick={onReset}
        variant="ghost"
        size="iconMedium"
        className="p-1 ring-0"
        aria-label="Reset aspect filters"
        title="Reset aspect filters"
      >
        <XIcon />
      </Button>

      {/* Exact aspects checkbox */}
      <label
        className={cn(
          'flex items-center gap-2 text-xs opacity-90 ml-2',
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
