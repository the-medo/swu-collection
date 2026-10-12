import type { MouseEventHandler } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar.tsx';
import {
  UserProfilePopover,
  type PublicProfileSummary,
} from '@/components/app/users/UserProfilePopover.tsx';
import { cn } from '@/lib/utils.ts';

type UserDisplayProps = {
  user: Omit<PublicProfileSummary, 'id'> & { id?: string | null };
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  className?: string;
  onPreviewLinkClick?: MouseEventHandler<HTMLAnchorElement>;
};

/** A public identity; profile data is loaded only when its preview opens. */
export function UserDisplay({
  user,
  size = 'sm',
  showName = true,
  className,
  onPreviewLinkClick,
}: UserDisplayProps) {
  const displayName = user.displayName.trim() || 'Unknown user';
  const classes = cn(
    'inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-md p-0.5 align-middle text-left text-xs font-medium leading-tight',
    showName && 'pr-1.5',
    size !== 'sm' && 'gap-2 text-sm',
    className,
  );
  const identity = (
    <>
      <Avatar
        className={cn(
          'size-6 border border-border/60',
          size === 'md' && 'size-8',
          size === 'lg' && 'size-10',
        )}
      >
        <AvatarImage src={user.image ?? undefined} alt="" referrerPolicy="no-referrer" />
        <AvatarFallback className="bg-muted text-[10px] text-muted-foreground">
          {displayName.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span className={showName ? 'min-w-0 break-words [overflow-wrap:anywhere]' : 'sr-only'}>
        {displayName}
      </span>
    </>
  );

  if (!user.id) return <span className={classes}>{identity}</span>;

  return (
    <UserProfilePopover
      user={{ ...user, id: user.id, displayName }}
      onLinkClick={onPreviewLinkClick}
    >
      <button
        type="button"
        aria-label={`View ${displayName}'s profile`}
        className={cn(
          classes,
          'cursor-pointer transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        )}
        onClick={event => {
          event.stopPropagation();
        }}
        onKeyDown={event => event.stopPropagation()}
      >
        {identity}
      </button>
    </UserProfilePopover>
  );
}
