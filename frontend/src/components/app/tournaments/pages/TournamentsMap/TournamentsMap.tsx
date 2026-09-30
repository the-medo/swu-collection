import { lazy, Suspense, useMemo, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { House } from 'lucide-react';
import { useHomeLocation } from '@/api/user/useHomeLocation.ts';
import SignInWrapper from '@/components/app/auth/SignInWrapper.tsx';
import { Route } from '@/routes/tournaments/map';
import { useGetMetas } from '@/api/meta';
import { useTournamentMap } from '@/api/tournaments/useTournamentMap.ts';
import TournamentNavigation from '@/components/app/tournaments/TournamentNavigation/TournamentNavigation.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Checkbox } from '@/components/ui/checkbox.tsx';
import { Label } from '@/components/ui/label.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import { setArraySorted, setInfo } from '../../../../../../../lib/swu-resources/set-info.ts';
import { SwuSet } from '../../../../../../../types/enums.ts';
import {
  defaultMapFormats,
  defaultMapTypes,
  filterMapTournaments,
  hasMapCoordinates,
  mapFormats,
  mapPinColor,
  mapTypes,
  mapWeekRange,
  mapWeeks,
  mapWeekSummaries,
} from './mapData.ts';
import { WeekRangeSlider } from './WeekRangeSlider.tsx';
import type { MapTournament } from '../../../../../../../types/TournamentMap.ts';

const TournamentMapCanvas = lazy(() => import('./TournamentMapCanvas.tsx'));
const emptyTournaments: MapTournament[] = [];

export default function TournamentsMap() {
  const { tmSet, tmFrom, tmTo, tmFormats, tmTypes, metaId } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const metas = useGetMetas();
  const defaultSet = useMemo(() => {
    const selected = metas.data?.data.find(item => item.meta.id === metaId);
    const latest = metas.data?.data
      .filter(item => item.meta.format === 1)
      .sort((a, b) => b.meta.date.localeCompare(a.meta.date))[0];
    const value = selected?.meta.set ?? latest?.meta.set;
    return Object.values(SwuSet).find(set => set === value) ?? setArraySorted[0];
  }, [metas.data, metaId]);
  const set = tmSet ?? (metas.isPending ? undefined : defaultSet);
  const query = useTournamentMap(set);
  const home = useHomeLocation();
  const tournaments = query.data ?? emptyTournaments;
  const formats = tmFormats ?? defaultMapFormats;
  const types = tmTypes ?? defaultMapTypes;
  const weeks = useMemo(() => mapWeeks(tournaments), [tournaments]);
  const weekSummaries = useMemo(
    () =>
      mapWeekSummaries(
        weeks,
        filterMapTournaments(tournaments, formats, types, undefined, undefined),
      ),
    [weeks, tournaments, formats, types],
  );
  // Keep dragging local and live; commit one shareable URL/history entry on release.
  const rangeKey = `${set}:${tmFrom}:${tmTo}:${weeks.join(',')}`;
  const [draft, setDraft] = useState<{ key: string; value: [number, number] } | null>(null);
  const activeDraft = draft?.key === rangeKey ? draft : null;
  const range = activeDraft?.value ?? mapWeekRange(weeks, tmFrom, tmTo);
  const upcomingOnly = !activeDraft && !tmFrom && !tmTo;
  const from = weeks[range[0]];
  const to = weeks[range[1]];
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
        <div className="flex min-w-[220px] flex-1 items-center gap-2 sm:max-w-sm">
          <Label htmlFor="map-set" className="text-muted-foreground">
            Set
          </Label>
          <Select
            value={set ?? ''}
            onValueChange={value => {
              const parsed = Object.values(SwuSet).find(code => code === value);
              if (parsed)
                void navigate({
                  search: prev => ({ ...prev, tmSet: parsed, tmFrom: undefined, tmTo: undefined }),
                });
            }}
          >
            <SelectTrigger id="map-set">
              <SelectValue placeholder="Loading sets…" />
            </SelectTrigger>
            <SelectContent>
              {setArraySorted.map(code => (
                <SelectItem key={code} value={code}>
                  {setInfo[code].name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="mb-3 flex items-center gap-2">
        <SignInWrapper text="Set home location">
          <Button variant="outline" size="sm" asChild>
            <Link to="/settings" search={{ page: 'home-location' }}>
              <House className="size-4" />
              {home.data ? 'Home location settings' : 'Set home location'}
            </Link>
          </Button>
        </SignInWrapper>
        {home.isError && (
          <span role="alert" className="text-sm text-muted-foreground">
            Could not load your home location.{' '}
            <Button variant="link" size="sm" onClick={() => void home.refetch()}>
              Retry
            </Button>
          </span>
        )}
      </div>
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
        <WeekRangeSlider
          weeks={weeks}
          summaries={weekSummaries}
          value={range}
          onChange={value => setDraft({ key: rangeKey, value })}
          onCommit={commitRange}
        />
      </div>
      {query.error && (
        <div role="alert" className="mb-3 rounded-md border p-3 text-sm">
          {query.data ? 'Could not refresh. Showing saved tournaments.' : query.error.message}{' '}
          <Button variant="link" size="sm" onClick={() => void query.refetch()}>
            Retry
          </Button>
        </div>
      )}
      {!query.data && !query.error ? (
        <p role="status" className="py-12 text-center text-muted-foreground">
          Loading tournaments…
        </p>
      ) : (
        <>
          {filtered.length === 0 && (
            <p className="mb-3 text-sm">
              No tournaments match these filters. Adjust the week range, format, type, or set.
            </p>
          )}
          {filtered.length > 0 && located.length === 0 && (
            <p className="mb-3 text-sm">These tournaments don’t have saved locations yet.</p>
          )}
          <Suspense fallback={<div className="h-[60vh] animate-pulse rounded-lg bg-muted" />}>
            <TournamentMapCanvas
              tournaments={located}
              weeks={weeks}
              set={set}
              homeCoordinates={home.data?.coordinates ?? null}
            />
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
