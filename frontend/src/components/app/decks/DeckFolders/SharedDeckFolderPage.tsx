import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Folder, Loader2 } from 'lucide-react';
import { useSharedDeckFolder } from '@/api/deck-folders/useSharedDeckFolder.ts';
import { useUser } from '@/hooks/useUser.ts';
import { Button } from '@/components/ui/button.tsx';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table.tsx';
import DeckFolderSection from './DeckFolderSection.tsx';
import { readSharedOpenDeckFolders, writeSharedOpenDeckFolders } from './openFoldersStorage.ts';

export default function SharedDeckFolderPage({ folderId }: { folderId: string }) {
  const user = useUser();
  return (
    <FolderPage
      key={`${folderId}:${user?.id ?? 'anonymous'}`}
      folderId={folderId}
      viewerId={user?.id}
    />
  );
}

function FolderPage({ folderId, viewerId }: { folderId: string; viewerId?: string }) {
  const query = useSharedDeckFolder(folderId);
  const [storedOpened, setOpened] = useState(() => readSharedOpenDeckFolders(folderId, viewerId));
  const opened = useMemo(() => {
    const known = new Set(query.data?.folders.map(folder => folder.id));
    return query.data ? new Set([...storedOpened].filter(id => known.has(id))) : storedOpened;
  }, [query.data, storedOpened]);
  useEffect(() => {
    if (query.data && !query.isError) writeSharedOpenDeckFolders(folderId, opened, viewerId);
  }, [query.data, query.isError, folderId, opened, viewerId]);

  if (query.isPending)
    return (
      <div className="flex items-center gap-2 p-4 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading folder...
      </div>
    );
  if (query.isError)
    return (
      <div role="alert" className="flex flex-col items-start gap-3 p-4">
        <Helmet title="Folder unavailable | SWUBase" />
        <h3 className="mb-0">Folder unavailable</h3>
        <p className="text-sm text-muted-foreground">
          {query.error.status === 404
            ? 'This folder may be private, no longer shared, or removed. For a team folder, sign in with an account that belongs to the team.'
            : query.error.message}
        </p>
        <Button variant="outline" onClick={() => void query.refetch()}>
          Try again
        </Button>
      </div>
    );
  const { name, folders } = query.data;
  return (
    <div className="flex w-full min-w-0 flex-col gap-3 p-2">
      <Helmet title={`${name} — Folder decks | SWUBase`} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Folder className="h-5 w-5 shrink-0 text-muted-foreground" />
          <h3 className="mb-0 break-words">{name}</h3>
        </div>
        <Button variant="ghost" disabled={!opened.size} onClick={() => setOpened(new Set())}>
          Collapse all folders
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">Folder decks · View only</p>
      <Table
        aria-label="Folder decks"
        className="table-fixed [--folder-indent:16px] [--folder-max-indent:32px] sm:[--folder-indent:28px] sm:[--folder-max-indent:224px]"
      >
        <TableHeader>
          <TableRow>
            <TableHead>Folder</TableHead>
            <TableHead className="w-14 text-right">Decks</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {folders
            .filter(folder => !folder.parentId)
            .map(folder => (
              <DeckFolderSection
                key={folder.id}
                folder={folder}
                folders={folders}
                filters={{ sharedFolderId: folderId }}
                opened={opened}
                readOnly
                onToggle={id =>
                  setOpened(current => {
                    const next = new Set(current);
                    if (next.has(id)) next.delete(id);
                    else next.add(id);
                    return next;
                  })
                }
              />
            ))}
        </TableBody>
      </Table>
    </div>
  );
}
