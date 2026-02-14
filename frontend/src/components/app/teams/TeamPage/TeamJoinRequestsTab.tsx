import * as React from 'react';
import { useJoinRequests, useHandleJoinRequest } from '@/api/teams';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { Check, X } from 'lucide-react';

interface TeamJoinRequestsTabProps {
  teamId: string;
}

const TeamJoinRequestsTab: React.FC<TeamJoinRequestsTabProps> = ({ teamId }) => {
  const { data: requests, isLoading } = useJoinRequests(teamId);
  const handleJoinRequest = useHandleJoinRequest(teamId);

  if (isLoading && !requests) {
    return (
      <div className="flex flex-col gap-3 py-4">
        {[1, 2].map(i => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-full" />
            <Skeleton className="h-4 w-[150px]" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 py-4">
      <h4>Join Requests</h4>
      {!requests ||
        (requests.length === 0 && (
          <p className="text-muted-foreground">No pending join requests.</p>
        ))}
      {requests?.map(request => (
        <div key={request.id} className="flex items-center gap-3 p-3 rounded-lg border">
          <Avatar className="w-10 h-10">
            <AvatarImage src={request.userImage ?? undefined} alt={request.userName ?? 'User'} />
            <AvatarFallback>{(request.userName ?? 'U').charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col flex-1">
            <span className="font-medium">{request.userName ?? 'Unknown user'}</span>
            <span className="text-xs text-muted-foreground">
              Requested {new Date(request.createdAt).toLocaleDateString()}
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="default"
              onClick={() =>
                handleJoinRequest.mutate({ requestId: request.id, status: 'approved' })
              }
              disabled={handleJoinRequest.isPending}
            >
              <Check className="w-4 h-4 mr-1" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                handleJoinRequest.mutate({ requestId: request.id, status: 'rejected' })
              }
              disabled={handleJoinRequest.isPending}
            >
              <X className="w-4 h-4 mr-1" />
              Reject
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TeamJoinRequestsTab;
