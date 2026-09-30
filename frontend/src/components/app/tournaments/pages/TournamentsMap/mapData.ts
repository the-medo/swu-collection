import { addDays, format, parseISO } from 'date-fns';
import type {
  MapTournament,
  TournamentMapRange,
} from '../../../../../../../types/TournamentMap.ts';
import type { SavedTournament } from '../../../../../../../types/UserTournamentSave.ts';
import { savedTournamentMarkers } from './savedTournamentMarkers.ts';
import type { EventHighlight } from '../../../../../../../types/EventHighlight.ts';
import {
  mapWeekIndex,
  rangeDates,
  shiftDate,
} from '../../../../../../../shared/lib/tournamentMapDates.ts';

export const mapTypes = [
  { id: 'pq', label: 'PQs', tournamentTypes: ['pq'] },
  { id: 'open', label: 'Opens', tournamentTypes: ['open'] },
  { id: 'major', label: 'Majors', tournamentTypes: ['sq', 'rq', 'gc'] },
] as const;
export type MapType = (typeof mapTypes)[number]['id'];
export const defaultMapTypes = mapTypes.map(type => type.id);

const majorPinLogos: Partial<Record<string, string>> = {
  sq: 'https://images.swubase.com/logos/organized-play/sector-qualifier.png',
  rq: 'https://images.swubase.com/logos/organized-play/regional-championship.png',
  gc: 'https://images.swubase.com/logos/organized-play/galactic-championship.png',
};

export function mapPinLogo(type: string) {
  return majorPinLogos[type];
}

export function mapWeekEnd(week: string, windowEnd?: string) {
  const end = shiftDate(week, 6);
  return windowEnd && windowEnd < end ? windowEnd : end;
}

export function weekLabel(week: string, windowEnd?: string) {
  const start = parseISO(week);
  return `${format(start, 'MMM d')} – ${format(parseISO(mapWeekEnd(week, windowEnd)), 'MMM d, yyyy')}`;
}

export function mapWeekSummaries(
  weeks: string[],
  tournaments: MapTournament[],
  highlights: EventHighlight[] = [],
  windowEnd?: string,
  savedTournaments: readonly SavedTournament[] = [],
) {
  const summaries = weeks.map(week => ({
    week,
    count: 0,
    majors: [] as MapTournament[],
    highlights: [] as EventHighlight[],
    savedTournaments: [] as SavedTournament[],
  }));
  if (!weeks.length) return summaries;
  const end = windowEnd ?? mapWeekEnd(weeks[weeks.length - 1]!);
  for (const tournament of tournaments) {
    const summary = summaries[mapWeekIndex(tournament.date, weeks[0])];
    if (!summary || tournament.date > end) continue;
    summary.count++;
    if (mapPinLogo(tournament.type)) summary.majors.push(tournament);
  }
  for (const highlight of highlights) {
    const summary = summaries[mapWeekIndex(highlight.date, weeks[0])];
    if (summary && highlight.date <= end) summary.highlights.push(highlight);
  }
  for (const saved of savedTournaments) {
    const summary = summaries[mapWeekIndex(saved.tournament.date, weeks[0])];
    if (summary && saved.tournament.date <= end) summary.savedTournaments.push(saved);
  }
  for (const summary of summaries) {
    summary.savedTournaments.sort(
      (a, b) =>
        savedTournamentMarkers[a.status].priority - savedTournamentMarkers[b.status].priority ||
        a.tournament.date.localeCompare(b.tournament.date) ||
        a.tournament.name.localeCompare(b.tournament.name) ||
        a.tournamentId.localeCompare(b.tournamentId),
    );
  }
  return summaries;
}

export function filterMapTournaments(
  tournaments: MapTournament[],
  formats: readonly number[],
  types: readonly MapType[],
  from: string | undefined,
  to: string | undefined,
  upcomingOnly = false,
  today = format(new Date(), 'yyyy-MM-dd'),
) {
  const tournamentTypes = new Set<string>(
    mapTypes.filter(type => types.includes(type.id)).flatMap(type => [...type.tournamentTypes]),
  );
  return tournaments.filter(
    t =>
      formats.includes(t.format) &&
      tournamentTypes.has(t.type) &&
      (!upcomingOnly ||
        format(addDays(parseISO(t.date), Math.max(0, t.days - 1)), 'yyyy-MM-dd') >= today) &&
      (!from || t.date >= from) &&
      (!to || t.date <= to),
  );
}

// The server's anchor defines week one, including weeks with no tournaments.
export function mapWeeks(range?: TournamentMapRange) {
  return range ? rangeDates(range).filter((_, index) => index % 7 === 0) : [];
}

export function mapWeekRange(
  weeks: string[],
  from?: string,
  to?: string,
  today = format(new Date(), 'yyyy-MM-dd'),
): [number, number] {
  if (!weeks.length) return [0, 0];
  const findWeek = (date: string) => {
    return Math.max(0, Math.min(weeks.length - 1, mapWeekIndex(date, weeks[0])));
  };
  const start = findWeek(from ?? today);
  const end = to ? findWeek(to) : weeks.length - 1;
  return [Math.min(start, end), Math.max(start, end)];
}

export const mapFormats = [
  { id: 1, label: 'Premier', rgb: '250, 204, 21' },
  { id: 3, label: 'Sealed play', rgb: '194, 65, 12' },
  { id: 6, label: 'Eternal', rgb: '249, 115, 22' },
] as const;
export const defaultMapFormats = mapFormats.map(format => format.id);

export function mapPinColor(formatId: number, weekIndex: number, weekCount: number) {
  // Twelve fixed shades. Longer seasons distribute those shades over the whole
  // season; filtering never changes a tournament's original shade.
  const shade = Math.round(
    Math.max(0, Math.min(11, (weekIndex * 11) / Math.max(11, weekCount - 1))),
  );
  const opacity = (1 - (shade * 0.65) / 11).toFixed(3);
  const rgb = mapFormats.find(format => format.id === formatId)?.rgb ?? '148, 163, 184';
  return `rgba(${rgb}, ${opacity})`;
}

export function mapClusterBackground(colors: string[]) {
  const counts = new Map<string, number>();
  for (const color of colors) counts.set(color, (counts.get(color) ?? 0) + 1);
  let offset = 0;
  return `conic-gradient(${Array.from(counts, ([color, count]) => {
    const start = offset;
    offset += (count / colors.length) * 100;
    return `${color} ${start}% ${offset}%`;
  }).join(', ')})`;
}

export function hasMapCoordinates(
  t: MapTournament,
): t is MapTournament & { coordinates: NonNullable<MapTournament['coordinates']> } {
  const point = t.coordinates;
  return (
    !!point &&
    Number.isFinite(point.x) &&
    Number.isFinite(point.y) &&
    Math.abs(point.x) <= 180 &&
    Math.abs(point.y) <= 90
  );
}

export function tournamentLinks(t: Pick<MapTournament, 'meleeId' | 'additionalInfo'>) {
  const links = new Map<string, string>();
  const add = (label: string, value: unknown) => {
    if (typeof value !== 'string') return;
    try {
      const url = new URL(value);
      if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return;
      if (!links.has(url.href)) links.set(url.href, label);
    } catch {
      /* Incomplete URLs are not navigable. */
    }
  };
  if (t.meleeId && /^\d+$/.test(t.meleeId))
    add('Melee.gg', `https://melee.gg/Tournament/View/${t.meleeId}`);
  add('Melee.gg', t.additionalInfo.meleeUrl);
  add('Store', t.additionalInfo.storeUrl);
  add('Event website', t.additionalInfo.sourceUrl);
  if (Array.isArray(t.additionalInfo.links)) {
    for (const link of t.additionalInfo.links) {
      if (link && typeof link === 'object')
        add(typeof link.label === 'string' ? link.label : 'Event link', link.url);
    }
  }
  return Array.from(links, ([url, label]) => ({ url, label }));
}

export function locationText(t: Pick<MapTournament, 'location' | 'additionalInfo'>) {
  return (
    ['venueName', 'address', 'city', 'state', 'postalCode', 'country']
      .map(key => t.additionalInfo[key])
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .join(', ') || t.location
  );
}
