import { useState } from 'react';
import { Button } from '@/components/ui/button.tsx';
import { authClient, useSession } from '@/lib/auth-client.ts';
import { useMcpAuthorization } from '@/api/mcp/useMcpAuthorization.ts';

export default function McpConsent() {
  const session = useSession();
  const oauthQuery = window.location.search.slice(1);
  const request = useMcpAuthorization(session.data?.user.id, oauthQuery);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  async function respond(accept: boolean) {
    setPending(true);
    setError(undefined);
    try {
      const result = await authClient.oauth2.consent({ accept, oauth_query: oauthQuery });
      if (result.error || !result.data?.url)
        throw new Error(
          result.error?.message ?? 'Unable to complete authorization. Reconnect from your agent.',
        );
      // The provider validates the registered redirect and the signed request.
      window.location.assign(result.data.url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to complete authorization.');
      setPending(false);
    }
  }
  return (
    <main className="mx-auto flex max-w-lg flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">Allow agent access?</h1>
      {request.isPending && oauthQuery ? <p>Loading access request…</p> : null}
      {!oauthQuery ? (
        <p role="alert">Start the connection from your agent to request access.</p>
      ) : null}
      {request.error ? <p role="alert">{request.error.message}</p> : null}
      {request.data ? (
        <>
          <p>
            <strong>{request.data.clientName}</strong> wants to connect as{' '}
            {session.data?.user.displayName}.
          </p>
          <p className="break-all text-sm text-muted-foreground">
            Client ID: {request.data.clientId}. Names are supplied by the client.
          </p>
          <p className="break-all">
            Return access to: <strong>{request.data.redirectTarget}</strong>
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>Search the official Star Wars Unlimited card catalog.</li>
            {request.data.scopes.includes('offline_access') ? (
              <li>Stay connected until you revoke access or your SWUBASE session expires.</li>
            ) : null}
            <li>Record card-search call counts and timing against your account.</li>
          </ul>
          <div className="flex gap-3">
            <Button disabled={pending} onClick={() => respond(true)}>
              {pending ? 'Continuing…' : 'Allow access'}
            </Button>
            <Button variant="outline" disabled={pending} onClick={() => respond(false)}>
              Deny
            </Button>
          </div>
        </>
      ) : null}
      {error ? <p role="alert">{error}</p> : null}
    </main>
  );
}
