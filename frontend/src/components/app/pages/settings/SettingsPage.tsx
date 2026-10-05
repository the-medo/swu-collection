import NotificationSettings from './NotificationSettings.tsx';
import CollectionAndWantlistSettings from './CollectionAndWantlistSettings.tsx';
import UserSettings from './UserSettings.tsx';
import UploadsSettings from './uploads/UploadsSettings.tsx';
import WatchedPlayersSettings from './WatchedPlayersSettings.tsx';
import DevelopmentSettings from './DevelopmentSettings.tsx';
import HomeLocationSettings from './HomeLocationSettings.tsx';
import SidebarSettings from './SidebarSettings.tsx';
import FeaturesSettings from './FeaturesSettings.tsx';
import IntegrationsSettings from './IntegrationsSettings.tsx';
import { SettingsNavigation } from './SettingsNavigation.tsx';
import { settingsItems } from './settingsNavigation.ts';
import { CalendarWeekStart } from '@/components/app/tournaments/calendar/CalendarWeekStart.tsx';
import { Helmet } from 'react-helmet-async';
import { Route } from '@/routes/_authenticated/settings';
import { cn } from '@/lib/utils.ts';
import { useUser } from '@/hooks/useUser.ts';
import { ProfileHeader } from '@/components/app/users/UserDetail/ProfileHeader.tsx';
import { ProfileAvatar } from '@/components/app/users/UserDetail/ProfileSidebar.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';

export function SettingsPage() {
  const { page } = Route.useSearch();
  const user = useUser();
  const current = settingsItems.find(item => item.id === page)!;
  if (!user) return null;

  return (
    <>
      <Helmet title={`${current.label} · User settings | SWUBase`} />
      <div className="flex min-h-dvh min-w-0 flex-col">
        <ProfileHeader />
        <div className="grid min-w-0 flex-1 grid-cols-[92px_minmax(0,1fr)] grid-rows-[auto_auto_1fr] @[401px]/main-body:grid-cols-[112px_minmax(0,1fr)] @[761px]/main-body:grid-cols-[208px_minmax(0,1fr)] @[761px]/main-body:grid-rows-[auto_1fr] @[1001px]/main-body:grid-cols-[240px_minmax(0,1fr)]">
          <ProfileAvatar user={user} canEdit />
          <header className="col-start-2 row-start-1 flex min-w-0 flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0 space-y-1">
              <h1 className="m-0! min-w-0 p-0 text-[clamp(28px,3.2cqi,44px)]! leading-[1.15]! font-bold! tracking-[-0.045em]! [overflow-wrap:anywhere]">
                User settings
              </h1>
              <p className="m-0 text-sm text-muted-foreground [overflow-wrap:anywhere]">
                {user.displayName}
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/users/$userId" params={{ userId: user.id }}>
                View profile <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
          </header>
          <aside
            aria-label="Settings sidebar"
            className="col-span-2 row-start-2 min-w-0 border-border p-4 @[761px]/main-body:col-span-1 @[761px]/main-body:col-start-1 @[761px]/main-body:border-r @[761px]/main-body:bg-card"
          >
            <SettingsNavigation page={current.id} />
          </aside>
          <div className="col-span-2 row-start-3 min-w-0 border-t border-border p-4 @[761px]/main-body:col-span-1 @[761px]/main-body:col-start-2 @[761px]/main-body:row-start-2 @[761px]/main-body:p-6">
            <section
              key={page}
              aria-labelledby="settings-heading"
              className={cn(
                '@container/settings-content min-w-0 space-y-6',
                page === 'uploads' ? 'max-w-6xl' : page === 'profile' ? 'max-w-4xl' : 'max-w-2xl',
              )}
            >
              <div className="flex min-w-0 items-center gap-3 border-b border-border pb-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <current.icon className="size-4" aria-hidden="true" />
                </span>
                <h2 id="settings-heading" className="m-0! min-w-0 border-0! p-0! text-xl! font-semibold!">
                  {current.label}
                </h2>
              </div>
              {page === 'uploads' && <UploadsSettings />}
              {page === 'collections-and-wantlists' && <CollectionAndWantlistSettings />}
              {page === 'profile' && <UserSettings />}
              {page === 'integrations' && <IntegrationsSettings />}
              {page === 'watched-players' && <WatchedPlayersSettings />}
              {page === 'calendar' && <CalendarWeekStart />}
              {page === 'sidebar' && <SidebarSettings />}
              {page === 'features' && <FeaturesSettings />}
              {page === 'notifications' && <NotificationSettings />}
              {page === 'home-location' && <HomeLocationSettings />}
              {page === 'development' && <DevelopmentSettings />}
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
