import { Card, CardContent } from '@/components/ui/card.tsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.tsx';
import CollectionAndWantlistSettings from '@/components/app/pages/settings/CollectionAndWantlistSettings.tsx';
import UserSettings from '@/components/app/pages/settings/UserSettings.tsx';
import WatchedPlayersSettings from '@/components/app/pages/settings/WatchedPlayersSettings.tsx';
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
        </Tabs>
      </div>
    </>
  );
}
