import { z } from 'zod';
import { meleeUsernameSchema } from '../../../shared/lib/meleeConnection.ts';
import { MeleeConnectionError } from './profile.ts';

const resultSchema = z.object({
  UserName: z.string(),
  TournamentId: z.number().int().positive(),
  TournamentName: z.string().min(1).max(2000),
  Game: z.string(),
  TournamentStatus: z.number().int(),
  TournamentStartDate: z.iso.datetime({ offset: true }),
  ParticipatingCount: z.number().int().nonnegative(),
  Rank: z.number().int().nonnegative().nullable(),
  Format: z.string().max(200).nullable(),
  FormatDescription: z.string().max(200).nullable().optional(),
  Record: z.string().max(100).nullable(),
  DecklistId: z.number().int().nonnegative().nullable(),
  DecklistName: z.string().max(2000).nullable(),
});
const pageSchema = z.object({
  recordsTotal: z.number().int().nonnegative().max(10_000),
  recordsFiltered: z.number().int().nonnegative().max(10_000),
  data: z.array(resultSchema).max(100),
});
export type MeleeResult = z.infer<typeof resultSchema>;

// Melee's public profile uses DataTables form POSTs (verified October 2026).
// Fetch all pages before changing the saved snapshot; a partial refresh is never published.
export async function fetchMeleeResults(
  username: string,
  fetcher: typeof fetch = fetch,
): Promise<MeleeResult[]> {
  meleeUsernameSchema.parse(username);
  const results = new Map<number, MeleeResult>();
  const seenPages = new Set<string>();
  const signal = AbortSignal.timeout(45_000);
  let expectedTotal: number | undefined;
  let start = 0;
  let previousTournamentId = 0;
  try {
    do {
      const response = await fetcher(
        `https://melee.gg/Profile/GetResults/${encodeURIComponent(username)}`,
        {
          method: 'POST',
          redirect: 'error',
          signal,
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'X-Requested-With': 'XMLHttpRequest',
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
          },
          body: new URLSearchParams({
            draw: String(start + 1),
            start: String(start),
            length: '100',
            'order[0][column]': '0',
            'order[0][dir]': 'asc',
            // Stable across pages even when several events share a start time.
            'columns[0][data]': 'TournamentId',
          }),
        },
      );
      if (!response.ok || !response.headers.get('content-type')?.includes('application/json'))
        throw new Error('Response unavailable');
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Empty response');
      const chunks: Uint8Array[] = [];
      let bytes = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          bytes += value.byteLength;
          if (bytes > 2_000_000) throw new Error('Oversized response');
          chunks.push(value);
        }
      } finally {
        await reader.cancel();
      }
      const page = pageSchema.parse(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      if (
        page.recordsFiltered !== page.recordsTotal ||
        (expectedTotal !== undefined && expectedTotal !== page.recordsTotal)
      )
        throw new Error('Results changed during pagination');
      expectedTotal = page.recordsTotal;
      if (!page.data.length && start < expectedTotal) throw new Error('Incomplete results');
      const fingerprint = JSON.stringify(page.data);
      if (seenPages.has(fingerprint)) throw new Error('Repeated page');
      seenPages.add(fingerprint);
      for (const row of page.data) {
        // Melee sometimes returns the exact same entry twice. Deduplicate it, but
        // reject conflicting placements rather than choosing an arbitrary result.
        const previous = results.get(row.TournamentId);
        if (
          row.TournamentId < previousTournamentId ||
          row.UserName.toLowerCase() !== username.toLowerCase() ||
          (previous && JSON.stringify(previous) !== JSON.stringify(row))
        )
          throw new Error('Inconsistent results');
        previousTournamentId = row.TournamentId;
        results.set(row.TournamentId, row);
      }
      start += page.data.length;
      if (start > expectedTotal) throw new Error('Unexpected results');
    } while (start < expectedTotal);
    return [...results.values()].filter(row => row.Game === 'StarWarsUnlimited');
  } catch {
    throw new MeleeConnectionError(
      'Could not refresh all results from Melee. Your saved results have been kept. Please try again later.',
      502,
    );
  }
}
