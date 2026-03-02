import * as React from 'react';
import { Button } from '@/components/ui/button.tsx';
import { useSubmitJoinRequest } from '@/api/teams';
import { useUser } from '@/hooks/useUser.ts';
import SignIn from '@/components/app/auth/SignIn.tsx';
import { Users, Clock, XCircle } from 'lucide-react';
import type { Team } from '../../../../../../server/db/schema/team.ts';

type TeamWithMembership = Team & {
  membership: { role: string; joinedAt: string } | null;
  joinRequest: { id: string; status: string; createdAt: string } | null;
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

  const joinRequest = team.joinRequest;
  const isPending = joinRequest?.status === 'pending' || submitJoinRequest.isSuccess;
  const isRejected = joinRequest?.status === 'rejected';

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
        isRejected ? (
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 text-destructive">
              <XCircle className="w-5 h-5" />
              <span className="font-medium">Your request was rejected</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Your request to join this team has been rejected. You cannot send another request.
            </p>
          </div>
        ) : isPending ? (
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-5 h-5" />
              <span className="font-medium">Request pending</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Your request to join this team is awaiting approval from the team owner.
            </p>
          </div>
        ) : (
          <Button size="lg" onClick={handleJoinRequest} disabled={submitJoinRequest.isPending}>
            {submitJoinRequest.isPending ? 'Sending...' : 'Request to Join'}
          </Button>
        )
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
