import * as React from 'react';
import { Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  useTeamMembers,
  usePromoteMember,
  useDemoteMember,
  useKickMember,
  useUpdateMemberAutoAddDeck,
} from '@/api/teams';
import { useUser } from '@/hooks/useUser.ts';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import MemberRow from './MemberRow';
import PromoteDialog from './PromoteDialog';
import DemoteDialog from './DemoteDialog';
import KickDialog from './KickDialog';
import LeaveDialog from './LeaveDialog';

interface TeamMembersTabProps {
  teamId: string;
  isOwner?: boolean;
}

type TeamMemberAction = 'promote' | 'demote' | 'kick' | 'leave';
type DialogTarget = { userId: string; name: string; action: TeamMemberAction } | null;

const TeamMembersTab: React.FC<TeamMembersTabProps> = ({ teamId, isOwner }) => {
  const currentUser = useUser();
  const { data: members, isLoading, isError, refetch } = useTeamMembers(teamId);
  const promoteMember = usePromoteMember(teamId);
  const demoteMember = useDemoteMember(teamId);
  const kickMember = useKickMember(teamId);
  const updateMemberAutoAddDeck = useUpdateMemberAutoAddDeck(teamId);

  const [dialogTarget, setDialogTarget] = React.useState<DialogTarget>(null);

  if (isLoading) {
    return (
      <div
        role="status"
        aria-label="Loading members"
        className="space-y-3 rounded-xl border bg-card p-4"
      >
        {[1, 2, 3].map(i => (
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
        <p>Unable to load team members.</p>
        <Button size="sm" variant="outline" onClick={() => void refetch()}>
          Try again
        </Button>
      </div>
    );

  if (!members || members.length === 0) {
    return (
      <p className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">
        No members found.
      </p>
    );
  }

  const isLastMember = members.length <= 1;
  const ownersCount = members.filter(m => m.role === 'owner').length;
  const isSelf = (userId: string) => currentUser?.id === userId;

  return (
    <>
      <section
        aria-labelledby="team-members-heading"
        className="@container/team-members overflow-hidden rounded-xl border border-[color:var(--workspace-border)] bg-card"
      >
        <header className="flex items-center justify-between gap-3 border-b bg-muted/20 px-4 py-3">
          <h2
            id="team-members-heading"
            className="m-0! border-0! p-0! flex items-center gap-2 text-base! font-semibold!"
          >
            <Users className="size-4 text-primary" aria-hidden="true" /> Members{' '}
            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {members.length}
            </span>
          </h2>
          <span className="text-xs text-muted-foreground">
            {ownersCount} {ownersCount === 1 ? 'owner' : 'owners'}
          </span>
        </header>
        <div className="divide-y">
          {members.map(member => (
            <MemberRow
              key={member.userId}
              member={member}
              isSelf={isSelf(member.userId)}
              isOwner={!!isOwner}
              canLeave={!isLastMember && (member.role !== 'owner' || ownersCount > 1)}
              onPromote={() =>
                setDialogTarget({
                  userId: member.userId,
                  name: member.name ?? 'Unknown user',
                  action: 'promote',
                })
              }
              onDemote={() =>
                setDialogTarget({
                  userId: member.userId,
                  name: member.name ?? 'Unknown user',
                  action: 'demote',
                })
              }
              onKick={() =>
                setDialogTarget({
                  userId: member.userId,
                  name: member.name ?? 'Unknown user',
                  action: 'kick',
                })
              }
              onLeave={() =>
                setDialogTarget({
                  userId: member.userId,
                  name: member.name ?? 'Unknown user',
                  action: 'leave',
                })
              }
              onAutoAddDeckChange={checked =>
                updateMemberAutoAddDeck.mutate({ userId: member.userId, autoAddDeck: checked })
              }
            />
          ))}
        </div>
      </section>

      {dialogTarget?.action === 'promote' && (
        <PromoteDialog
          target={dialogTarget}
          onOpenChange={open => !open && setDialogTarget(null)}
          onConfirm={userId => {
            promoteMember.mutate(userId);
            setDialogTarget(null);
          }}
        />
      )}

      {dialogTarget?.action === 'demote' && (
        <DemoteDialog
          target={dialogTarget}
          onOpenChange={open => !open && setDialogTarget(null)}
          onConfirm={userId => {
            demoteMember.mutate(userId);
            setDialogTarget(null);
          }}
        />
      )}

      {dialogTarget?.action === 'kick' && (
        <KickDialog
          target={dialogTarget}
          onOpenChange={open => !open && setDialogTarget(null)}
          onConfirm={userId => {
            kickMember.mutate(userId);
            setDialogTarget(null);
          }}
        />
      )}

      {dialogTarget?.action === 'leave' && (
        <LeaveDialog
          target={dialogTarget}
          onOpenChange={open => !open && setDialogTarget(null)}
          onConfirm={userId => {
            kickMember.mutate(userId);
            setDialogTarget(null);
          }}
        />
      )}
    </>
  );
};

export default TeamMembersTab;
