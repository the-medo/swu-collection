import * as React from 'react';
import { getRouteApi } from '@tanstack/react-router';
import TeamDecksTab from './TeamDecksTab/TeamDecksTab.tsx';
import TeamMembersTab from './TeamMembersTab/TeamMembersTab.tsx';
import TeamSettingsTab from './TeamSettingsTab.tsx';
import TeamJoinRequestsTab from './TeamJoinRequestsTab.tsx';
import { TeamEventsTab } from './TeamEventsTab.tsx';
import type { Team } from '../../../../../../server/db/schema/team.ts';

type TeamWithMembership = Team & {
  membership: { role: string; joinedAt: string } | null;
};

interface TeamMemberViewProps {
  team: TeamWithMembership;
  isOwner: boolean;
}

const route = getRouteApi('/teams/$teamId');

const TeamMemberView: React.FC<TeamMemberViewProps> = ({ team, isOwner }) => {
  const { teamTab = 'decks' } = route.useSearch();
  const navigate = route.useNavigate();
  React.useEffect(() => {
    if (teamTab === 'settings' && !isOwner)
      void navigate({
        search: previous => ({ ...previous, teamTab: undefined }),
        replace: true,
        resetScroll: false,
      });
  }, [teamTab, isOwner, navigate]);

  return (
    <div className="@container/team-decks min-w-0 overflow-x-auto">
      {teamTab === 'members' ? (
        <>
          <TeamMembersTab teamId={team.id} isOwner={isOwner} />
          {isOwner && <TeamJoinRequestsTab teamId={team.id} />}
        </>
      ) : teamTab === 'events' ? (
        <TeamEventsTab teamId={team.id} />
      ) : teamTab === 'settings' && isOwner ? (
        <TeamSettingsTab team={team} />
      ) : (
        <TeamDecksTab teamId={team.id} />
      )}
    </div>
  );
};

export default TeamMemberView;
