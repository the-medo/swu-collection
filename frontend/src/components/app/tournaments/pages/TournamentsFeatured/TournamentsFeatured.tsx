import * as React from 'react';
import TournamentPageHeader from '@/components/app/tournaments/TournamentPageHeader';
import TournamentNavigation from '@/components/app/tournaments/TournamentNavigation/TournamentNavigation.tsx';
import { useSearch } from '@tanstack/react-router';
import { useMemo } from 'react';
import TournamentGroup from '@/components/app/tournaments/TournamentGroup/TournamentGroup.tsx';
import { useGetTournamentGroups } from '@/api/tournament-groups';

interface TournamentsFeaturedProps {}

const TournamentsFeatured: React.FC<TournamentsFeaturedProps> = ({}) => {
  const { metaId } = useSearch({ strict: false });

  const params = useMemo(
    () => ({
      meta: metaId,
      visible: true,
    }),
    [metaId],
  );

  // Fetch tournament groups data
  const { data: tournamentGroupsData } = useGetTournamentGroups(params);

  return (
    <>
      <TournamentNavigation />
      <TournamentPageHeader title="Tournaments" />
      {metaId && tournamentGroupsData && (
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
    </>
  );
};

export default TournamentsFeatured;
