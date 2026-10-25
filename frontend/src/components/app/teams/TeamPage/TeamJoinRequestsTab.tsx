import * as React from 'react';
import { useJoinRequests, useHandleJoinRequest, useDeleteJoinRequest } from '@/api/teams';
import { UserDisplay } from '@/components/app/global/UserDisplay.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { Check, X, Trash2, UserPlus, ChevronDown } from 'lucide-react';

interface TeamJoinRequestsTabProps {
  teamId: string;
}

const TeamJoinRequestsTab: React.FC<TeamJoinRequestsTabProps> = ({ teamId }) => {
  const { data: requests, isLoading, isError, refetch } = useJoinRequests(teamId);
  const handleJoinRequest = useHandleJoinRequest(teamId);
  const deleteJoinRequest = useDeleteJoinRequest(teamId);
  const [showRejected, setShowRejected] = React.useState(false);

  const pendingRequests = requests?.filter(r => r.status === 'pending') ?? [];
  const rejectedRequests = requests?.filter(r => r.status === 'rejected') ?? [];

  if (isLoading && !requests) {
    return (
      <div
        role="status"
        aria-label="Loading join requests"
        className="space-y-3 rounded-xl border bg-card p-4"
      >
        {[1, 2].map(i => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-full" />
            <Skeleton className="h-4 w-[150px]" />
          </div>
        ))}
      </div>
    );
  }

  if (isError)
    return (
      <div role="alert" className="space-y-2 rounded-xl border p-4 text-sm">
        <p>Unable to load join requests.</p>
        <Button size="sm" variant="outline" onClick={() => void refetch()}>
          Try again
        </Button>
      </div>
    );

  return (
    <section
      aria-labelledby="team-requests-heading"
      className="overflow-hidden rounded-xl border border-[color:var(--workspace-border)] bg-card"
    >
      <header className="flex items-center gap-2 border-b bg-muted/20 px-4 py-3">
        <UserPlus className="size-4 text-primary" aria-hidden="true" />
        <h2 id="team-requests-heading" className="m-0! border-0! p-0! text-base! font-semibold!">
          Join requests
        </h2>
        <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          {pendingRequests.length}
        </span>
      </header>
      <div className="divide-y">
        {pendingRequests.length === 0 && (
          <div className="flex items-center gap-3 p-4 text-sm">
            <Check className="size-4 text-primary" aria-hidden="true" />
            <p className="text-muted-foreground">You’re all caught up. No pending join requests.</p>
          </div>
        )}
        {pendingRequests.map(request => (
          <div key={request.id} className="flex flex-wrap items-center gap-3 p-4">
            <div className="flex min-w-0 flex-1 basis-48 flex-col gap-1">
              <UserDisplay
                user={{
                  id: request.userId,
                  displayName: request.userName ?? 'Unknown user',
                  image: request.userImage,
                }}
                size="lg"
              />
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
      {rejectedRequests.length > 0 && (
        <div className="space-y-3 border-t px-4 py-3">
          <button
            onClick={() => setShowRejected(prev => !prev)}
            aria-expanded={showRejected}
            aria-controls="rejected-requests"
            className="flex items-center gap-2 rounded text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            <ChevronDown
              className={`size-4 transition-transform ${showRejected ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
            {showRejected ? 'Hide rejected requests' : 'Show rejected requests'} (
            {rejectedRequests.length})
          </button>
          {showRejected && (
            <div id="rejected-requests" className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Rejected users cannot ask to join this team again unless they are removed from the
                rejected list.
              </p>
              {rejectedRequests.map(request => (
                <div
                  key={request.id}
                  className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/20 p-3"
                >
                  <div className="flex min-w-0 flex-1 basis-48 flex-col gap-1">
                    <UserDisplay
                      user={{
                        id: request.userId,
                        displayName: request.userName ?? 'Unknown user',
                        image: request.userImage,
                      }}
                      size="lg"
                    />
                    <span className="text-xs text-muted-foreground">
                      Rejected {new Date(request.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteJoinRequest.mutate(request.id)}
                    disabled={deleteJoinRequest.isPending}
                    title="Remove from rejected list (allows user to request again)"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default TeamJoinRequestsTab;
