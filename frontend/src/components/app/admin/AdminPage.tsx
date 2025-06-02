import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { useRole } from '@/hooks/useRole';
import { Navigate } from '@tanstack/react-router';
import { MetaTable } from './MetaTable';
import { SetsPage } from './SetsPage';
import { ThumbnailsPage } from '@/components/app/admin/ThumbnailsPage.tsx';
import { TournamentGroupsPage } from '@/components/app/admin/TournamentGroupsPage';
import { Helmet } from 'react-helmet-async';

export function AdminPage() {
  const hasRole = useRole();
  const isAdmin = hasRole('admin');

  // Redirect if not an admin
  if (!isAdmin) {
    return <Navigate to="/" />;
  }

  return (
    <>
      <Helmet title="Admin dashboard | SWUBase" />
      <div className="container mx-auto">
        <Tabs defaultValue="metas" className="w-full">
          <TabsList>
            <TabsTrigger value="metas">Metas</TabsTrigger>
            <TabsTrigger value="sets">Sets</TabsTrigger>
            <TabsTrigger value="tournament-groups">Tournament Groups</TabsTrigger>
            <TabsTrigger value="deck-thumbnails">SSR Thumbnails</TabsTrigger>
          </TabsList>

          <TabsContent value="metas">
            <Card>
              <CardContent className="p-4">
                <MetaTable />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="sets">
            <Card>
              <CardContent className="p-4">
                <SetsPage />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="tournament-groups">
            <Card>
              <CardContent className="p-4">
                <TournamentGroupsPage />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="deck-thumbnails">
            <Card>
              <CardContent className="p-4">
                <ThumbnailsPage />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
