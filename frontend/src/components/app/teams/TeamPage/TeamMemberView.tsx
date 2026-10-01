import * as React from 'react';
import { getRouteApi } from '@tanstack/react-router';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.tsx';
import TeamDecksTab from './TeamDecksTab/TeamDecksTab.tsx';
import TeamMembersTab from './TeamMembersTab/TeamMembersTab.tsx';
import TeamSettingsTab from './TeamSettingsTab.tsx';
import TeamJoinRequestsTab from './TeamJoinRequestsTab.tsx';
import { TeamEventsTab } from './TeamEventsTab.tsx';
import { useJoinRequests } from '@/api/teams';
import type { Team } from '../../../../../../server/db/schema/team.ts';

type TeamWithMembership = Team & {
  membership: { role: string; joinedAt: string } | null;
};

interface TeamMemberViewProps {
  team: TeamWithMembership;
  isOwner: boolean;
}

const TeamMemberView: React.FC<TeamMemberViewProps> = ({ team, isOwner }) => {
  const route = getRouteApi('/teams/$teamId/');
  const { teamTab = 'decks' } = route.useSearch();
  const navigate = route.useNavigate();
  const { data: requests } = useJoinRequests(isOwner ? team.id : undefined);
  const requestsCount = requests?.filter(r => r.status === 'pending').length ?? 0;
  React.useEffect(() => {
    if (teamTab === 'settings' && !isOwner)
      void navigate({
        search: previous => ({ ...previous, teamTab: undefined }),
        replace: true,
        resetScroll: false,
      });
  }, [teamTab, isOwner, navigate]);

  return (
    <Tabs
      value={teamTab === 'settings' && !isOwner ? 'decks' : teamTab}
      onValueChange={value => {
        if (value === 'decks' || value === 'members' || value === 'events' || value === 'settings')
          void navigate({
            search: previous => ({ ...previous, teamTab: value }),
            resetScroll: false,
          });
      }}
      className="w-full"
    >
      <TabsList className="h-auto w-full items-stretch">
        <TabsTrigger
          value="decks"
          className="min-w-0 flex-1 basis-0 flex-wrap gap-1 whitespace-normal px-2 text-xs sm:text-sm"
        >
          Decks
        </TabsTrigger>
        <TabsTrigger
          value="members"
          className="min-w-0 flex-1 basis-0 flex-wrap gap-1 whitespace-normal px-2 text-xs sm:text-sm"
        >
          Members
          {isOwner && requestsCount > 0 && (
            <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
              {requestsCount}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger
          value="events"
          className="min-w-0 flex-1 basis-0 flex-wrap gap-1 whitespace-normal px-2 text-xs sm:text-sm"
        >
          Team events
        </TabsTrigger>
        {isOwner && (
          <TabsTrigger
            value="settings"
            className="min-w-0 flex-1 basis-0 flex-wrap gap-1 whitespace-normal px-2 text-xs sm:text-sm"
          >
            Settings
          </TabsTrigger>
        )}
      </TabsList>
      <TabsContent value="decks">
        <TeamDecksTab teamId={team.id} />
      </TabsContent>
      <TabsContent value="members">
        <TeamMembersTab teamId={team.id} isOwner={isOwner} />
        {isOwner && <TeamJoinRequestsTab teamId={team.id} />}
      </TabsContent>
      <TabsContent value="events">
        <TeamEventsTab teamId={team.id} />
      </TabsContent>
      {isOwner && (
        <TabsContent value="settings">
          <TeamSettingsTab team={team} />
        </TabsContent>
      )}
    </Tabs>
  );
};

export default TeamMemberView;
