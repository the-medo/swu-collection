import type { useTeamMembers } from '@/api/teams';
import * as React from 'react';
import { UserDisplay } from '@/components/app/global/UserDisplay.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.tsx';
import { MoreHorizontal, Shield, ShieldOff, UserX, LogOut, Link2, Unlink } from 'lucide-react';
import { Switch } from '@/components/ui/switch.tsx';
import { AutoAddDeckTooltip } from '@/components/app/teams/TeamPage/components/AutoAddDeckTooltip.tsx';

type Member = NonNullable<ReturnType<typeof useTeamMembers>['data']>[number];

interface MemberRowProps {
  member: Member;
  isSelf: boolean;
  isOwner: boolean;
  canLeave: boolean;
  onPromote: () => void;
  onDemote: () => void;
  onKick: () => void;
  onLeave: () => void;
  onAutoAddDeckChange: (checked: boolean) => void;
}

const MemberRow: React.FC<MemberRowProps> = ({
  member,
  isSelf,
  isOwner,
  canLeave,
  onPromote,
  onDemote,
  onKick,
  onLeave,
  onAutoAddDeckChange,
}) => {
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-3 transition-colors hover:bg-muted/20 @[680px]/team-members:grid-cols-[minmax(180px,1fr)_140px_185px_32px]">
      <div className="col-start-1 row-start-1 min-w-0 space-y-1 @[680px]/team-members:row-span-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <UserDisplay
            user={{
              id: member.userId,
              displayName: member.name ?? 'Unknown user',
              image: member.image,
            }}
            size="md"
          />
          {isSelf && <span className="text-xs text-muted-foreground">you</span>}
          <Badge
            variant="outline"
            className={
              member.role === 'owner'
                ? 'gap-1 border-primary/20 bg-primary/10 text-primary'
                : 'font-normal text-muted-foreground'
            }
          >
            {member.role === 'owner' && <Shield className="size-3" aria-hidden="true" />}
            {member.role === 'owner' ? 'Owner' : 'Member'}
          </Badge>
        </div>
        <p className="text-xs leading-5! text-muted-foreground">
          Joined {new Date(member.joinedAt).toLocaleDateString()}
        </p>
      </div>
      <div className="col-start-1 row-start-2 flex items-center gap-1.5 text-xs text-muted-foreground @[680px]/team-members:col-start-2 @[680px]/team-members:row-start-1 @[680px]/team-members:row-span-2">
        {member.integration ? (
          <Link2 className="size-3.5 text-primary" aria-hidden="true" />
        ) : (
          <Unlink className="size-3.5" aria-hidden="true" />
        )}
        Karabast {member.integration ? 'linked' : 'not linked'}
      </div>
      {(isOwner || isSelf) && (
        <div className="col-span-2 row-start-3 flex items-center gap-2 border-t border-dashed pt-2 @[680px]/team-members:col-span-1 @[680px]/team-members:col-start-3 @[680px]/team-members:row-start-1 @[680px]/team-members:row-span-2 @[680px]/team-members:border-0 @[680px]/team-members:pt-0">
          <Switch
            aria-label={`Auto-add played decks for ${member.name ?? 'Unknown user'}`}
            checked={member.autoAddDeck}
            onCheckedChange={onAutoAddDeckChange}
          />
          <span className="whitespace-nowrap text-xs text-muted-foreground">Auto-add decks</span>
          <AutoAddDeckTooltip />
        </div>
      )}
      {(isOwner || isSelf) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Manage ${member.name ?? 'member'}`}
              className="col-start-2 row-start-1 h-8 w-8 self-start @[680px]/team-members:col-start-4 @[680px]/team-members:row-span-2 @[680px]/team-members:self-center"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isOwner && member.role !== 'owner' && (
              <DropdownMenuItem onClick={onPromote}>
                <Shield className="mr-2 h-4 w-4" />
                Promote to Owner
              </DropdownMenuItem>
            )}
            {isOwner && member.role === 'owner' && !isSelf && (
              <DropdownMenuItem onClick={onDemote}>
                <ShieldOff className="mr-2 h-4 w-4" />
                Demote to Member
              </DropdownMenuItem>
            )}
            {isSelf ? (
              <DropdownMenuItem className="text-destructive" disabled={!canLeave} onClick={onLeave}>
                <LogOut className="mr-2 h-4 w-4" />
                Leave Team
              </DropdownMenuItem>
            ) : (
              isOwner && (
                <DropdownMenuItem className="text-destructive" onClick={onKick}>
                  <UserX className="mr-2 h-4 w-4" />
                  Kick from Team
                </DropdownMenuItem>
              )
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
};

export default MemberRow;
