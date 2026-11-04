import { useCallback } from 'react';
import LeaderSelector from '@/components/app/global/LeaderSelector/LeaderSelector.tsx';
import BaseSelector from '@/components/app/global/BaseSelector/BaseSelector.tsx';
import MultiAspectFilter from '@/components/app/global/MultiAspectFilter/MultiAspectFilter.tsx';
import { SwuAspect } from '../../../../../../types/enums.ts';
import { Button } from '@/components/ui/button.tsx';
import { RefreshCcw } from 'lucide-react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useLabel } from '@/components/app/tournaments/TournamentMeta/useLabel.tsx';
import { MetaInfo } from '@/components/app/tournaments/TournamentMeta/MetaInfoSelector.tsx';

const TournamentDeckFilters = () => {
  const search = useSearch({ strict: false });
  const navigate = useNavigate();
  const key = search.maDeckKey;
  const keyMetaInfo = search.maDeckKeyType;
  const labelRenderer = useLabel();

  const { deckLeaders: leaders, deckBase: base, deckAspects: aspects, deckFormat } = search;
  const activeFiltersCount = [
    !!leaders?.length,
    base !== undefined,
    !!aspects?.length,
    deckFormat !== undefined,
  ].filter(Boolean).length;
  const activeFilters = activeFiltersCount || (key && keyMetaInfo ? 1 : 0);

  const onLeaderChange = useCallback(
    (leaderCardId: string | undefined) => {
      void navigate({
        to: '.',
        replace: true,
        search: previous => ({
          ...previous,
          deckLeaders: leaderCardId ? [leaderCardId] : undefined,
        }),
      });
    },
    [navigate],
  );

  const onBaseChange = useCallback(
    (baseCardId: string | undefined) => {
      void navigate({
        to: '.',
        replace: true,
        search: previous => ({ ...previous, deckBase: baseCardId }),
      });
    },
    [navigate],
  );

  const onAspectChange = useCallback(
    (selectedAspects: SwuAspect[]) => {
      void navigate({
        to: '.',
        replace: true,
        search: previous => ({
          ...previous,
          deckAspects: selectedAspects.length ? selectedAspects : undefined,
        }),
      });
    },
    [navigate],
  );

  const handleResetFilters = useCallback(() => {
    void navigate({
      to: '.',
      replace: true,
      search: previous => ({
        ...previous,
        maDeckKey: undefined,
        maDeckKeyType: undefined,
        deckLeaders: undefined,
        deckBase: undefined,
        deckAspects: undefined,
        deckFormat: undefined,
      }),
    });
  }, [navigate]);

  return (
    <div role="group" aria-label="Deck filters" className="flex flex-wrap items-center gap-2 mb-0">
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
            leaderCardId={leaders?.[0]}
            onLeaderSelected={onLeaderChange}
          />

          <BaseSelector
            trigger={null}
            size="w100"
            baseCardId={base}
            onBaseSelected={onBaseChange}
          />

          <MultiAspectFilter
            value={aspects ?? []}
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
