import type { TournamentSaveStatus } from '../../../types/UserTournamentSave.ts';

export interface CalendarEvent {
  id: string;
  name: string;
  date: string;
  days: number;
  location: string;
  additionalInfo: Record<string, unknown>;
  meleeId: string | null;
  formatName: string | null;
  status: TournamentSaveStatus;
  updatedAt: Date;
}

// RFC 5545 TEXT escaping prevents event data from injecting calendar properties.
const text = (value: string) =>
  value
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');

// Fold at 75 UTF-8 octets, including the continuation space; never split a code point.
export function foldCalendarLine(line: string) {
  let result = '',
    size = 0;
  for (const character of line) {
    const bytes = Buffer.byteLength(character);
    if (size + bytes > 75) {
      result += '\r\n ';
      size = 1;
    }
    result += character;
    size += bytes;
  }
  return result;
}

export function tournamentCalendar(events: CalendarEvent[], origin: string) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SWUBASE//Tournament Calendar//EN',
    'CALSCALE:GREGORIAN',
    'X-WR-CALNAME:Your SWUBASE tournaments',
    `X-WR-CALDESC:${text('Your saved, maybe, and going SWUBASE tournaments.')}`,
  ];
  const statuses = { saved: 'Saved', maybe: 'Maybe', going: 'Going' };
  for (const event of events) {
    const end = new Date(`${event.date}T00:00:00Z`);
    end.setUTCDate(end.getUTCDate() + Math.max(1, event.days));
    const url = `${origin}/tournaments/${event.id}`;
    const modified = event.updatedAt
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}Z$/, 'Z');
    const location =
      ['venueName', 'address', 'city', 'state', 'postalCode', 'country']
        .map(key => event.additionalInfo[key])
        .filter((value): value is string => typeof value === 'string' && !!value.trim())
        .join(', ') || event.location;
    const description = [
      `My status: ${statuses[event.status]}`,
      event.formatName ? `Format: ${event.formatName}` : '',
      `SWUBASE: ${url}`,
      event.meleeId && /^\d+$/.test(event.meleeId)
        ? `Melee.gg: https://melee.gg/Tournament/View/${event.meleeId}`
        : '',
    ]
      .filter(Boolean)
      .join('\n');
    lines.push(
      'BEGIN:VEVENT',
      `UID:tournament-${event.id}@swubase.com`,
      `DTSTAMP:${modified}`,
      `LAST-MODIFIED:${modified}`,
      `DTSTART;VALUE=DATE:${event.date.replace(/-/g, '')}`,
      // DATE DTEND is exclusive, so a one-day event ends on the next date.
      `DTEND;VALUE=DATE:${end.toISOString().slice(0, 10).replace(/-/g, '')}`,
      `SUMMARY:${text(event.name)}`,
      `DESCRIPTION:${text(description)}`,
      `LOCATION:${text(location)}`,
      `URL:${url}`,
      `CATEGORIES:${statuses[event.status]}`,
      `STATUS:${event.status === 'going' ? 'CONFIRMED' : 'TENTATIVE'}`,
      'CLASS:PRIVATE',
      'TRANSP:TRANSPARENT',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.map(foldCalendarLine).join('\r\n') + '\r\n';
}
