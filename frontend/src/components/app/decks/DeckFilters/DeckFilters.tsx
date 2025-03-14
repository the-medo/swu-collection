import LeaderSelector from '@/components/app/global/LeaderSelector/LeaderSelector.tsx';
import BaseSelector from '@/components/app/global/BaseSelector/BaseSelector.tsx';
import { GetDecksRequest } from '@/api/decks/useGetDecks.ts';
import { Dispatch, SetStateAction, useCallback } from 'react';
import MultiAspectFilter from '@/components/app/global/MultiAspectFilter/MultiAspectFilter.tsx';
import { SwuAspect } from '../../../../../../types/enums.ts';

interface DeckFiltersProps {
  filters: GetDecksRequest;
  onFiltersChange: Dispatch<SetStateAction<GetDecksRequest>>;
}

const DeckFilters: React.FC<DeckFiltersProps> = ({ filters, onFiltersChange }) => {
  const leaderCardId = filters?.leaders?.[0];
  const baseCardId = filters?.base;

  const onLeaderChange = useCallback((leaderCardId: string | undefined) => {
    onFiltersChange(p => ({
      ...p,
      leaders: leaderCardId ? [leaderCardId] : undefined,
    }));
  }, []);

  const onBaseChange = useCallback((baseCardId: string | undefined) => {
    onFiltersChange(p => ({
      ...p,
      base: baseCardId,
    }));
  }, []);

  const onAspectChange = useCallback((a: SwuAspect[]) => {}, []);

  return (
    <div className="flex gap-2">
      <LeaderSelector
        trigger={null}
        size="w100"
        leaderCardId={leaderCardId}
        onLeaderSelected={onLeaderChange}
      />
      <BaseSelector
        trigger={null}
        size="w100"
        baseCardId={baseCardId}
        onBaseSelected={onBaseChange}
      />
      <MultiAspectFilter
        value={[]}
        onChange={onAspectChange}
        multiSelect={true}
        showLabel={false}
        showAllOption={false}
        showNoneOption={false}
        // className="justify-center"
      />
    </div>
  );
};

export default DeckFilters;
