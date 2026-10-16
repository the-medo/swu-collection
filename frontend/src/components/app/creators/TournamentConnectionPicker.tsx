import { useState, type ReactNode } from 'react';
import { Search } from 'lucide-react';
import { useSavedTournaments } from '@/api/tournaments/useSavedTournaments.ts';
import { useConnectionChoices } from '@/api/creators/useConnectionSubjects.ts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Button } from '@/components/ui/button.tsx';
import type { ConnectionSubject } from '../../../../../shared/creators/contracts.ts';

type RenderChoice = (subject: ConnectionSubject) => ReactNode;

function SavedChoices({ search, renderChoice }: { search: string; renderChoice: RenderChoice }) {
  const query = useSavedTournaments();
  if (query.isPending)
    return (
      <p role="status" className="p-3 text-xs text-muted-foreground">
        Loading your tournaments…
      </p>
    );
  if (query.isError)
    return (
      <div role="alert" className="space-y-2 p-3 text-xs">
        <p>Could not load your saved tournaments.</p>
        <Button type="button" variant="outline" onClick={() => void query.refetch()}>
          Try again
        </Button>
      </div>
    );
  const events = query.data
    .filter(item => item.tournament.name.toLowerCase().includes(search.trim().toLowerCase()))
    .sort(
      (a, b) =>
        b.tournament.date.localeCompare(a.tournament.date) ||
        a.tournamentId.localeCompare(b.tournamentId),
    );
  return events.length ? (
    events.map(({ tournament }) =>
      renderChoice({
        type: 'tournament',
        id: tournament.id,
        label: tournament.name,
        date: tournament.date,
        location: tournament.location,
      }),
    )
  ) : (
    <p role="status" className="p-3 text-xs text-muted-foreground">
      {search.trim()
        ? 'No saved tournaments match this name.'
        : 'No saved tournaments yet. Save an event on the map, or browse All tournaments.'}
    </p>
  );
}

export function TournamentConnectionPicker({ renderChoice }: { renderChoice: RenderChoice }) {
  const [source, setSource] = useState('mine');
  const [search, setSearch] = useState('');
  const choices = useConnectionChoices('tournament', search, source === 'all');
  const listClass = 'max-h-72 space-y-2 overflow-y-auto overscroll-contain p-1';
  return (
    <Tabs value={source} onValueChange={setSource} className="space-y-3">
      <TabsList aria-label="Tournament source" className="grid w-full grid-cols-2">
        <TabsTrigger value="mine" className="px-2 text-xs">
          My tournaments
        </TabsTrigger>
        <TabsTrigger value="all" className="px-2 text-xs">
          All tournaments
        </TabsTrigger>
      </TabsList>
      <Input
        aria-label="Find a tournament"
        icon={Search}
        type="search"
        maxLength={100}
        value={search}
        onChange={event => setSearch(event.target.value)}
        placeholder={source === 'mine' ? 'Search your saved events…' : 'Search events by name…'}
      />
      <p className="text-[11px] text-muted-foreground">
        {source === 'mine'
          ? 'Your Saved, Maybe and Going events from the map and calendar.'
          : 'Newest dates first, including upcoming events. Load more as you browse.'}
      </p>
      <TabsContent value="mine" className={listClass}>
        <SavedChoices search={search} renderChoice={renderChoice} />
      </TabsContent>
      <TabsContent
        value="all"
        className={listClass}
        aria-busy={choices.isPending || choices.typing}
      >
        {choices.isPending || choices.typing ? (
          <p role="status" className="p-3 text-xs text-muted-foreground">
            Loading choices…
          </p>
        ) : (
          <>
            {choices.data?.pages.flat().map(renderChoice)}
            {!choices.isError && !choices.data?.pages.flat().length && (
              <p role="status" className="p-3 text-xs text-muted-foreground">
                No matches found. Try another name.
              </p>
            )}
          </>
        )}
        {choices.isError && (
          <div role="alert" className="space-y-2 p-3 text-xs">
            <p>Could not load choices.</p>
            <Button type="button" variant="outline" onClick={() => void choices.refetch()}>
              Try again
            </Button>
          </div>
        )}
        {choices.hasNextPage && !choices.typing && (
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            disabled={choices.isFetchingNextPage}
            onClick={() => void choices.fetchNextPage()}
          >
            {choices.isFetchingNextPage ? 'Loading…' : 'Load more'}
          </Button>
        )}
      </TabsContent>
    </Tabs>
  );
}
