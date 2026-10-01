import { expect, test } from 'bun:test';
import { tournamentCalendar, type CalendarEvent } from './ical.ts';
import { calendarOrigin, calendarToken, calendarTokenId, isCalendarFeedRequest } from './token.ts';

const event: CalendarEvent = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Paris PQ',
  date: '2026-10-31',
  days: 3,
  location: 'Paris',
  additionalInfo: {},
  meleeId: '123',
  formatName: 'Premier',
  status: 'going',
  updatedAt: new Date('2026-09-30T12:34:56Z'),
};
const unfold = (value: string) => value.replace(/\r\n /g, '');

test.each(['saved', 'maybe', 'going'] as const)(
  '%s events allow subscription readers to see details without blocking their availability',
  status => {
    const body = unfold(tournamentCalendar([{ ...event, status }], 'https://example.com'));
    // Google subscription readers cannot see private details; private + free can disappear.
    expect(body).toContain('\r\nCLASS:PUBLIC\r\n');
    expect(body).toContain('\r\nTRANSP:TRANSPARENT\r\n');
  },
);

test('calendar uses stable IDs, all-day dates and exclusive ends across months, DST and leap days', () => {
  const body = unfold(tournamentCalendar([event], 'https://example.com'));
  expect(body).toContain('DTSTART;VALUE=DATE:20261031\r\nDTEND;VALUE=DATE:20261103');
  expect(body).toContain('UID:tournament-00000000-0000-4000-8000-000000000001@swubase.com');
  expect(body).toContain('DTSTAMP:20260930T123456Z\r\nLAST-MODIFIED:20260930T123456Z');
  expect(body).toContain('CATEGORIES:Going\r\nSTATUS:CONFIRMED');
  expect(body).toContain('Melee.gg: https://melee.gg/Tournament/View/123');
  expect(tournamentCalendar([event], 'https://example.com')).toBe(
    tournamentCalendar([event], 'https://example.com'),
  );
  for (const [date, days, end] of [
    ['2026-12-31', 1, '20270101'],
    ['2028-02-28', 2, '20280301'],
    ['2026-03-29', 1, '20260330'],
    ['2026-10-31', 0, '20261101'],
  ] as const)
    expect(tournamentCalendar([{ ...event, date, days }], 'https://example.com')).toContain(
      `DTEND;VALUE=DATE:${end}`,
    );
  for (const status of ['saved', 'maybe'] as const)
    expect(tournamentCalendar([{ ...event, status }], 'https://example.com')).toContain(
      'STATUS:TENTATIVE',
    );
  expect(tournamentCalendar([], 'https://example.com')).toEndWith('END:VCALENDAR\r\n');
  expect(tournamentCalendar([], 'https://example.com')).not.toContain('BEGIN:VEVENT');
});

test('escapes untrusted text, folds UTF-8 safely and exports only allowed event information', () => {
  const name = 'São Paulo 🪐 東京 '.repeat(12) + '\r\nBEGIN:VEVENT\nSUMMARY:Injected;comma,slash\\';
  const body = tournamentCalendar(
    [
      {
        ...event,
        name,
        additionalInfo: {
          address: '123 Street',
          city: 'São Paulo',
          country: 'Brazil',
          secretNote: 'PRIVATE NOTE',
          attachmentUrl: 'PRIVATE ATTACHMENT',
        },
      },
    ],
    'https://example.com',
  );
  for (const line of body.split('\r\n')) expect(Buffer.byteLength(line)).toBeLessThanOrEqual(75);
  const full = unfold(body);
  expect(full).not.toContain('�');
  expect(full.match(/^BEGIN:VEVENT$/gm)).toHaveLength(1);
  expect(full).toContain('\\nBEGIN:VEVENT\\nSUMMARY:Injected\\;comma\\,slash\\\\');
  expect(full).toContain('LOCATION:123 Street\\, São Paulo\\, Brazil');
  expect(full).not.toContain('PRIVATE NOTE');
  expect(full).not.toContain('PRIVATE ATTACHMENT');
  expect(full.replace(/\r\n/g, '')).not.toContain('\n');
});

test('signed calendar URLs require the correct ID and secret and keep configured origins', () => {
  const id = crypto.randomUUID(),
    secret = 'calendar-test-secret-'.repeat(3);
  const token = calendarToken(id, secret);
  expect(calendarTokenId(token, secret)).toBe(id);
  expect(calendarTokenId(token, secret + 'other')).toBeNull();
  expect(calendarTokenId(crypto.randomUUID() + token.slice(36), secret)).toBeNull();
  for (const invalid of [
    '',
    id,
    token + 'x',
    '../' + token,
    token.toUpperCase(),
    'x'.repeat(10_000),
  ])
    expect(calendarTokenId(invalid, secret)).toBeNull();
  expect(() => calendarToken(id, 'short')).toThrow('not configured');
  expect(calendarOrigin('https://example.com/api/auth')).toBe('https://example.com');
  expect(calendarOrigin('http://localhost:5176')).toBe('http://localhost:5176');
  for (const invalid of ['', 'javascript:alert(1)', 'https://user:password@example.com'])
    expect(() => calendarOrigin(invalid)).toThrow('not configured');
  expect(isCalendarFeedRequest(`https://example.com/api/calendar/${token}.ics`)).toBe(true);
  expect(isCalendarFeedRequest('/api/calendar/malformed')).toBe(true);
  expect(isCalendarFeedRequest('https://example.com/api/user-calendar-subscription')).toBe(false);
});
