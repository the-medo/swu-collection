import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
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
    <div className="container mx-auto">
      <Tabs defaultValue="metas" className="w-full">
        <TabsList>
          <TabsTrigger value="metas">Metas</TabsTrigger>
        </TabsList>

        <TabsContent value="metas">
          <Card>
            <CardContent className="p-4">
              <MetaTable />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
