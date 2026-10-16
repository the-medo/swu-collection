import { db } from '../../db/index.ts';
import type { Database } from './types.ts';
import { createOwnershipService } from './ownership.ts';
import { createProfilesService } from './profiles.ts';
import { createDiscoveryService } from './discovery.ts';
import { createCreationsService } from './creations.ts';
export { CreatorError } from './errors.ts';
export { requireCreator } from './permissions.ts';
export { resolveReference, resolveReferences } from './references.ts';
export { groupDiscoveryTags } from './filters.ts';
export { writeCreatorPublication } from './publication.ts';

export function createCreatorService(database: Database = db) {
  return {
    ...createProfilesService(database),
    ...createOwnershipService(database),
    ...createDiscoveryService(database),
    ...createCreationsService(database),
  };
}
export const creatorService = createCreatorService();
