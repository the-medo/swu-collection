import * as React from 'react';
import { useTeamMembers, usePromoteMember, useDemoteMember, useKickMember } from '@/api/teams';
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
  const { data: members, isLoading } = useTeamMembers(teamId);
  const promoteMember = usePromoteMember(teamId);
  const demoteMember = useDemoteMember(teamId);
  const kickMember = useKickMember(teamId);

  const [dialogTarget, setDialogTarget] = React.useState<DialogTarget>(null);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 py-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-full" />
            <Skeleton className="h-4 w-[150px]" />
          </div>
        ))}
      </div>
    );
  }

  if (!members || members.length === 0) {
    return <p className="text-muted-foreground py-4">No members found.</p>;
  }

  const isLastMember = members.length <= 1;
  const ownersCount = members.filter(m => m.role === 'owner').length;
  const isSelf = (userId: string) => currentUser?.id === userId;

  return (
    <>
      <div className="flex flex-col gap-2 py-4">
        {members.map(member => (
          <MemberRow
            key={member.userId}
            member={member as any}
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
          />
        ))}
      </div>

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
