import * as React from 'react';
import { Button } from '@/components/ui/button.tsx';
import { useSubmitJoinRequest } from '@/api/teams';
import { useUser } from '@/hooks/useUser.ts';
import SignIn from '@/components/app/auth/SignIn.tsx';
import { Users } from 'lucide-react';
import type { Team } from '../../../../../../server/db/schema/team.ts';

type TeamWithMembership = Team & {
  membership: { role: string; joinedAt: string } | null;
};

interface TeamNonMemberViewProps {
  team: TeamWithMembership;
}

const TeamNonMemberView: React.FC<TeamNonMemberViewProps> = ({ team }) => {
  const user = useUser();
  const submitJoinRequest = useSubmitJoinRequest(team.id);

  const handleJoinRequest = () => {
    submitJoinRequest.mutate();
  };

  return (
    <div className="flex flex-col items-center gap-6 py-12 max-w-md mx-auto text-center">
      {team.logoUrl ? (
        <img
          src={team.logoUrl}
          alt={`${team.name} logo`}
          className="w-24 h-24 rounded-xl object-cover"
        />
      ) : (
        <div className="w-24 h-24 rounded-xl bg-muted flex items-center justify-center">
          <Users className="w-12 h-12 text-muted-foreground" />
        </div>
      )}
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold">{team.name}</h2>
        {team.description && <p className="text-muted-foreground">{team.description}</p>}
      </div>
      <p className="text-sm text-muted-foreground">
        You are not a member of this team. Join to see their decks and participate.
      </p>
      {user ? (
        <Button
          size="lg"
          onClick={handleJoinRequest}
          disabled={submitJoinRequest.isPending || submitJoinRequest.isSuccess}
        >
          {submitJoinRequest.isSuccess
            ? 'Request Sent!'
            : submitJoinRequest.isPending
              ? 'Sending...'
              : 'Request to Join'}
        </Button>
      ) : (
        <div className="flex flex-col gap-3 items-center">
          <p className="text-sm text-muted-foreground">Sign in to request to join this team.</p>
          <SignIn />
        </div>
      )}
    </div>
  );
};

export default TeamNonMemberView;
