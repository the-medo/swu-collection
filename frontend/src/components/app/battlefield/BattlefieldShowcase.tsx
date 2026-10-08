import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight, GalleryHorizontal, Pencil, Trash2 } from 'lucide-react';
import { useBattlefieldEditor } from '@/api/battlefield/useBattlefield';
import {
  useBattlefieldShowcase,
  useDeleteBattlefieldPreset,
} from '@/api/battlefield/useBattlefieldPresets';
import { useUser } from '@/hooks/useUser';
import { useRole } from '@/hooks/useRole';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  battlefieldFactionIds,
  battlefieldFactionNames,
  battlefieldShowcaseDefaultFilters,
  type BattlefieldShowcaseFilters,
  type BattlefieldEditorData,
  type BattlefieldPreset,
} from '../../../../../shared/types/battlefield.ts';
import { AnimatedBattlefieldPreview } from './AnimatedBattlefieldPreview';
import { BattlefieldSlotSelect } from './BattlefieldSlotSelect';
import { battlefieldDrawOrder } from '../../../../../shared/battlefield/layers.ts';

export function BattlefieldShowcase({
  page,
  onPage,
  filters,
  onFilters,
}: {
  page: number;
  onPage: (page: number) => void;
  filters: BattlefieldShowcaseFilters;
  onFilters: (filters: Partial<BattlefieldShowcaseFilters>) => void;
}) {
  const query = useBattlefieldShowcase(page, filters);
  const editor = useBattlefieldEditor();
  const user = useUser();
  const pages = Math.max(1, Math.ceil((query.data?.total ?? 0) / (query.data?.pageSize ?? 3)));
  const [search, setSearch] = useState<{ url: string; input: string; submitted?: string }>({
    url: filters.search,
    input: filters.search,
  });
  if (search.url !== filters.search) {
    setSearch({
      url: filters.search,
      input:
        filters.search === search.submitted || search.input.trim() === filters.search
          ? search.input
          : filters.search,
      submitted: undefined,
    });
  }
  const searchInput = search.input;
  useEffect(() => {
    if (searchInput.trim() === filters.search) return;
    const timer = window.setTimeout(() => {
      const submitted = searchInput.trim();
      setSearch(current => ({ ...current, submitted }));
      onFilters({ search: submitted });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput, filters.search, onFilters]);
  useEffect(() => {
    if (query.data && !query.isFetching && page > pages) onPage(pages);
  }, [query.data, query.isFetching, page, pages, onPage]);
  const filtered =
    !!filters.search || filters.faction !== 'all' || (filters.withinCredits && !!user);
  return (
    <div className="flex w-full min-w-0 flex-col gap-5 pb-6">
      <Helmet title="Battlefield showcase | SWUBase" />
      <header className="flex flex-wrap items-center gap-4 border-b px-4 py-4 sm:px-6">
        <h1 className="m-0! flex items-center gap-3 text-2xl! font-semibold!">
          <GalleryHorizontal className="size-6 text-primary" />
          Battlefield showcase
        </h1>
        <p className="text-sm text-muted-foreground">Choose a preset, then make it your own.</p>
        <Button asChild variant="outline" className="sm:ml-auto">
          <Link
            to="/battlefield"
            search={{
              battlefieldPreset: undefined,
              battlefieldSlot: undefined,
              battlefieldPresetMode: undefined,
            }}
          >
            Battlefield editor
          </Link>
        </Button>
      </header>
      <form
        role="search"
        aria-label="Find Battlefield presets"
        className="flex flex-wrap items-center gap-3 px-4 sm:px-6"
        onSubmit={event => {
          event.preventDefault();
          const submitted = searchInput.trim();
          setSearch(current => ({
            ...current,
            submitted: submitted !== filters.search ? submitted : undefined,
          }));
          onFilters({ search: submitted });
        }}
      >
        <Input
          aria-label="Search battlefields"
          placeholder="Search battlefields…"
          value={searchInput}
          maxLength={80}
          onChange={event => {
            const input = event.target.value;
            setSearch(current => ({ ...current, input }));
          }}
          className="w-full sm:w-64"
        />
        <label className="flex items-center gap-2 text-sm">
          Faction
          <select
            aria-label="Filter by faction"
            value={filters.faction}
            className="h-9 max-w-full rounded-md border bg-background px-2"
            onChange={event =>
              onFilters({ faction: event.target.value as BattlefieldShowcaseFilters['faction'] })
            }
          >
            <option value="all">All factions</option>
            {battlefieldFactionIds.map(id => (
              <option key={id} value={id}>
                {battlefieldFactionNames[id]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          Sort
          <select
            aria-label="Sort battlefields"
            value={filters.sort}
            className="h-9 max-w-full rounded-md border bg-background px-2"
            onChange={event =>
              onFilters({ sort: event.target.value as BattlefieldShowcaseFilters['sort'] })
            }
          >
            <option value="newest">Newest first</option>
            <option value="price-asc">Lowest cost first</option>
            <option value="price-desc">Highest cost first</option>
          </select>
        </label>
        <label
          className="flex items-center gap-2 text-sm"
          title={user ? undefined : 'Sign in to filter by your credits.'}
        >
          <input
            type="checkbox"
            className="accent-primary"
            checked={filters.withinCredits && !!user}
            disabled={!user}
            onChange={event => onFilters({ withinCredits: event.target.checked })}
          />
          Within my credits
        </label>
        {(filtered || filters.sort !== 'newest' || !!searchInput) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch({ url: filters.search, input: '' });
              onFilters(battlefieldShowcaseDefaultFilters);
            }}
          >
            Reset filters
          </Button>
        )}
        {query.data && (
          <span role="status" className="text-sm text-muted-foreground">
            {query.data.total} {query.data.total === 1 ? 'preset' : 'presets'}
          </span>
        )}
      </form>
      {query.isPending && (
        <p role="status" className="px-6">
          Loading the showcase…
        </p>
      )}
      {query.isError && (
        <div role="alert" className="px-6">
          <p>{query.error.message}</p>
          <Button variant="outline" onClick={() => void query.refetch()}>
            Try again
          </Button>
        </div>
      )}
      {user && editor.isError && (
        <div role="alert" className="px-6">
          <p>{editor.error.message}</p>
          <Button variant="outline" onClick={() => void editor.refetch()}>
            Reload your slots
          </Button>
        </div>
      )}
      {query.data && !query.data.presets.length && (
        <div className="px-6 py-8">
          <h2 className="m-0! text-lg!">
            {filtered && !query.data.total
              ? 'No presets match your filters'
              : query.data.total
                ? 'No presets on this page'
                : 'The showcase is waiting for its first fleet'}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {filtered
              ? 'Try another faction or clear your filters.'
              : 'Admins can publish a preset from the Battlefield editor.'}
          </p>
        </div>
      )}
      <div className="flex flex-col gap-6 px-4 sm:px-6">
        {query.data?.presets.map(preset => (
          <ShowcaseBattlefield
            key={preset.id}
            preset={preset}
            editor={editor.data}
            signedIn={!!user}
          />
        ))}
      </div>
      {query.data && query.data.total > 0 && (
        <nav aria-label="Showcase pages" className="flex items-center justify-center gap-4 px-4">
          <Button
            variant="outline"
            aria-label="Previous showcase page"
            disabled={page <= 1}
            onClick={() => onPage(Math.min(page - 1, pages))}
          >
            <ChevronLeft className="size-4" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {pages}
          </span>
          <Button
            variant="outline"
            aria-label="Next showcase page"
            disabled={page >= pages}
            onClick={() => onPage(page + 1)}
          >
            Next
            <ChevronRight className="size-4" />
          </Button>
        </nav>
      )}
    </div>
  );
}

function ShowcaseBattlefield({
  preset,
  editor,
  signedIn,
}: {
  preset: BattlefieldPreset;
  editor?: BattlefieldEditorData;
  signedIn: boolean;
}) {
  const [slot, setSlot] = useState('');
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const isAdmin = useRole()('admin');
  const remove = useDeleteBattlefieldPreset();
  const [error, setError] = useState<string>();
  const hiddenObjects = useMemo(
    () => preset.scene.placements.length - battlefieldDrawOrder(preset.scene, true).length,
    [preset.scene],
  );
  const destination = editor?.battlefields.find(battlefield => battlefield.id === slot);
  const overBudget = !!editor && preset.cost > editor.balance;
  return (
    <article aria-label={preset.name} className="min-w-0 overflow-hidden border-b pb-5">
      <AnimatedBattlefieldPreview scene={preset.scene} />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h2 className="m-0! mr-auto text-lg! font-semibold!">{preset.name}</h2>
        <span
          className={overBudget ? 'text-sm tabular-nums text-destructive' : 'text-sm tabular-nums'}
        >
          {preset.cost.toLocaleString()} credits{editor && ` / ${editor.balance.toLocaleString()}`}
        </span>
        {signedIn ? (
          <Button variant="outline" disabled={!editor} onClick={() => setOpen(true)}>
            <Pencil className="size-4" />
            Load to battlefield editor
          </Button>
        ) : (
          <Button asChild variant="outline">
            <Link
              to="/battlefield"
              search={{
                battlefieldPreset: preset.id,
                battlefieldSlot: undefined,
                battlefieldPresetMode: undefined,
              }}
            >
              Sign in to load
            </Link>
          </Button>
        )}
        {isAdmin && (
          <Button variant="ghost" size="sm" asChild>
            <Link
              to="/battlefield"
              search={previous => ({
                ...previous,
                battlefieldPreset: preset.id,
                battlefieldSlot: undefined,
                battlefieldPresetMode: 'edit',
              })}
            >
              <Pencil className="size-4" />
              Edit preset
            </Link>
          </Button>
        )}
        {isAdmin && (
          <Button
            variant="ghost"
            size="sm"
            disabled={remove.isPending}
            onClick={async () => {
              if (
                !window.confirm(
                  `Delete “${preset.name}” from the Battlefield showcase? Saved personal copies will remain.`,
                )
              )
                return;
              try {
                await remove.mutateAsync(preset.id);
                setError(undefined);
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            <Trash2 className="size-4" />
            {remove.isPending ? 'Deleting…' : 'Delete preset'}
          </Button>
        )}
      </div>
      {preset.factions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2" aria-label="Preset factions">
          {preset.factions.map(faction => (
            <span
              key={faction}
              className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground"
            >
              {battlefieldFactionNames[faction]}
            </span>
          ))}
        </div>
      )}
      {hiddenObjects > 0 && (
        <p className="mt-2 text-sm text-muted-foreground">
          Includes {hiddenObjects} hidden {hiddenObjects === 1 ? 'object' : 'objects'} that count
          toward the cost and will be copied into your editor.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
      {overBudget && (
        <p className="mt-2 text-sm text-destructive">
          This preset exceeds your budget by {(preset.cost - editor!.balance).toLocaleString()}{' '}
          credits. Remove objects or reduce their size in the editor before saving.
        </p>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Load {preset.name}?</DialogTitle>
            <DialogDescription>
              {destination
                ? `Saving this draft will rewrite “${destination.name}” in the selected slot. Your current Battlefield stays saved until you confirm replacement in the editor.`
                : 'Choose a destination slot below, or leave it empty and choose one in the editor. This opens an unsaved draft. Saving to an occupied slot will ask you to confirm replacement.'}
            </DialogDescription>
          </DialogHeader>
          {editor && (
            <BattlefieldSlotSelect
              data={editor}
              value={slot}
              onChange={setSlot}
              label="Destination slot"
              ariaLabel={`Destination for ${preset.name}`}
              placeholder="Choose later in the editor"
            />
          )}
          {overBudget && (
            <p className="text-sm text-destructive">
              You have {editor!.balance.toLocaleString()} credits; this preset costs{' '}
              {preset.cost.toLocaleString()}. Remove objects or reduce their size to bring it within
              your budget before saving.
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                void navigate({
                  to: '/battlefield',
                  search: previous => ({
                    ...previous,
                    battlefieldPreset: preset.id,
                    battlefieldSlot: slot || undefined,
                    battlefieldPresetMode: undefined,
                  }),
                })
              }
            >
              Open in editor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  );
}
