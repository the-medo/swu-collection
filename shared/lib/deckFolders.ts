import type { DeckFolder } from '../../types/DeckFolder.ts';

type Folder = Pick<DeckFolder, 'id' | 'parentId' | 'name'>;

export function getDeckFolderDescendants(folders: readonly Folder[], id: string): Set<string> {
  const descendants = new Set([id]);
  const pending = [id];
  while (pending.length) {
    const parent = pending.pop();
    for (const folder of folders) {
      if (folder.parentId === parent && !descendants.has(folder.id)) {
        descendants.add(folder.id);
        pending.push(folder.id);
      }
    }
  }
  return descendants;
}

export function getDeckFolderPath(folders: readonly Folder[], id: string): Folder[] {
  const byId = new Map(folders.map(folder => [folder.id, folder]));
  const path: Folder[] = [];
  const seen = new Set<string>();
  let current = byId.get(id);
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    path.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return path;
}

export function getDeckFolderOptions(folders: readonly Folder[]) {
  return folders
    .map(folder => ({
      id: folder.id,
      label: getDeckFolderPath(folders, folder.id)
        .map(part => part.name)
        .join(' / '),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function getDeckFolderSharingSources(folders: readonly DeckFolder[], id: string) {
  const path = new Set(getDeckFolderPath(folders, id).map(folder => folder.id));
  return folders.filter(
    folder =>
      path.has(folder.id) &&
      (folder.sharing?.linkEnabled || (folder.sharing?.teams.length ?? 0) > 0),
  );
}
