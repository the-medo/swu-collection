import { useState } from 'react';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { useIntegrationApps } from '@/api/integration-apps/useIntegrationApps.ts';
import { useIntegrationAppMutation } from '@/api/integration-apps/useIntegrationAppMutation.ts';
import {
  integrationAppScopeDescriptions,
  type IntegrationAppCredentials,
  type IntegrationAppSummary,
} from '../../../../../shared/types/integrationApp.ts';
import { AppForm } from './AppForm.tsx';
import { ConfirmAppAction } from './ConfirmAppAction.tsx';

export default function DeveloperApps() {
  const query = useIntegrationApps();
  const mutation = useIntegrationAppMutation();
  const [editing, setEditing] = useState<IntegrationAppSummary | 'new' | null>(null);
  const [credentials, setCredentials] = useState<IntegrationAppCredentials | null>(null);
  const [copyMessage, setCopyMessage] = useState('');
  const origin = window.location.origin;
  const run = async (input: Parameters<typeof mutation.mutateAsync>[0]) => {
    setCredentials(null);
    setCopyMessage('');
    try {
      const result = await mutation.mutateAsync(input);
      setCredentials(result);
      mutation.reset(); // Do not retain one-time secrets in the mutation cache.
      setEditing(null);
    } catch {
      /* Mutation error is shown below. */
    }
  };
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Register an app to connect SWUBASE accounts and submit game statistics with each player’s
        permission. You can create up to 10 apps.
      </p>
      {credentials && (
        <section
          className="space-y-3 rounded-lg border border-primary/40 bg-primary/5 p-4"
          aria-label="New app credentials"
        >
          <h3 className="text-lg! font-semibold">Save your client secret now</h3>
          <Label htmlFor="new-client-id">Client ID</Label>
          <Input
            id="new-client-id"
            readOnly
            value={credentials.app.clientId}
            onFocus={event => event.target.select()}
            className="font-mono text-xs"
          />
          <p className="text-sm">This secret is shown once. Store it securely on your server.</p>
          <Label htmlFor="new-client-secret">Client secret</Label>
          <Input
            id="new-client-secret"
            readOnly
            autoComplete="off"
            value={credentials.clientSecret}
            onFocus={event => event.target.select()}
            className="font-mono text-xs"
          />
          <Button
            variant="outline"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(credentials.clientSecret);
                setCopyMessage('Secret copied.');
              } catch {
                setCopyMessage('Could not copy. Select the secret and copy it manually.');
              }
            }}
          >
            Copy secret
          </Button>
          {copyMessage && (
            <p role="status" className="text-sm">
              {copyMessage}
            </p>
          )}
          <Button variant="ghost" onClick={() => setCredentials(null)}>
            Dismiss credentials
          </Button>
        </section>
      )}
      {editing ? (
        <AppForm
          key={editing === 'new' ? 'new' : editing.clientId}
          app={editing === 'new' ? undefined : editing}
          pending={mutation.isPending}
          onCancel={() => setEditing(null)}
          onSave={input =>
            run(
              editing === 'new'
                ? { action: 'create', input }
                : { action: 'update', clientId: editing.clientId, input },
            )
          }
        />
      ) : (
        <Button
          disabled={mutation.isPending || (query.data?.length ?? 0) >= 10}
          onClick={() => {
            setCredentials(null);
            setEditing('new');
          }}
        >
          Register app
        </Button>
      )}
      {mutation.isError && (
        <p role="alert" className="text-sm text-destructive">
          {mutation.error.message}
        </p>
      )}
      {query.isPending && <p role="status">Loading apps…</p>}
      {query.isError && (
        <div role="alert">
          <p>{query.error.message}</p>
          <Button variant="outline" onClick={() => void query.refetch()}>
            Retry
          </Button>
        </div>
      )}
      {query.data?.length === 0 && (
        <p className="text-sm text-muted-foreground">You haven’t registered any apps yet.</p>
      )}
      {query.data?.map(app => (
        <section key={app.clientId} className="min-w-0 space-y-3 rounded-lg border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg! font-semibold">{app.name}</h3>
            <span className="text-sm text-muted-foreground">
              {app.disabled ? 'Disabled' : 'Active'} · Server
            </span>
          </div>
          {app.description && <p className="break-words text-sm">{app.description}</p>}
          <p className="break-all font-mono text-xs">Client ID: {app.clientId}</p>
          <div className="space-y-1 text-sm">
            <p className="font-medium">Callback URLs</p>
            {app.redirectUris.map(uri => (
              <p key={uri} className="break-all text-muted-foreground">
                {uri}
              </p>
            ))}
          </div>
          <ul className="list-disc pl-5 text-sm">
            {app.scopes.map(scope => (
              <li key={scope}>{integrationAppScopeDescriptions[scope]}</li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={mutation.isPending}
              onClick={() => {
                setCredentials(null);
                setEditing(app);
              }}
            >
              Edit app
            </Button>
            <ConfirmAppAction
              label="Rotate secret"
              disabled={mutation.isPending}
              description="The current secret stops working immediately and all users are disconnected. Save the new secret and ask users to reconnect."
              onConfirm={() => void run({ action: 'rotate', clientId: app.clientId })}
            />
            <ConfirmAppAction
              label={app.disabled ? 'Enable app' : 'Disable app'}
              disabled={mutation.isPending}
              description={
                app.disabled
                  ? 'New users will be able to connect. Previous users must approve access again.'
                  : 'All app access stops immediately. Imported game results are retained.'
              }
              onConfirm={() =>
                void run({ action: 'status', clientId: app.clientId, disabled: !app.disabled })
              }
            />
            <ConfirmAppAction
              label="Delete app"
              disabled={mutation.isPending}
              description="Permanently delete this registration and disconnect all users. Imported game results are retained."
              onConfirm={() => void run({ action: 'delete', clientId: app.clientId })}
            />
          </div>
        </section>
      ))}
      <details className="space-y-3 rounded-lg border p-4">
        <summary className="cursor-pointer font-medium">How to connect your app</summary>
        <ol className="list-decimal space-y-3 pl-5 text-sm">
          <li>
            Generate an unpredictable state for each connection and keep it in the initiating app
            session.
          </li>
          <li>
            Open <code className="break-all">{origin}/settings/link/app</code> with{' '}
            <code>response_type=code</code>, <code>client_id</code>, <code>redirect_uri</code>,
            space-separated <code>scope</code>, and <code>state</code>.
          </li>
          <li>
            Validate the returned state at your callback. Exchange the code within five minutes
            using a JSON POST to <code>/api/integration-apps/token</code> with{' '}
            <code>grant_type=authorization_code</code>, <code>client_id</code>,{' '}
            <code>client_secret</code>, <code>code</code>, and <code>redirect_uri</code>.
          </li>
          <li>
            Use <code>Authorization: Bearer &lt;access_token&gt;</code> with{' '}
            <code>GET /api/integration-apps/me</code> or{' '}
            <code>POST /api/integration-apps/game-results</code>. Access tokens expire after one
            hour.
          </li>
          <li>
            Refresh with a JSON POST to the token endpoint using{' '}
            <code>grant_type=refresh_token</code>, <code>client_id</code>,{' '}
            <code>refresh_token</code>, and <code>client_secret</code>. Save both replacement
            tokens; the old tokens stop working.
          </li>
        </ol>
        <p className="text-sm">Game results describe the connected player. Example JSON:</p>
        <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
          {JSON.stringify(
            {
              gameId: 'game-123',
              matchId: 'match-45',
              gameNumber: 1,
              playedAt: '2026-11-05T12:00:00Z',
              isWinner: true,
            },
            null,
            2,
          )}
        </pre>
        <p className="text-sm text-muted-foreground">
          Submit one result per connected player, using that player’s token. Reuse gameId when
          retrying. Optional fields: deckId (owned by the player), format, leaderCardId,
          baseCardKey, opponentLeaderCardId, opponentBaseCardKey, hasInitiative and hasMulligan.
          Card fields use SWUBASE IDs; isWinner can be null for a draw. Requests use JSON. Browser
          cross-origin access is not enabled; send requests from your backend.
        </p>
      </details>
    </div>
  );
}
