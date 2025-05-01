import { useCallback } from 'react';
import LeaderSelector from '@/components/app/global/LeaderSelector/LeaderSelector.tsx';
import BaseSelector from '@/components/app/global/BaseSelector/BaseSelector.tsx';
import MultiAspectFilter from '@/components/app/global/MultiAspectFilter/MultiAspectFilter.tsx';
import { SwuAspect } from '../../../../../../types/enums.ts';
import { Button } from '@/components/ui/button.tsx';
import { RefreshCcw } from 'lucide-react';
import {
  useDeckFilterStore,
  useDeckFilterStoreActions,
  useInitializeDeckFilterFromUrlParams,
} from '@/components/app/decks/DeckFilters/useDeckFilterStore.ts';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useLabel } from '@/components/app/tournaments/TournamentMeta/useLabel.tsx';
import { MetaInfo } from '@/components/app/tournaments/TournamentMeta/MetaInfoSelector.tsx';
import { Route } from '@/routes/__root.tsx';

interface TournamentDeckFiltersProps {}

const TournamentDeckFilters: React.FC<TournamentDeckFiltersProps> = () => {
  const search = useSearch({ strict: false });
  const navigate = useNavigate({ from: Route.fullPath });
  const key = search.maDeckKey;
  const keyMetaInfo = search.maDeckKeyType;
  const labelRenderer = useLabel();

  const initialized = useInitializeDeckFilterFromUrlParams(false);
  const { leaders, base, aspects, activeFiltersCount } = useDeckFilterStore(false);

  const activeFilters = activeFiltersCount || (key && keyMetaInfo ? 1 : 0);

  const { setLeaders, setBase, setAspects, resetFilters } = useDeckFilterStoreActions();

  // Leader selection handling
  const onLeaderChange = useCallback((leaderCardId: string | undefined) => {
    setLeaders(leaderCardId ? [leaderCardId] : []);
  }, []);

  // Base selection handling
  const onBaseChange = useCallback((baseCardId: string | undefined) => {
    setBase(baseCardId);
  }, []);

  // Aspect filter handling
  const onAspectChange = useCallback((selectedAspects: SwuAspect[]) => {
    setTimeout(() => setAspects(selectedAspects), 50);
  }, []);

  const handleResetFilters = useCallback(() => {
    setTimeout(() => {
      resetFilters();
      navigate({
        search: prev => ({ ...prev, maDeckKey: undefined, maDeckKeyType: undefined }),
      });
    }, 50);
  }, []);

  if (!initialized) {
    return <div className="p-2 flex justify-center">Loading filters...</div>;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 mb-0">
      <Button variant="default" disabled={!activeFilters} onClick={handleResetFilters} size="sm">
        <RefreshCcw className="h-4 w-4 mr-2" /> Reset Filters ({activeFilters})
      </Button>
      {key && keyMetaInfo ? (
        <div className="flex flex-row gap-2 items-center p-2">
          <span className="font-bold">Filtered by key:</span>
          {labelRenderer(key, keyMetaInfo as MetaInfo, 'compact', 'left')}
        </div>
      ) : (
        <>
          <LeaderSelector
            trigger={null}
            size="w100"
            leaderCardId={leaders[0]}
            onLeaderSelected={onLeaderChange}
          />

          <BaseSelector
            trigger={null}
            size="w100"
            baseCardId={base}
            onBaseSelected={onBaseChange}
          />

          <MultiAspectFilter
            value={aspects}
            onChange={onAspectChange}
            multiSelect={true}
            multiMainAspects={true}
            showLabel={false}
            showAllOption={false}
            showNoneOption={false}
            className="justify-start"
          />
        </>
      )}
    </div>
  );
};

export default TournamentDeckFilters;
