export const openDeckFoldersKey = (userId: string) => `swubase:deck-folders:opened:v1:${userId}`;
const unfiledOpenKey = (userId: string) => `swubase:deck-folders:unfiled-open:v1:${userId}`;

export function readUnfiledOpen(userId: string): boolean {
  try {
    return localStorage.getItem(unfiledOpenKey(userId)) !== 'false';
  } catch {
    return true;
  }
}

export function writeUnfiledOpen(userId: string, open: boolean) {
  try {
    localStorage.setItem(unfiledOpenKey(userId), String(open));
  } catch {
    // Unfiled navigation still works when browser storage is unavailable.
  }
}

export function readOpenDeckFolders(userId: string): Set<string> {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(openDeckFoldersKey(userId)) ?? '[]');
    return new Set(
      Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [],
    );
  } catch {
    return new Set();
  }
}

export function writeOpenDeckFolders(userId: string, folders: Set<string>) {
  try {
    localStorage.setItem(openDeckFoldersKey(userId), JSON.stringify([...folders]));
  } catch {
    // Folder navigation still works when browser storage is unavailable.
  }
}
