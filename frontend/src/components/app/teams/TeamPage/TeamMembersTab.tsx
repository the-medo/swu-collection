import * as React from 'react';
import { useTeamMembers } from '@/api/teams';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';

interface TeamMembersTabProps {
  teamId: string;
}

const TeamMembersTab: React.FC<TeamMembersTabProps> = ({ teamId }) => {
  const { data: members, isLoading } = useTeamMembers(teamId);

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

  return (
    <div className="flex flex-col gap-2 py-4">
      {members.map(member => (
        <div key={member.userId} className="flex items-center gap-3 p-3 rounded-lg border">
          <Avatar className="w-10 h-10">
            <AvatarImage src={member.image ?? undefined} alt={member.name ?? 'User'} />
            <AvatarFallback>{(member.name ?? 'U').charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col flex-1">
            <span className="font-medium">{member.name ?? 'Unknown user'}</span>
            <span className="text-xs text-muted-foreground">
              Joined {new Date(member.joinedAt).toLocaleDateString()}
            </span>
          </div>
          <Badge variant={member.role === 'owner' ? 'default' : 'secondary'}>{member.role}</Badge>
        </div>
      ))}
    </div>
  );
};

export default TeamMembersTab;
