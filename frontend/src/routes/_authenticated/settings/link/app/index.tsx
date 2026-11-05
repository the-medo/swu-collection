import { createFileRoute } from '@tanstack/react-router';
import { integrationAuthorizeSchema } from '../../../../../../../shared/types/integrationApp.ts';
import { IntegrationConsent } from '@/components/app/integration-apps/IntegrationConsent.tsx';

export const Route = createFileRoute('/_authenticated/settings/link/app/')({
  validateSearch: integrationAuthorizeSchema.transform(value => ({
    ...value,
    scope: value.scope.join(' '),
  })),
  component: IntegrationConsentRoute,
  errorComponent: () => (
    <p role="alert" className="p-6">
      Invalid app connection request. Start the connection again from the app.
    </p>
  ),
});

function IntegrationConsentRoute() {
  return <IntegrationConsent request={Route.useSearch()} />;
}
