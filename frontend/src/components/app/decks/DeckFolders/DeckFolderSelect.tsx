import { useId, useRef, useState, type KeyboardEvent } from 'react';
import {
  Check,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  Folder,
  FolderOpen,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.tsx';
import { cn } from '@/lib/utils.ts';
import { getDeckFolderPath } from '../../../../../../shared/lib/deckFolders.ts';
import type { DeckFolder } from '../../../../../../types/DeckFolder.ts';

type Props = {
  folders: DeckFolder[];
  value: string | null | undefined;
  onChange: (id: string | null) => void;
  label?: string;
  emptyLabel?: string;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
};

export default function DeckFolderSelect({
  folders,
  value,
  onChange,
  label = 'Folder',
  emptyLabel = 'No folder',
  placeholder = 'Choose a folder',
  id,
  disabled,
  className,
}: Props) {
  const treeId = useId();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [focused, setFocused] = useState('');
  const items = useRef(new Map<string, HTMLDivElement>());
  const trigger = useRef<HTMLButtonElement>(null);
  const [container, setContainer] = useState<HTMLElement | undefined>();
  const path = value ? getDeckFolderPath(folders, value) : [];
  const selected = path[path.length - 1];
  const searchText = search.trim().toLocaleLowerCase();
  const matches = searchText
    ? new Set(
        folders
          .filter(folder => folder.name.toLocaleLowerCase().includes(searchText))
          .flatMap(folder => getDeckFolderPath(folders, folder.id).map(parent => parent.id)),
      )
    : null;
  const visible: {
    folder: DeckFolder;
    depth: number;
    children: boolean;
    position: number;
    size: number;
  }[] = [];
  const visit = (parentId: string | null, depth: number) => {
    const siblings = folders.filter(
      folder => folder.parentId === parentId && (!matches || matches.has(folder.id)),
    );
    siblings.forEach((folder, index) => {
      const children = folders.some(
        child => child.parentId === folder.id && (!matches || matches.has(child.id)),
      );
      visible.push({
        folder,
        depth,
        children,
        position: index + (parentId ? 1 : 2),
        size: siblings.length + (parentId ? 0 : 1),
      });
      if (children && (searchText || expanded.has(folder.id))) visit(folder.id, depth + 1);
    });
  };
  visit(null, 0);
  const ids = ['', ...visible.map(item => item.folder.id)];
  const focus = (folderId: string) => {
    setFocused(folderId);
    items.current.get(folderId)?.focus();
  };
  const toggle = (folderId: string) =>
    setExpanded(current => {
      const next = new Set(current);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  const choose = (folderId: string) => {
    onChange(folderId || null);
    setOpen(false);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>, folderId: string) => {
    const index = ids.indexOf(folderId);
    const item = visible.find(entry => entry.folder.id === folderId);
    switch (event.key) {
      case 'ArrowDown':
        focus(ids[Math.min(index + 1, ids.length - 1)]);
        break;
      case 'ArrowUp':
        focus(ids[Math.max(0, index - 1)]);
        break;
      case 'Home':
        focus('');
        break;
      case 'End':
        focus(ids[ids.length - 1]);
        break;
      case 'ArrowRight':
        if (item?.children) {
          if (!searchText && !expanded.has(folderId)) toggle(folderId);
          else focus(ids[index + 1]);
        }
        break;
      case 'ArrowLeft':
        if (item?.children && expanded.has(folderId) && !searchText) toggle(folderId);
        else if (item?.folder.parentId) focus(item.folder.parentId);
        break;
      case 'Enter':
      case ' ':
        choose(folderId);
        break;
      default:
        return;
    }
    event.preventDefault();
    event.stopPropagation();
  };
  if (!folders.length) return null;

  return (
    <Popover
      open={open}
      onOpenChange={next => {
        setOpen(next);
        if (next) {
          // Keep the popup inside a modal's scroll-lock boundary when used in a dialog.
          setContainer(trigger.current?.closest<HTMLElement>('[role="dialog"]') ?? undefined);
          setSearch('');
          setExpanded(new Set(folders.map(folder => folder.id)));
          setFocused(value && folders.some(folder => folder.id === value) ? value : '');
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          ref={trigger}
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-label={label}
          aria-expanded={open}
          aria-haspopup="tree"
          aria-controls={open ? treeId : undefined}
          disabled={disabled}
          className={cn('min-w-0 justify-between gap-2 font-normal', className)}
        >
          <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span
            className="min-w-0 flex-1 truncate text-left"
            title={path.map(folder => folder.name).join(' / ')}
          >
            {selected?.name ?? (value === null ? emptyLabel : placeholder)}
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        container={container}
        align="start"
        className="w-80 max-w-[calc(100vw-1rem)] p-1"
        onOpenAutoFocus={event => {
          event.preventDefault();
          (items.current.get(value ?? '') ?? items.current.get(''))?.focus();
        }}
      >
        <div className="flex items-center gap-2 border-b px-2 pb-1">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            aria-label="Find a folder"
            placeholder="Find a folder..."
            value={search}
            className="h-9 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            onChange={event => {
              setSearch(event.target.value);
              setFocused('');
            }}
            onKeyDown={event => {
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                focus('');
              }
            }}
          />
        </div>
        <div id={treeId} role="tree" aria-label="Folders" className="max-h-72 overflow-y-auto p-1">
          <div
            ref={element => {
              if (element) items.current.set('', element);
              else items.current.delete('');
            }}
            role="treeitem"
            aria-label={emptyLabel}
            aria-level={1}
            aria-posinset={1}
            aria-setsize={visible.filter(item => item.depth === 0).length + 1}
            aria-selected={value === null}
            tabIndex={focused === '' ? 0 : -1}
            onFocus={() => setFocused('')}
            onKeyDown={event => onKeyDown(event, '')}
            onClick={() => choose('')}
            className="mb-1 flex cursor-pointer items-center gap-2 rounded-md border-b px-2 py-2 text-sm outline-none hover:bg-accent focus:bg-accent"
          >
            <span className="w-4" />
            <Folder className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1">{emptyLabel}</span>
            {value === null && <Check className="h-4 w-4" />}
          </div>
          {visible.map(({ folder, depth, children, position, size }) => {
            const isOpen = !!searchText || expanded.has(folder.id);
            const Icon = children && isOpen ? FolderOpen : Folder;
            return (
              <div
                key={folder.id}
                ref={element => {
                  if (element) items.current.set(folder.id, element);
                  else items.current.delete(folder.id);
                }}
                role="treeitem"
                aria-label={`Folder ${folder.name}`}
                aria-level={depth + 1}
                aria-posinset={position}
                aria-setsize={size}
                aria-expanded={children ? isOpen : undefined}
                aria-selected={value === folder.id}
                tabIndex={focused === folder.id ? 0 : -1}
                onFocus={event => {
                  if (event.target === event.currentTarget) setFocused(folder.id);
                }}
                onKeyDown={event => onKeyDown(event, folder.id)}
                onClick={() => choose(folder.id)}
                title={getDeckFolderPath(folders, folder.id)
                  .map(parent => parent.name)
                  .join(' / ')}
                className="flex cursor-pointer items-center gap-2 rounded-md py-1.5 pr-2 text-sm outline-none hover:bg-accent focus:bg-accent"
                style={{ paddingLeft: `${8 + Math.min(depth, 8) * 16}px` }}
              >
                {children ? (
                  <button
                    type="button"
                    tabIndex={-1}
                    disabled={!!searchText}
                    aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${folder.name}`}
                    className="flex h-6 w-4 shrink-0 items-center justify-center"
                    onClick={event => {
                      event.stopPropagation();
                      focus(folder.id);
                      toggle(folder.id);
                    }}
                  >
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                ) : (
                  <span className="w-4 shrink-0" />
                )}
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 break-words">{folder.name}</span>
                {value === folder.id && <Check className="h-4 w-4 shrink-0" />}
              </div>
            );
          })}
          {searchText && !visible.length && (
            <p className="px-2 py-4 text-center text-sm text-muted-foreground">No folders found.</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
