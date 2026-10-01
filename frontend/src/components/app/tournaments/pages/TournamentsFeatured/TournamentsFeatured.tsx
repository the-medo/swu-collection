import * as React from 'react';
import TournamentPageHeader from '@/components/app/tournaments/TournamentPageHeader';
import TournamentNavigation from '@/components/app/tournaments/TournamentNavigation/TournamentNavigation.tsx';
import { useSearch } from '@tanstack/react-router';
import { useEffect } from 'react';
import TournamentGroup from '@/components/app/tournaments/TournamentGroup/TournamentGroup.tsx';
import { useGetTournamentGroups } from '@/api/tournament-groups';
import { useGetMeta, useGetMetas } from '@/api/meta';
import { useSidebar } from '@/components/ui/sidebar.tsx';
import { Button } from '@/components/ui/button.tsx';

const TournamentsFeatured = () => {
  const { metaId } = useSearch({ strict: false });
  const { isMobile } = useSidebar();
  const { data: metasData, isLoading: isLoadingMetas } = useGetMetas();
  const setFromList = metasData?.data.find(item => item.meta.id === metaId)?.meta.set;
  const fallbackMetaId = metaId && !isLoadingMetas && !setFromList ? metaId : undefined;
  const { data: metaData, isLoading: isLoadingMeta } = useGetMeta(fallbackMetaId);
  const set = setFromList ?? metaData?.data.meta.set;
  const canLoadGroups = Boolean(metaId) && !isLoadingMetas && !isLoadingMeta;

  const {
    data: tournamentGroupsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
    isPending,
    isError,
    refetch,
  } = useGetTournamentGroups({
    meta: set ? undefined : metaId,
    set,
    visible: true,
    enabled: canLoadGroups,
  });

  useEffect(() => {
    if (canLoadGroups && hasNextPage && !isFetchingNextPage && !isFetchNextPageError) {
      void fetchNextPage();
    }
  }, [canLoadGroups, fetchNextPage, hasNextPage, isFetchingNextPage, isFetchNextPageError]);

  return (
    <>
      <TournamentNavigation />
      <TournamentPageHeader title="Tournaments" />
      {canLoadGroups && isPending && <p>Loading tournament groups…</p>}
      {canLoadGroups && isError && !tournamentGroupsData && (
        <div role="alert">
          <p>Could not load tournament groups.</p>
          <Button onClick={() => void refetch()}>Retry</Button>
        </div>
      )}
      {canLoadGroups && tournamentGroupsData?.pages.every(page => page.data.length === 0) && (
        <p>No featured tournament groups found.</p>
      )}
      {metaId && tournamentGroupsData && (
        <div className="mb-8">
          {tournamentGroupsData.pages.map((page, pageIndex) => (
            <React.Fragment key={`page-${pageIndex}`}>
              {page.data.map(group => (
                <TournamentGroup key={group.group.id} group={group} isMobile={isMobile} />
              ))}
            </React.Fragment>
          ))}
        </div>
      )}
      {isFetchNextPageError && (
        <div role="alert">
          <p>Could not load more tournament groups.</p>
          <Button onClick={() => void fetchNextPage()}>Retry</Button>
        </div>
      )}
    </>
  );
};

export default TournamentsFeatured;
