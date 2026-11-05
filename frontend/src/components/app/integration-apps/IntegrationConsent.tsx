import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button.tsx';
import { useUser } from '@/hooks/useUser.ts';
import {
  useIntegrationAuthorization,
  useIntegrationConsent,
} from '@/api/integration-apps/useIntegrationAuthorization.ts';
import {
  integrationAppScopeDescriptions,
  type IntegrationAuthorizeInput,
} from '../../../../../shared/types/integrationApp.ts';

export function IntegrationConsent({ request }: { request: IntegrationAuthorizeInput }) {
  const user = useUser();
  const framed = window.self !== window.top;
  const authorization = useIntegrationAuthorization(request, !framed);
  const consent = useIntegrationConsent(request);
  const respond = async (accept: boolean) => {
    if (framed) return;
    try {
      const result = await consent.mutateAsync(accept);
      consent.reset();
      window.location.assign(result.redirectUrl);
    } catch {
      /* Mutation error is shown below. */
    }
  };
  // Also cover client-side navigation into consent from an already framed SPA.
  if (framed)
    return (
      <p role="alert" className="p-6">
        Open SWUBASE in its own browser tab to connect an app.
      </p>
    );
  return (
    <main className="mx-auto max-w-lg space-y-4 p-6">
      <Helmet title="Connect app | SWUBase">
        <meta name="referrer" content="no-referrer" />
      </Helmet>
      <h1 className="text-2xl! font-semibold">Connect an app</h1>
      {authorization.isPending && <p role="status">Loading access request…</p>}
      {authorization.isError && <p role="alert">{authorization.error.message}</p>}
      {authorization.data && (
        <>
          <p>
            <strong>{authorization.data.app.name}</strong> wants to connect to your account,{' '}
            <strong>{user?.name}</strong>.
          </p>
          {authorization.data.app.description && (
            <p className="break-words text-sm">{authorization.data.app.description}</p>
          )}
          <p className="break-all text-xs text-muted-foreground">
            Client ID: {authorization.data.app.clientId}. App names and descriptions are provided by
            their developers.
          </p>
          <p>This app will be able to:</p>
          <ul className="list-disc space-y-2 pl-5">
            {authorization.data.scopes.map(scope => (
              <li key={scope}>{integrationAppScopeDescriptions[scope]}</li>
            ))}
          </ul>
          <p className="break-all text-sm">
            Return to: <strong>{authorization.data.redirectUri}</strong>
          </p>
          <p className="text-sm text-muted-foreground">
            The app can stay connected using refresh tokens. You can revoke access in Settings →
            Integrations.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button disabled={consent.isPending} onClick={() => void respond(true)}>
              {consent.isPending ? 'Continuing…' : 'Allow access'}
            </Button>
            <Button
              variant="outline"
              disabled={consent.isPending}
              onClick={() => void respond(false)}
            >
              Deny
            </Button>
          </div>
        </>
      )}
      {consent.isError && (
        <p role="alert" className="text-destructive">
          {consent.error.message}
        </p>
      )}
    </main>
  );
}
