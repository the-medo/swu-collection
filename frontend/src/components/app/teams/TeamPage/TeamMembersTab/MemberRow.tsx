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
import { MoreHorizontal, Shield, ShieldOff, UserX, LogOut, Check, X } from 'lucide-react';
import { Switch } from '@/components/ui/switch.tsx';
import { AutoAddDeckTooltip } from '@/components/app/teams/TeamPage/components/AutoAddDeckTooltip.tsx';

interface Member {
  userId: string;
  name: string | null;
  image: string | null;
  joinedAt: string;
  role: 'owner' | 'member';
  autoAddDeck: boolean;
  allowTeamDeckEdits: boolean;
  integration?: string | null;
}

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
  onAllowTeamDeckEditsChange: (checked: boolean) => void;
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
  onAllowTeamDeckEditsChange,
}) => {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border">
      <div className="flex min-w-0 flex-col flex-1">
        <span className="flex flex-wrap items-center gap-1">
          <UserDisplay
            user={{
              id: member.userId,
              displayName: member.name ?? 'Unknown user',
              image: member.image,
            }}
            size="lg"
          />
          {isSelf && <span className="text-muted-foreground font-normal"> (you)</span>}
        </span>
        <span className="text-xs text-muted-foreground">
          Joined {new Date(member.joinedAt).toLocaleDateString()}
        </span>
      </div>

      <Badge
        variant={member.integration ? 'success' : 'warning'}
        className="flex items-center gap-2"
      >
        <span>Karabast linked:</span>{' '}
        {member.integration ? <Check className="size-4" /> : <X className="size-4" />}
      </Badge>
      {(isOwner || isSelf) && (
        <div className="flex flex-col gap-2 mr-10">
          <div className="flex items-center justify-end gap-2" title="Auto-add deck">
            <AutoAddDeckTooltip />
            <span className="text-xs text-muted-foreground">Auto-add played decks</span>
            <Switch checked={member.autoAddDeck} onCheckedChange={onAutoAddDeckChange} />
          </div>
          <div
            className="flex items-center justify-end gap-2"
            title="Let teammates edit and save versions of this member's team-linked decks"
          >
            <span className="text-xs text-muted-foreground">Allow shared deck editing</span>
            <Switch
              checked={member.allowTeamDeckEdits}
              disabled={!isSelf && !member.allowTeamDeckEdits}
              onCheckedChange={onAllowTeamDeckEditsChange}
            />
          </div>
        </div>
      )}
      <Badge variant={member.role === 'owner' ? 'default' : 'secondary'}>{member.role}</Badge>
      {(isOwner || isSelf) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
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
