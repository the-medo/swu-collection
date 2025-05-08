import { useNavigate, useSearch } from '@tanstack/react-router';
import { useGetMetas } from '@/api/meta';
import { useCallback, useMemo } from 'react';
import { formatData } from '../../../../../../types/Format.ts';
import FormatSelect from '@/components/app/decks/components/FormatSelect.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import MetaSelector from '@/components/app/global/MetaSelector/MetaSelector.tsx';
import TournamentTypeSelect from '@/components/app/tournaments/components/TournamentTypeSelect.tsx';
import { Route } from '@/routes/meta';
import MetaPageContent from '@/components/app/meta/MetaPageContent/MetaPageContent.tsx';

function MetaPage() {
  const navigate = useNavigate({ from: Route.fullPath });
  const { metaId, formatId, minTournamentType } = useSearch({ from: Route.fullPath });
  const { data, isLoading } = useGetMetas();

  const setFormat = useCallback(
    (v: number | null) => {
      navigate({
        search: prev => ({ ...prev, formatId: v ?? formatData[0].id }),
      });
    },
    [navigate],
  );

  const setMeta = useCallback(
    (v: number) => {
      navigate({
        search: prev => ({ ...prev, metaId: v }),
      });
    },
    [navigate],
  );

  const setMinTournamentType = useCallback(
    (v: string | undefined) => {
      navigate({
        search: prev => ({ ...prev, minTournamentType: v ?? DEFAULT_MIN_TOURNAMENT_TYPE }),
      });
    },
    [navigate],
  );

  const currentMeta = useMemo(() => {
    return data?.data
      .filter(m => m.format.id === formatId)
      .sort((a, b) => (a.meta.date < b.meta.date ? 1 : -1))[0];
  }, [data, formatId]);

  const selectedMetaId = useMemo(() => {
    if (!data) return undefined;

    if (metaId) {
      const metaInFormat = data?.data.find(m => m.format.id === formatId && m.meta.id === metaId);
      if (metaInFormat) {
        return metaId;
      }
    }

    return data.data.length > 0 ? currentMeta?.meta.id : undefined;
  }, [data, formatId, metaId, currentMeta]);

  return (
    <div className="p-2">
      <div className="flex flex-row gap-4 items-center justify-between mb-4">
        <h3>Meta</h3>
        <span className="text-gray-600">Format</span>
        <FormatSelect
          value={formatId}
          onChange={setFormat}
          allowEmpty={false}
          showInfoTooltip={false}
        />
        {isLoading ? (
          <Skeleton className="h-12 w-full rounded-lg" />
        ) : (
          <MetaSelector formatId={formatId} value={selectedMetaId} onChange={setMeta} />
        )}
        <TournamentTypeSelect
          value={minTournamentType}
          onChange={setMinTournamentType}
          showFullName={true}
          emptyOption={false}
        />
      </div>
      <MetaPageContent
        formatId={formatId}
        metaId={selectedMetaId}
        minTournamentType={minTournamentType}
      />
    </div>
  );
}

export default MetaPage;
