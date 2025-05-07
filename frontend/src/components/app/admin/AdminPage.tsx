import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRole } from '@/hooks/useRole';
import { Navigate } from '@tanstack/react-router';
import { MetaTable } from './MetaTable';

export function AdminPage() {
  const hasRole = useRole();
  const isAdmin = hasRole('admin');

  // Redirect if not an admin
  if (!isAdmin) {
    return <Navigate to="/" />;
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage your application settings and data</p>
      </div>

      <Tabs defaultValue="metas" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="metas">Metas</TabsTrigger>
        </TabsList>

        <TabsContent value="metas">
          <Card>
            <CardHeader>
              <CardTitle>Metas Management</CardTitle>
              <CardDescription>Manage meta information for the application</CardDescription>
            </CardHeader>
            <CardContent>
              <MetaTable />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
