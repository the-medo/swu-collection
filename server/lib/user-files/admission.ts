import { UserFileError } from './errors.ts';

const activeOwners = new Set<string>();
const activeCounts = { upload: 0, delete: 0 };
// Uploads and deletions have separate budgets so slow bodies cannot block all
// deletions. At most four DB connections can be held by object writes/deletes.
export async function withUserFileMutation<T>(
  userId: string,
  kind: 'upload' | 'delete',
  work: () => Promise<T>,
): Promise<T> {
  if (activeOwners.has(userId) || activeCounts[kind] >= 2)
    throw new UserFileError('Image updates are busy. Please try again shortly.', 429);
  activeOwners.add(userId);
  activeCounts[kind]++;
  try {
    return await work();
  } finally {
    activeCounts[kind]--;
    activeOwners.delete(userId);
  }
}
