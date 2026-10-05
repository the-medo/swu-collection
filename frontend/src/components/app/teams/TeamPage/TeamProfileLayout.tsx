import type { ReactNode } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { ProfileHeader } from '@/components/app/users/UserDetail/ProfileHeader.tsx';
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
  children,
}: {
  team: Pick<Team, 'name' | 'logoUrl'>;
  sidebar: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh min-w-0 flex-col">
      <ProfileHeader />
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
        <header className="col-start-2 row-start-1 min-w-0 p-4">
          <h1 className="m-0! min-w-0 p-0 text-[clamp(28px,3.2cqi,44px)]! leading-[1.15]! font-bold! tracking-[-0.045em]! [overflow-wrap:anywhere]">
            {team.name}
          </h1>
        </header>
        <aside className={sidebarClassName} aria-label="Team sidebar">
          {sidebar}
        </aside>
        <div className={contentClassName}>{children}</div>
      </div>
    </div>
  );
}

export function TeamProfileSkeleton() {
  return (
    <div
      className="flex min-h-dvh min-w-0 flex-col"
      role="status"
      aria-label="Loading team"
      aria-busy="true"
    >
      <ProfileHeader />
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
