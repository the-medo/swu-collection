import { createFileRoute } from '@tanstack/react-router';
import { Button } from '@/components/ui/button.tsx';
import React, { useCallback, useMemo } from 'react';
import NewTournamentDialog from '@/components/app/dialogs/NewTournamentDialog.tsx';
import { usePermissions } from '@/hooks/usePermissions.ts';
import { Helmet } from 'react-helmet-async';
import { formatData } from '../../../../../types/Format.ts';
import FormatSelect from '@/components/app/decks/components/FormatSelect.tsx';
import MetaSelector from '@/components/app/global/MetaSelector/MetaSelector.tsx';
import { useGetMetas } from '@/api/meta';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { useGetTournamentGroups } from '@/api/tournament-groups';
import TournamentGroup from '@/components/app/tournaments/TournamentGroup/TournamentGroup';
import TournamentNavigation from '@/components/app/tournaments/TournamentNavigation/TournamentNavigation';
import { useNavigate, useSearch } from '@tanstack/react-router';

export const Route = createFileRoute('/tournaments/featured/')({
  component: TournamentsFeaturedPage,
});

function TournamentsFeaturedPage() {
  const hasPermission = usePermissions();
  const navigate = useNavigate({ from: Route.fullPath });
  const { formatId = 1, metaId } = useSearch({ from: Route.fullPath });
  const { data: metasData, isLoading: isLoadingMetas } = useGetMetas();

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

  const currentMeta = useMemo(() => {
    return metasData?.data
      .filter(m => m.format.id === formatId)
      .sort((a, b) => (a.meta.date < b.meta.date ? 1 : -1))[0];
  }, [metasData, formatId]);

  const selectedMeta = useMemo(() => {
    if (!metasData) return undefined;

    if (metaId) {
      const metaInFormat = metasData?.data.find(
        m => m.format.id === formatId && m.meta.id === metaId,
      );
      if (metaInFormat) {
        return metaInFormat;
      }
    }

    return metasData.data.length > 0 ? currentMeta : undefined;
  }, [metasData, formatId, metaId, currentMeta]);

  const selectedMetaId = selectedMeta ? selectedMeta.meta.id : undefined;

  const { data: tournamentGroupsData } = useGetTournamentGroups({
    meta: selectedMetaId,
  });

  const canCreate = hasPermission('tournament', 'create');

  if (isLoadingMetas) {
    return (
      <div className="p-2 h-full">
        <div className="flex flex-row gap-4 items-center justify-between mb-4">
          <h3>Tournaments</h3>
          <span className="text-gray-600">Format</span>
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
        <Skeleton className="h-[200px] w-full rounded-lg flex items-center justify-center">
          Loading...
        </Skeleton>
      </div>
    );
  }

  return (
    <>
      <Helmet title="Featured Tournaments | SWUBase" />
      <div className="p-2">
        <div className="flex flex-row flex-wrap gap-4 items-center justify-between mb-4">
          <h3 className="mb-0">Tournaments</h3>
          <div className="flex flex-row flex-1 gap-2 items-center min-w-[200px]">
            <span className="text-gray-600">Format</span>
            <FormatSelect
              value={formatId}
              onChange={setFormat}
              allowEmpty={false}
              showInfoTooltip={false}
              className="w-full"
            />
          </div>

          <div className="flex flex-1 min-w-[350px]">
            {selectedMetaId && (
              <MetaSelector
                formatId={formatId}
                value={selectedMetaId}
                onChange={setMeta}
                emptyOption={false}
              />
            )}
          </div>

          {canCreate && <NewTournamentDialog trigger={<Button>New Tournament</Button>} />}
        </div>

        <TournamentNavigation />

        {selectedMetaId && tournamentGroupsData && (
          <div className="mb-8">
            {tournamentGroupsData.pages.map((page, pageIndex) => (
              <React.Fragment key={`page-${pageIndex}`}>
                {page.data.map(group => (
                  <TournamentGroup key={group.group.id} group={group} />
                ))}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </>
  );
}