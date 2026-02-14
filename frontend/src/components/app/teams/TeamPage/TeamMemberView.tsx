import * as React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.tsx';
import TeamDecksTab from './TeamDecksTab.tsx';
import TeamMembersTab from './TeamMembersTab.tsx';
import TeamSettingsTab from './TeamSettingsTab.tsx';
import TeamJoinRequestsTab from './TeamJoinRequestsTab.tsx';
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
  const { data: requests } = useJoinRequests(isOwner ? team.id : undefined);
  const requestsCount = requests?.length ?? 0;

  return (
    <Tabs defaultValue="decks" className="w-full">
      <TabsList className="w-full">
        <TabsTrigger value="decks" className="flex-1">
          Decks
        </TabsTrigger>
        <TabsTrigger value="members" className="flex-1">
          Members
          {isOwner && requestsCount > 0 && (
            <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
              {requestsCount}
            </span>
          )}
        </TabsTrigger>
        {isOwner && (
          <TabsTrigger value="settings" className="flex-1">
            Settings
          </TabsTrigger>
        )}
      </TabsList>
      <TabsContent value="decks">
        <TeamDecksTab teamId={team.id} />
      </TabsContent>
      <TabsContent value="members">
        <TeamMembersTab teamId={team.id} />
        {isOwner && <TeamJoinRequestsTab teamId={team.id} />}
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
