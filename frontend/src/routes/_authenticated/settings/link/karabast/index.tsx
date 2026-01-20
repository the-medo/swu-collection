import { createFileRoute } from '@tanstack/react-router';
import { useLinkCreate } from '@/api/integration/useLinkCreate';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

export const Route = createFileRoute('/_authenticated/settings/link/karabast/')({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      client_id: search.client_id as string,
      redirect_uri: search.redirect_uri as string,
      scope: search.scope as string,
      karabast_user_id: search.karabast_user_id as string,
    };
  },
});

function RouteComponent() {
  const { client_id, redirect_uri, scope, karabast_user_id } = Route.useSearch();
  const linkCreate = useLinkCreate();
  const [error, setError] = useState<string | null>(null);

  const handleApprove = async () => {
    try {
      const result = await linkCreate.mutateAsync({
        clientId: client_id,
        externalUserId: karabast_user_id,
        scopes: scope ? scope.split(' ') : [],
        integration: 'karabast',
        metadata: {},
      });

      if (result.linkToken) {
        const url = new URL(redirect_uri);
        url.searchParams.append('link_token', result.linkToken);
        url.searchParams.append('karabast_user_id', karabast_user_id);
        window.location.href = url.toString();
      }
    } catch (e) {
      setError('Failed to approve link. Please try again.');
      console.error(e);
    }
  };

  return (
    <div className="p-8 flex justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Link Karabast Account</CardTitle>
          <CardDescription>
            Approve this request to link your Karabast account with Swubase.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">External User ID:</span>
              <span className="font-mono">{karabast_user_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Scopes:</span>
              <span>{scope?.replace(/\+/g, ', ')}</span>
            </div>
          </div>
          {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
        </CardContent>
        <CardFooter className="flex justify-end gap-4">
          <Button variant="outline" onClick={() => window.history.back()}>
            Cancel
          </Button>
          <Button onClick={handleApprove} disabled={linkCreate.isPending}>
            {linkCreate.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Approve Link
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
