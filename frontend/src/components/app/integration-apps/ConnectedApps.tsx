import { Button } from '@/components/ui/button.tsx';
import {
  useIntegrationConnections,
  useDisconnectIntegrationApp,
} from '@/api/integration-apps/useIntegrationConnections.ts';
import { integrationAppScopeDescriptions } from '../../../../../shared/types/integrationApp.ts';
import { ConfirmAppAction } from './ConfirmAppAction.tsx';

export default function ConnectedApps() {
  const query = useIntegrationConnections();
  const disconnect = useDisconnectIntegrationApp();
  return (
    <section className="space-y-4 border-t pt-4">
      <h3 className="text-xl! font-semibold">Connected apps</h3>
      {query.isPending && <p role="status">Loading connected apps…</p>}
      {query.isError && (
        <div role="alert">
          <p>{query.error.message}</p>
          <Button variant="outline" onClick={() => void query.refetch()}>
            Retry
          </Button>
        </div>
      )}
      {query.data?.length === 0 && (
        <p className="text-sm text-muted-foreground">You haven’t connected any third-party apps.</p>
      )}
      {query.data?.map(app => (
        <div key={app.clientId} className="space-y-2 rounded-lg border p-4">
          <h4 className="font-semibold">{app.name}</h4>
          <p className="break-all text-xs text-muted-foreground">{app.clientId}</p>
          <ul className="list-disc pl-5 text-sm">
            {app.scopes.map(scope => (
              <li key={scope}>{integrationAppScopeDescriptions[scope]}</li>
            ))}
          </ul>
          <ConfirmAppAction
            label="Disconnect app"
            disabled={disconnect.isPending}
            description="This immediately stops the app accessing your account. Previously imported game results stay in your statistics."
            onConfirm={() => disconnect.mutate(app.clientId)}
          />
        </div>
      ))}
      {disconnect.isError && (
        <p role="alert" className="text-destructive">
          {disconnect.error.message}
        </p>
      )}
    </section>
  );
}
