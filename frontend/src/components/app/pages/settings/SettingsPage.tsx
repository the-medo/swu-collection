import { Card, CardContent } from '@/components/ui/card.tsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.tsx';
import CollectionAndWantlistSettings from '@/components/app/pages/settings/CollectionAndWantlistSettings.tsx';
import UserSettings from '@/components/app/pages/settings/UserSettings.tsx';
import WatchedPlayersSettings from '@/components/app/pages/settings/WatchedPlayersSettings.tsx';
import DevelopmentSettings from '@/components/app/pages/settings/DevelopmentSettings.tsx';
import HomeLocationSettings from './HomeLocationSettings.tsx';
import { CalendarWeekStart } from '@/components/app/tournaments/calendar/CalendarWeekStart.tsx';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Helmet } from 'react-helmet-async';
import { Route } from '@/routes/_authenticated/settings';

export function SettingsPage() {
  const { page } = useSearch({ from: '/_authenticated/settings/' });
  const navigate = useNavigate({ from: Route.fullPath });

  const handleTabChange = (value: string) => {
    navigate({
      search: prev => ({
        ...prev,
        page: value,
      }),
    });
  };

  return (
    <>
      <Helmet title="User settings | SWUBase" />
      <div className="container mx-auto">
        <Tabs value={page} onValueChange={handleTabChange} className="w-full">
          <TabsList className="h-auto w-full flex-wrap justify-start">
            <TabsTrigger value="collections-and-wantlists" className="flex-1 sm:flex-none">
              Collections and wantlists
            </TabsTrigger>
            <TabsTrigger value="display-name" className="flex-1 sm:flex-none">
              Display name
            </TabsTrigger>
            <TabsTrigger value="watched-players" className="flex-1 sm:flex-none">
              Watched players
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex-1 sm:flex-none">
              Calendar
            </TabsTrigger>
            <TabsTrigger value="home-location" className="flex-1 sm:flex-none">
              Home location
            </TabsTrigger>
            <TabsTrigger value="development" className="flex-1 sm:flex-none">
              Development
            </TabsTrigger>
          </TabsList>
          <TabsContent value="collections-and-wantlists">
            <Card>
              <CardContent className="p-4">
                <CollectionAndWantlistSettings />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="display-name">
            <Card>
              <CardContent className="p-4">
                <UserSettings />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="watched-players">
            <Card>
              <CardContent className="p-4">
                <WatchedPlayersSettings />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="calendar">
            <Card>
              <CardContent className="space-y-4 p-4">
                <h3>Calendar</h3>
                <CalendarWeekStart />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="home-location">
            <Card>
              <CardContent className="p-4">
                <HomeLocationSettings />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="development">
            <Card>
              <CardContent className="p-4">
                <DevelopmentSettings />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
