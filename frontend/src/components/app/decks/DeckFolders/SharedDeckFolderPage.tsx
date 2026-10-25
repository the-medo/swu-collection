import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Folder, Loader2, ChevronsDownUp, Eye } from 'lucide-react';
import { useSharedDeckFolder } from '@/api/deck-folders/useSharedDeckFolder.ts';
import { useUser } from '@/hooks/useUser.ts';
import { Button } from '@/components/ui/button.tsx';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table.tsx';
import DeckFolderSection from './DeckFolderSection.tsx';
import { readSharedOpenDeckFolders, writeSharedOpenDeckFolders } from './openFoldersStorage.ts';
import { workspaceStyles } from '@/components/app/global/WorkspacePage/workspaceStyles.ts';
import { cn } from '@/lib/utils.ts';

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
      <div
        role="status"
        className={cn(workspaceStyles.theme, 'flex items-center gap-2 p-4 text-muted-foreground')}
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading folder...
      </div>
    );
  if (query.isError)
    return (
      <div
        role="alert"
        className={cn(
          workspaceStyles.theme,
          workspaceStyles.panel,
          'm-2 flex flex-col items-start gap-3 p-4',
        )}
      >
        <Helmet title="Folder unavailable | SWUBase" />
        <h1 className={workspaceStyles.title}>Folder unavailable</h1>
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
  const deckCount = folders.reduce((total, folder) => total + folder.deckCount, 0);
  return (
    <div className={cn(workspaceStyles.theme, 'flex w-full flex-col gap-3 p-2')}>
      <Helmet title={`${name} — Folder decks | SWUBase`} />
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--workspace-border)] pb-3">
        <div className="flex min-w-0 flex-1 basis-full items-center gap-3 sm:basis-0">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--workspace-soft)] text-[var(--workspace-accent)]">
            <Folder className="size-5" />
          </span>
          <div className="min-w-0">
            <h1 className={cn(workspaceStyles.title, 'break-words')}>{name}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span>
                Shared folder · {deckCount} {deckCount === 1 ? 'deck' : 'decks'}
              </span>
              <span className="inline-flex items-center gap-1">
                <Eye className="size-3.5" /> View only
              </span>
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={!opened.size}
          onClick={() => setOpened(new Set())}
        >
          <ChevronsDownUp className="size-4" />
          Collapse all folders
        </Button>
      </header>
      <div className={cn(workspaceStyles.panel, 'overflow-hidden')}>
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
    </div>
  );
}
