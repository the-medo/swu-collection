import { lazy, Suspense, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { House, Info } from 'lucide-react';
import { useHomeLocation } from '@/api/user/useHomeLocation.ts';
import { useSavedTournaments } from '@/api/tournaments/useSavedTournaments.ts';
import { useUser } from '@/hooks/useUser.ts';
import SignIn from '@/components/app/auth/SignIn.tsx';
import { Alert } from '@/components/ui/alert.tsx';
import { Route } from '@/routes/tournaments/map';
import { useTournamentMap } from '@/api/tournaments/useTournamentMap.ts';
import TournamentNavigation from '@/components/app/tournaments/TournamentNavigation/TournamentNavigation.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Checkbox } from '@/components/ui/checkbox.tsx';
import { Label } from '@/components/ui/label.tsx';
import {
  defaultMapFormats,
  defaultMapTypes,
  filterMapTournaments,
  hasMapCoordinates,
  mapFormats,
  mapPinColor,
  mapTypes,
  mapWeekRange,
  mapWeekEnd,
  mapWeeks,
  mapWeekSummaries,
} from './mapData.ts';
import { WeekRangeSlider } from './WeekRangeSlider.tsx';
import { YourTournamentsOverlay } from './YourTournamentsOverlay.tsx';
import type { TournamentMapActions } from './TournamentMapCanvas.tsx';
import type { MapTournament } from '../../../../../../../types/TournamentMap.ts';

const TournamentMapCanvas = lazy(() => import('./TournamentMapCanvas.tsx'));
const emptyTournaments: MapTournament[] = [];

export default function TournamentsMap() {
  const { tmFrom, tmTo, tmFormats, tmTypes, tmSaved } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const map = useRef<TournamentMapActions>(null);
  const query = useTournamentMap();
  const home = useHomeLocation();
  const user = useUser();
  const savedOnly = !!user && !!tmSaved;
  const saves = useSavedTournaments();
  const savedIdsKey =
    saves.data
      ?.map(row => row.tournamentId)
      .sort()
      .join(',') ?? '';
  const savedTournamentIds = useMemo(
    () => new Set(savedIdsKey ? savedIdsKey.split(',') : []),
    [savedIdsKey],
  );
  const savedTournamentStatuses = useMemo(
    () => new Map(saves.data?.map(saved => [saved.tournamentId, saved.status]) ?? []),
    [saves.data],
  );
  const tournaments = useMemo(() => {
    const rows = query.data?.tournaments ?? emptyTournaments;
    return savedOnly ? rows.filter(row => savedTournamentIds.has(row.id)) : rows;
  }, [query.data?.tournaments, savedOnly, savedTournamentIds]);
  const formats = tmFormats ?? defaultMapFormats;
  const types = tmTypes ?? defaultMapTypes;
  const window = query.data?.window;
  const weeks = useMemo(() => mapWeeks(window), [window]);
  const weekSummaries = useMemo(
    () =>
      mapWeekSummaries(
        weeks,
        filterMapTournaments(tournaments, formats, types, undefined, undefined),
        query.data?.highlights,
        window?.to,
        saves.data,
      ),
    [weeks, tournaments, formats, types, query.data?.highlights, window?.to, saves.data],
  );
  // Keep dragging local and live; commit one shareable URL/history entry on release.
  const rangeKey = `${window?.from}:${tmFrom}:${tmTo}:${weeks.join(',')}`;
  const [draft, setDraft] = useState<{ key: string; value: [number, number] } | null>(null);
  const activeDraft = draft?.key === rangeKey ? draft : null;
  const range = activeDraft?.value ?? mapWeekRange(weeks, tmFrom, tmTo);
  const upcomingOnly = !activeDraft && !tmFrom && !tmTo;
  const from = weeks[range[0]];
  const to = weeks[range[1]] ? mapWeekEnd(weeks[range[1]], window?.to) : undefined;
  const filtered = useMemo(
    () => filterMapTournaments(tournaments, formats, types, from, to, upcomingOnly),
    [tournaments, formats, types, from, to, upcomingOnly],
  );
  const located = useMemo(() => filtered.filter(hasMapCoordinates), [filtered]);
  const missing = filtered.length - located.length;
  const commitRange = ([start, end]: [number, number]) => {
    void navigate({
      search: prev => ({ ...prev, tmFrom: weeks[start], tmTo: weeks[end] }),
    }).then(() => setDraft(current => (current?.key === rangeKey ? null : current)));
  };

  return (
    <>
      <TournamentNavigation />
      <div className="mb-3 flex flex-wrap items-center gap-4">
        <h3 className="mb-0">Tournament Map</h3>
        <div className="ml-auto">
          {user ? (
            <Button variant="outline" size="sm" asChild>
              <Link to="/settings" search={{ page: 'home-location' }}>
                <House className="size-4" />
                {home.data ? 'Home location settings' : 'Set home location'}
              </Link>
            </Button>
          ) : (
            <Alert variant="info" size="xs" role="note" className="max-w-md py-2">
              <Info className="size-4 shrink-0" aria-hidden="true" />
              <div>
                <SignIn
                  trigger={
                    <Button variant="link" className="h-auto p-0 text-sm text-inherit underline">
                      Log in
                    </Button>
                  }
                />{' '}
                to save tournaments, plan your calendar, and find events near home.
              </div>
            </Alert>
          )}
        </div>
      </div>
      {user && home.isError && (
        <div role="alert" className="mb-3 text-sm text-muted-foreground">
          Could not load your home location.{' '}
          <Button variant="link" size="sm" onClick={() => void home.refetch()}>
            Retry
          </Button>
        </div>
      )}
      <div className="mb-4 grid gap-5 rounded-lg border bg-card p-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-4">
          <fieldset className="min-w-0">
            <legend className="mb-2 text-sm font-medium">Format</legend>
            <div className="grid grid-cols-3 gap-3">
              {mapFormats.map(option => (
                <div key={option.id} className="min-w-0 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Checkbox
                      id={`map-format-${option.id}`}
                      checked={formats.includes(option.id)}
                      onCheckedChange={checked => {
                        const selected = mapFormats
                          .filter(f =>
                            f.id === option.id ? checked === true : formats.includes(f.id),
                          )
                          .map(f => f.id);
                        void navigate({
                          search: prev => ({
                            ...prev,
                            tmFormats: selected.length === mapFormats.length ? undefined : selected,
                          }),
                        });
                      }}
                      style={{
                        borderColor: mapPinColor(option.id, 0, 12),
                        backgroundColor: formats.includes(option.id)
                          ? mapPinColor(option.id, 0, 12)
                          : undefined,
                        color: '#171717',
                      }}
                    />
                    <Label
                      htmlFor={`map-format-${option.id}`}
                      className="whitespace-nowrap text-sm"
                    >
                      {option.label}
                    </Label>
                  </div>
                  <div className="flex h-1.5 gap-px" aria-hidden="true">
                    {Array.from({ length: 12 }, (_, index) => (
                      <span
                        key={index}
                        className="min-w-0 flex-1 rounded-xs"
                        style={{ background: mapPinColor(option.id, index, 12) }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </fieldset>
          <fieldset className="min-w-0">
            <legend className="mb-2 text-sm font-medium">Type</legend>
            <div className="grid grid-cols-3 gap-3">
              {mapTypes.map(option => (
                <div key={option.id} className="flex min-w-0 items-center gap-1.5">
                  <Checkbox
                    id={`map-type-${option.id}`}
                    checked={types.includes(option.id)}
                    onCheckedChange={checked => {
                      const selected = mapTypes
                        .filter(type =>
                          type.id === option.id ? checked === true : types.includes(type.id),
                        )
                        .map(type => type.id);
                      void navigate({
                        search: prev => ({
                          ...prev,
                          tmTypes: selected.length === mapTypes.length ? undefined : selected,
                        }),
                      });
                    }}
                  />
                  <Label htmlFor={`map-type-${option.id}`} className="text-sm">
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          </fieldset>
        </div>
        <div className="min-w-0 space-y-3">
          <WeekRangeSlider
            weeks={weeks}
            windowEnd={window?.to}
            summaries={weekSummaries}
            value={range}
            onChange={value => setDraft({ key: rangeKey, value })}
            onCommit={commitRange}
          />
          {user && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="map-saved-only"
                checked={savedOnly}
                onCheckedChange={checked =>
                  void navigate({
                    search: prev => ({ ...prev, tmSaved: checked === true ? true : undefined }),
                  })
                }
              />
              <Label htmlFor="map-saved-only">Saved tournaments only</Label>
            </div>
          )}
        </div>
      </div>
      {query.error && (
        <div role="alert" className="mb-3 rounded-md border p-3 text-sm">
          {query.data ? 'Could not refresh. Showing saved tournaments.' : query.error.message}{' '}
          <Button variant="link" size="sm" onClick={() => void query.refetch()}>
            Retry
          </Button>
        </div>
      )}
      {(!query.data && !query.error) || (savedOnly && saves.isPending) ? (
        <p role="status" className="py-12 text-center text-muted-foreground">
          Loading tournaments…
        </p>
      ) : (
        <>
          {filtered.length === 0 && (
            <p className="mb-3 text-sm">
              No tournaments match these filters. Adjust the week range, format, or type.
            </p>
          )}
          {filtered.length > 0 && located.length === 0 && (
            <p className="mb-3 text-sm">These tournaments don’t have saved locations yet.</p>
          )}
          <Suspense fallback={<div className="h-[60vh] animate-pulse rounded-lg bg-muted" />}>
            <TournamentMapCanvas
              ref={map}
              tournaments={located}
              weeks={weeks}
              windowStart={window?.from}
              homeCoordinates={user ? (home.data?.coordinates ?? null) : null}
              savedTournamentStatuses={savedTournamentStatuses}
              simpleRemoval={!savedOnly}
            >
              {user && (
                <YourTournamentsOverlay
                  key={user.id}
                  tournaments={saves.data}
                  isLoading={saves.isPending}
                  isError={saves.isError}
                  onRetry={() => void saves.refetch()}
                  onFocus={tournament => map.current?.focusTournament(tournament)}
                />
              )}
            </TournamentMapCanvas>
          </Suspense>
          <p role="status" className="mt-2 text-sm text-muted-foreground">
            {located.length} {located.length === 1 ? 'tournament' : 'tournaments'} on the map
            {missing > 0 ? ` · ${missing} without coordinates` : ''}
            {upcomingOnly ? ' · Upcoming events' : ''}
          </p>
        </>
      )}
    </>
  );
}
