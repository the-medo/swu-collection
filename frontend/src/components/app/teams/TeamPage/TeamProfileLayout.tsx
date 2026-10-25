import { workspaceStyles } from '@/components/app/global/WorkspacePage/workspaceStyles';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { ProfileHeaderPreview } from '@/components/app/users/UserDetail/ProfileHeader.tsx';
import { useTeamHeader } from '@/api/teams/useTeamHeader.ts';
import type { Team } from '../../../../../../server/db/schema/team.ts';

const columnsClassName =
  'grid min-w-0 flex-1 grid-cols-[92px_minmax(0,1fr)] grid-rows-[auto_auto_1fr] @[401px]/main-body:grid-cols-[112px_minmax(0,1fr)] @[761px]/main-body:grid-cols-[208px_minmax(0,1fr)] @[761px]/main-body:grid-rows-[auto_1fr] @[1001px]/main-body:grid-cols-[240px_minmax(0,1fr)]';
const avatarColumnClassName =
  'col-start-1 row-start-1 flex items-start justify-center @[761px]/main-body:border-r @[761px]/main-body:border-border @[761px]/main-body:bg-card';
const avatarClassName =
  'relative z-1 -mt-9.5 size-19 shrink-0 rounded-full shadow-[0_0_0_6px_hsl(var(--background)),0_0_0_7px_hsl(var(--border))] @[401px]/main-body:-mt-12 @[401px]/main-body:size-24 @[761px]/main-body:-mt-16 @[761px]/main-body:size-32 @[1001px]/main-body:-mt-18 @[1001px]/main-body:size-36';
const sidebarClassName =
  'col-span-2 row-start-2 min-w-0 border-border p-4 @[761px]/main-body:col-span-1 @[761px]/main-body:col-start-1 @[761px]/main-body:border-r @[761px]/main-body:bg-card';
const contentClassName =
  'col-span-2 row-start-3 min-w-0 border-t border-border p-4 @[761px]/main-body:col-span-1 @[761px]/main-body:col-start-2 @[761px]/main-body:row-start-2';

export function TeamProfileLayout({
  team,
  sidebar,
  actions,
  children,
  compact = false,
}: {
  team: Pick<Team, 'id' | 'name' | 'logoUrl'>;
  sidebar: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  compact?: boolean;
}) {
  if (compact)
    return (
      <div className={cn('min-w-0 p-2 sm:p-3', workspaceStyles.theme)}>
        <header className="mb-3 flex min-w-0 flex-wrap items-center gap-3 border-b pb-3">
          <Link
            to="/teams/$teamId"
            params={{ teamId: team.id }}
            className="flex min-w-0 flex-1 items-center gap-2 rounded-md focus-visible:outline-2 focus-visible:outline-primary"
            aria-label={`Back to ${team.name}`}
          >
            <Avatar className="size-9 rounded-lg">
              <AvatarImage src={team.logoUrl ?? undefined} alt="" />
              <AvatarFallback className="rounded-lg bg-accent text-xs">
                {team.name.trim().slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{team.name}</span>
              <span className="block text-xs text-muted-foreground">Back to team</span>
            </span>
          </Link>
          {actions}
        </header>
        <div className="grid min-w-0 gap-4 @[1001px]/main-body:grid-cols-[200px_minmax(0,1fr)]">
          <aside className="hidden min-w-0 @[1001px]/main-body:block" aria-label="Team sidebar">
            {sidebar}
          </aside>
          <div className="min-w-0">{children}</div>
        </div>
      </div>
    );
  return (
    <div className={cn(workspaceStyles.theme, 'flex min-h-dvh min-w-0 flex-col')}>
      <TeamProfileHeader teamId={team.id} />
      <div className={columnsClassName}>
        <div className={avatarColumnClassName}>
          <Avatar className={avatarClassName}>
            <AvatarImage
              src={team.logoUrl ?? undefined}
              alt={`${team.name} logo`}
              className="object-cover"
            />
            <AvatarFallback className="bg-primary text-3xl font-semibold text-primary-foreground">
              {team.name.trim().slice(0, 2).toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
        </div>
        <header className="col-start-2 row-start-1 flex min-w-0 flex-wrap items-center gap-3 p-4">
          <h1 className="m-0! min-w-0 flex-1 basis-60 p-0 text-[clamp(28px,3.2cqi,44px)]! leading-[1.15]! font-bold! tracking-[-0.045em]! [overflow-wrap:anywhere]">
            {team.name}
          </h1>
          {actions}
        </header>
        <aside className={sidebarClassName} aria-label="Team sidebar">
          {sidebar}
        </aside>
        <div className={contentClassName}>{children}</div>
      </div>
    </div>
  );
}

function TeamProfileHeader({ teamId }: { teamId: string }) {
  const query = useTeamHeader(teamId);
  if (query.isPending)
    return <Skeleton className="h-40 shrink-0 rounded-none @[761px]/main-body:h-56" />;
  return <ProfileHeaderPreview header={query.data} />;
}

export function TeamProfileSkeleton() {
  return (
    <div
      className="flex min-h-dvh min-w-0 flex-col"
      role="status"
      aria-label="Loading team"
      aria-busy="true"
    >
      <Skeleton className="h-40 shrink-0 rounded-none @[761px]/main-body:h-56" />
      <div className={columnsClassName}>
        <div className={avatarColumnClassName}>
          <Skeleton className={avatarClassName} />
        </div>
        <div className="col-start-2 row-start-1 min-w-0 space-y-3 p-4">
          <Skeleton className="h-10 w-64 max-w-full" />
        </div>
        <div className={sidebarClassName}>
          <Skeleton className="mb-4 h-16 w-full" />
          <Skeleton className="h-44 w-full" />
        </div>
        <div className={contentClassName}>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    </div>
  );
}
