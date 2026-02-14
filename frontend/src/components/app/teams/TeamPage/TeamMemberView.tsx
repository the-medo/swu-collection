import * as React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.tsx';
import TeamDecksTab from './TeamDecksTab.tsx';
import TeamMembersTab from './TeamMembersTab.tsx';
import TeamSettingsTab from './TeamSettingsTab.tsx';
import TeamJoinRequestsTab from './TeamJoinRequestsTab.tsx';
import type { Team } from '../../../../../../server/db/schema/team.ts';

type TeamWithMembership = Team & {
  membership: { role: string; joinedAt: string } | null;
};

interface TeamMemberViewProps {
  team: TeamWithMembership;
  isOwner: boolean;
}

const TeamMemberView: React.FC<TeamMemberViewProps> = ({ team, isOwner }) => {
  return (
    <Tabs defaultValue="decks" className="w-full">
      <TabsList>
        <TabsTrigger value="decks">Decks</TabsTrigger>
        <TabsTrigger value="members">Members</TabsTrigger>
        {isOwner && <TabsTrigger value="settings">Settings</TabsTrigger>}
        {isOwner && <TabsTrigger value="join-requests">Join Requests</TabsTrigger>}
      </TabsList>
      <TabsContent value="decks">
        <TeamDecksTab teamId={team.id} />
      </TabsContent>
      <TabsContent value="members">
        <TeamMembersTab teamId={team.id} />
      </TabsContent>
      {isOwner && (
        <TabsContent value="settings">
          <TeamSettingsTab team={team} />
        </TabsContent>
      )}
      {isOwner && (
        <TabsContent value="join-requests">
          <TeamJoinRequestsTab teamId={team.id} />
        </TabsContent>
      )}
    </Tabs>
  );
};

export default TeamMemberView;
