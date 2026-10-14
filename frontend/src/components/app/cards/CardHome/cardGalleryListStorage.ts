const selectionLifetime = 5 * 60 * 1000;
const storageKey = (userId: string) => `swubase:card-gallery:destination:${userId}`;

export function readCardGalleryList(userId: string | undefined): string | undefined {
  if (!userId) return undefined;
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return undefined;
    const saved: unknown = JSON.parse(raw);
    if (
      saved &&
      typeof saved === 'object' &&
      'id' in saved &&
      typeof saved.id === 'string' &&
      saved.id.length > 0 &&
      'expiresAt' in saved &&
      typeof saved.expiresAt === 'number' &&
      Number.isFinite(saved.expiresAt) &&
      saved.expiresAt > Date.now()
    )
      return saved.id;
  } catch {
    // Storage can be blocked or contain an older/invalid value. Editing still works in memory.
  }
  rememberCardGalleryList(userId, undefined);
  return undefined;
}

export function rememberCardGalleryList(userId: string, id: string | undefined) {
  try {
    if (id) {
      localStorage.setItem(
        storageKey(userId),
        JSON.stringify({ id, expiresAt: Date.now() + selectionLifetime }),
      );
    } else {
      localStorage.removeItem(storageKey(userId));
    }
  } catch {
    // Remembering a destination is optional when browser storage is unavailable.
  }
}
