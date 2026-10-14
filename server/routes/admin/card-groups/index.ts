import { requireAdmin } from '../../../auth/requireAdmin.ts';
import { cardGroupService } from '../../../lib/card-groups/service.ts';
import { createCardGroupsAdminRouter } from './router.ts';

export const cardGroupsAdminRoute = createCardGroupsAdminRouter(cardGroupService, requireAdmin);
