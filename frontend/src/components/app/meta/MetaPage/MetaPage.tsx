import { useNavigate, useSearch } from '@tanstack/react-router';
import { useGetMetas } from '@/api/meta';
import { useCallback, useMemo } from 'react';
import { formatData, formatDataById } from '../../../../../../types/Format.ts';
import FormatSelect from '@/components/app/decks/components/FormatSelect.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import MetaSelector from '@/components/app/global/MetaSelector/MetaSelector.tsx';
import TournamentTypeSelect from '@/components/app/tournaments/components/TournamentTypeSelect.tsx';
import { DEFAULT_MIN_TOURNAMENT_TYPE, Route } from '@/routes/meta';
import MetaPageContent from '@/components/app/meta/MetaPageContent/MetaPageContent.tsx';
import { AlertCircle, SlidersHorizontal } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert.tsx';
import { Helmet } from 'react-helmet-async';
import { useGetTournamentGroup } from '@/api/tournament-groups';
import { useSidebar } from '@/components/ui/sidebar.tsx';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion.tsx';
import MetaPageWeekSelectorBySelectedGroup from '@/components/app/meta/MetaPage/MetaPageWeekSelectorBySelectedGroup.tsx';

function MetaPage() {
  const { isMobile } = useSidebar();
  const navigate = useNavigate({ from: Route.fullPath });
  const {
    metaId: metaIdFromSearch,
    formatId,
    minTournamentType,
    maTournamentGroupId,
  } = useSearch({
    from: Route.fullPath,
  });
  const { data, isLoading } = useGetMetas();

  // Fetch tournament group information if ID is present
  const { data: tournamentGroup, isLoading: isLoadingTournamentGroup } = useGetTournamentGroup(
    (maTournamentGroupId as string) || '',
  );

  const tournaments = useMemo(() => {
    if (!tournamentGroup || !maTournamentGroupId) return undefined;
    return tournamentGroup.data?.tournaments.map(t => ({
      tournament: t.tournament,
      tournamentType: t.tournamentType,
      meta: tournamentGroup.data?.meta,
      deck: t.deck,
      position: t.position,
    }));
  }, [tournamentGroup, maTournamentGroupId]);

  const metaId = tournamentGroup?.data?.meta?.id || metaIdFromSearch;

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

  const selectedMeta = useMemo(() => {
    if (!data) return undefined;

    if (metaId) {
      const metaInFormat = data?.data.find(m => m.format.id === formatId && m.meta.id === metaId);
      if (metaInFormat) {
        return metaInFormat;
      }
    }

    return data.data.length > 0 ? currentMeta : undefined;
  }, [data, formatId, metaId, currentMeta]);

  const selectedMetaId = selectedMeta ? selectedMeta.meta.id : undefined;

  if (isLoading || isLoadingTournamentGroup) {
    return (
      <div className="p-2 h-full">
        <div className="flex flex-row gap-4 items-center justify-between mb-4">
          {!isMobile && <h3>Meta</h3>}
          <span className="text-gray-600">Format</span>
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
        <Skeleton className="h-[500px] w-full rounded-lg flex items-center justify-center">
          Loading...
        </Skeleton>
      </div>
    );
  }

  const isPQWeekMeta = tournamentGroup && tournamentGroup.data.group?.name?.startsWith('PQ Week');

  return (
    <>
      <Helmet titleTemplate={`%s - ${selectedMeta?.meta?.name}`} defaultTitle={`Meta - SWU Base`} />

      <div className="p-2">
        {tournamentGroup && tournamentGroup.data?.group ? (
          <div className="flex flex-row flex-wrap gap-4 items-center justify-between mb-4">
            <h3 className="mb-0">
              {isPQWeekMeta ? 'PQ Meta Analysis' : `Meta - ${tournamentGroup.data?.group.name}`}
            </h3>
            <div className="flex flex-row flex-1 gap-2 items-center max-w-[500px]">
              <MetaPageWeekSelectorBySelectedGroup tournamentGroup={tournamentGroup.data} />
            </div>
          </div>
        ) : isMobile ? (
          // Mobile view with accordion
          <Accordion type="single" collapsible defaultValue={undefined} className="w-full mb-2">
            <AccordionItem value="header" className="border rounded-md">
              <div className="flex flex-col items-start">
                <AccordionTrigger className="px-4 pt-3 pb-1 hover:no-underline" right>
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4" />
                    <span className="font-medium">Meta definition</span>
                  </div>
                </AccordionTrigger>
                {selectedMeta && formatId && (
                  <span className="text-xs text-muted-foreground p-2">
                    {formatDataById[formatId]?.name} - {selectedMeta.meta.name} - Min. type:{' '}
                    {minTournamentType}
                  </span>
                )}
              </div>
              <AccordionContent className="p-4">
                <div className="flex flex-col gap-4">
                  <div className="space-y-2">
                    <span className="text-gray-600">Format</span>
                    <FormatSelect
                      value={formatId}
                      onChange={setFormat}
                      allowEmpty={false}
                      showInfoTooltip={false}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <span className="text-gray-600">Meta</span>
                    {selectedMetaId && (
                      <MetaSelector
                        formatId={formatId}
                        value={selectedMetaId}
                        onChange={setMeta}
                        emptyOption={false}
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <span className="text-gray-600">Min. tournament type</span>
                    <TournamentTypeSelect
                      value={minTournamentType}
                      onChange={setMinTournamentType}
                      showFullName={true}
                      emptyOption={false}
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        ) : (
          // Desktop view (unchanged)
          <div className="flex flex-row flex-wrap gap-4 items-center justify-between mb-4">
            <h3 className="mb-0">Meta</h3>
            <div className="flex flex-row flex-1 gap-2 items-center min-w-[200px]">
              <span className="text-gray-600">Format:</span>
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
            <div className="flex flex-1 gap-2 items-center min-w-[200px]">
              <div className="flex flex-1 text-nowrap text-gray-600">Min. type:</div>
              <TournamentTypeSelect
                value={minTournamentType}
                onChange={setMinTournamentType}
                showFullName={true}
                emptyOption={false}
              />
            </div>
          </div>
        )}
        {selectedMetaId ? (
          <MetaPageContent
            formatId={formatId}
            metaId={selectedMetaId}
            minTournamentType={minTournamentType}
            tournaments={tournaments}
            tournamentGroupId={maTournamentGroupId as string}
          />
        ) : (
          <Alert variant="warning">
            <AlertCircle className="h-4 w-4 text-yellow-500 stroke-yellow-500" />
            <AlertTitle className="text-sm">Meta not selected</AlertTitle>
            <AlertDescription className="pt-4">Please select Meta to continue</AlertDescription>
          </Alert>
        )}
      </div>
    </>
  );
}

export default MetaPage;
