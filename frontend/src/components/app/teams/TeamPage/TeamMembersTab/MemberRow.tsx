import * as React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.tsx';
import { MoreHorizontal, Shield, ShieldOff, UserX, LogOut } from 'lucide-react';
import { Switch } from '@/components/ui/switch.tsx';
import InfoTooltip from '@/components/app/global/InfoTooltip/InfoTooltip.tsx';
import { AutoAddDeckTooltip } from '@/components/app/teams/TeamPage/components/AutoAddDeckTooltip.tsx';

interface Member {
  userId: string;
  name: string | null;
  image: string | null;
  joinedAt: string;
  role: 'owner' | 'member';
  autoAddDeck: boolean;
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
    <div className="flex items-center gap-3 p-3 rounded-lg border">
      <Avatar className="w-10 h-10">
        <AvatarImage src={member.image ?? undefined} alt={member.name ?? 'User'} />
        <AvatarFallback>{(member.name ?? 'U').charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col flex-1">
        <span className="font-medium">
          {member.name ?? 'Unknown user'}
          {isSelf && <span className="text-muted-foreground font-normal"> (you)</span>}
        </span>
        <span className="text-xs text-muted-foreground">
          Joined {new Date(member.joinedAt).toLocaleDateString()}
        </span>
      </div>
      {(isOwner || isSelf) && (
        <div className="flex items-center gap-2 mr-10" title="Auto-add deck">
          <AutoAddDeckTooltip />
          <span className="text-xs text-muted-foreground">Auto-add played decks to team</span>
          <Switch checked={member.autoAddDeck} onCheckedChange={onAutoAddDeckChange} />
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
