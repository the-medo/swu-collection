import { Fragment, useId, useState } from 'react';
import { ChevronDown, Folder, FolderOpen, Layers3 } from 'lucide-react';
import { useDeckFolders } from '@/api/deck-folders/useDeckFolders.ts';
import { Button } from '@/components/ui/button.tsx';
import { cn } from '@/lib/utils.ts';
import { getDeckFolderDescendants } from '../../../../../../shared/lib/deckFolders.ts';
import { DeckPickerResults, type DeckPickerSelectionProps } from './DeckPickerResults.tsx';

export function DeckPickerFolders({
  userId,
  ...props
}: DeckPickerSelectionProps & { userId: string }) {
  const query = useDeckFolders(userId);
  const folders = query.data ?? [];
  const [opened, setOpened] = useState(new Set(['unfiled']));
  const id = useId();
  const toggle = (folderId: string) =>
    setOpened(current => {
      const next = new Set(current);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  const renderFolder = (folderId: string, name: string, depth = 0) => {
    const open = opened.has(folderId);
    const descendants = getDeckFolderDescendants(folders, folderId);
    const count = folders
      .filter(folder => descendants.has(folder.id))
      .reduce((sum, folder) => sum + folder.deckCount, 0);
    const Icon = folderId === 'unfiled' ? Layers3 : open ? FolderOpen : Folder;
    return (
      <Fragment key={folderId}>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`${id}-${folderId}`}
          onClick={() => toggle(folderId)}
          className={cn(
            'flex min-h-9 w-full min-w-0 items-center gap-2 border-b px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
            depth === 0 ? 'bg-muted/35' : 'bg-muted/15',
          )}
          style={{ paddingLeft: 8 + Math.min(depth, 3) * 12 }}
        >
          <ChevronDown
            className={cn('size-3.5 shrink-0 transition-transform', !open && '-rotate-90')}
            aria-hidden
          />
          <Icon className="size-4 shrink-0 text-primary" aria-hidden />
          <span className="min-w-0 flex-1 truncate font-semibold" title={name}>
            {name}
          </span>
          {folderId !== 'unfiled' && (
            <span className="text-[11px] tabular-nums text-muted-foreground">{count}</span>
          )}
        </button>
        <div id={`${id}-${folderId}`} hidden={!open}>
          {open && (
            <>
              {folders
                .filter(folder => folder.parentId === folderId)
                .map(folder => renderFolder(folder.id, folder.name, depth + 1))}
              <div className="p-1.5" style={{ paddingLeft: 6 + Math.min(depth, 3) * 12 }}>
                <DeckPickerResults {...props} source="mine" folderId={folderId} search="" />
              </div>
            </>
          )}
        </div>
      </Fragment>
    );
  };
  if (query.isPending)
    return (
      <p role="status" className="p-3 text-xs text-muted-foreground">
        Loading folders…
      </p>
    );
  if (query.isError)
    return (
      <div role="alert" className="space-y-2 p-3 text-xs">
        Could not load folders.{' '}
        <Button type="button" size="sm" variant="outline" onClick={() => void query.refetch()}>
          Try again
        </Button>
      </div>
    );
  return (
    <div>
      <div className="flex justify-end pb-1">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs"
          disabled={!opened.size}
          onClick={() => setOpened(new Set())}
        >
          Collapse all folders
        </Button>
      </div>
      <div className="overflow-hidden rounded-lg border">
        {folders
          .filter(folder => !folder.parentId)
          .map(folder => renderFolder(folder.id, folder.name))}
        {renderFolder('unfiled', 'Unfiled decks')}
      </div>
    </div>
  );
}
