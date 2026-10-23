import { db } from '../../db';
import { createUserFileService as createService } from './serviceCore.ts';
import type { UserFileObjectStorage } from './storage.ts';
export function createUserFileService(storage?: UserFileObjectStorage) {
  return createService(db, storage);
}
export const userFileService = createUserFileService();
