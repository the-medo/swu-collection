import NotificationSettings from './NotificationSettings.tsx';
import { Card, CardContent } from '@/components/ui/card.tsx';
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

export function SettingsPage() {
  const { page } = Route.useSearch();
  const current = settingsItems.find(item => item.id === page)!;
  return (
    <>
      <Helmet title="User settings | SWUBase" />
      <div className="flex w-full min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-1">
          <h3>User settings</h3>
          <span className="text-sm text-muted-foreground">{current.label}</span>
        </div>
        <div className="grid min-w-0 gap-4 lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-start">
          <SettingsNavigation page={current.id} />
          {page === 'uploads' ? (
            <UploadsSettings />
          ) : (
            <Card className="min-w-0" key={page}>
              <CardContent className="p-4">
                <section
                  aria-labelledby="settings-heading"
                  className={cn('space-y-4', page !== 'profile' && 'max-w-xl')}
                >
                  <h3 id="settings-heading">{current.label}</h3>
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
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
