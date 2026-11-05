import { appManagementService } from './management.ts';
import { appAuthorizationService } from './authorization.ts';
import { appResourceService } from './resources.ts';

export { IntegrationAppError } from './errors.ts';

// Keep the route-facing contract stable while each workflow owns its transaction.
export const integrationAppService = {
  ...appManagementService,
  ...appAuthorizationService,
  ...appResourceService,
};
