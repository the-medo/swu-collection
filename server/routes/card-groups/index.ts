import { cardGroupService } from '../../lib/card-groups/service.ts';
import { createCardGroupsRouter } from './router.ts';
export const cardGroupsRoute = createCardGroupsRouter(cardGroupService);
