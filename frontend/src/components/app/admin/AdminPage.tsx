import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { useRole } from '@/hooks/useRole';
import { Navigate, useNavigate, useSearch } from '@tanstack/react-router';
import { MetaTable } from './MetaTable';
import { SetsPage } from './SetsPage';
import { ThumbnailsPage } from '@/components/app/admin/ThumbnailsPage.tsx';
import { TournamentGroupsPage } from '@/components/app/admin/TournamentGroupsPage';
import { PQToolsPage } from '@/components/app/admin/PQToolsPage/PQToolsPage.tsx';
import { Helmet } from 'react-helmet-async';

export function AdminPage() {
  const hasRole = useRole();
  const isAdmin = hasRole('admin');
  const { page } = useSearch({ from: '/_authenticated/admin' });
  const navigate = useNavigate({ from: '/_authenticated/admin' });

  // Redirect if not an admin
  if (!isAdmin) {
    return <Navigate to="/" />;
  }

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
      <Helmet title="Admin dashboard | SWUBase" />
      <div className="container mx-auto">
        <Tabs value={page} onValueChange={handleTabChange} className="w-full">
          <TabsList>
            <TabsTrigger value="metas">Metas</TabsTrigger>
            <TabsTrigger value="sets">Sets</TabsTrigger>
            <TabsTrigger value="tournament-groups">Tournament Groups</TabsTrigger>
            <TabsTrigger value="deck-thumbnails">SSR Thumbnails</TabsTrigger>
            <TabsTrigger value="pq-tools">PQ Tools</TabsTrigger>
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
          <TabsContent value="pq-tools">
            <Card>
              <CardContent className="p-4">
                <PQToolsPage />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
