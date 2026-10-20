import { parseHTML } from 'linkedom';
import { z } from 'zod';
import { meleeUsernameSchema } from '../../../shared/lib/meleeConnection.ts';
import type { TournamentReportRound } from '../../../shared/types/TournamentReport.ts';
import { MeleeConnectionError } from './profile.ts';

const label = z.string().max(2000);
const playerReportSchema = z.object({
  username: label,
  matches: z
    .array(
      z.object({
        roundName: label,
        opponentName: label.nullish(),
        opponentUsername: label.nullish(),
        result: label,
        shortResult: label.nullish(),
      }),
    )
    .max(100),
});
const standingsSchema = z.object({
  recordsTotal: z.number().int().nonnegative().max(100_000),
  recordsFiltered: z.number().int().nonnegative().max(1000),
  data: z
    .array(
      z.object({
        Team: z.object({
          Players: z
            .array(z.object({ ID: z.number().int().positive(), Username: label }))
            .min(1)
            .max(4),
        }),
      }),
    )
    .max(100),
});
const headers = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
  'X-Requested-With': 'XMLHttpRequest',
};
const normalize = (value: string) => value.trim().toLowerCase();

// Use the event's ordering for named playoff rounds; do not number them from the
// author's match count (which may omit rounds after dropping or missing results).
function readRounds(html: string, meleeId: number) {
  const { document } = parseHTML(html);
  if (document.querySelector('#tournament-id')?.getAttribute('value') !== String(meleeId))
    throw new Error('Unrecognized tournament page');
  const byId = new Map<number, string>();
  let standingRoundId: number | undefined;
  for (const button of document.querySelectorAll(
    '#standings-round-selector-container button.round-selector, #pairings-round-selector-container button.round-selector',
  )) {
    const id = Number(button.getAttribute('data-id'));
    const name = button.getAttribute('data-name')?.trim();
    if (!Number.isSafeInteger(id) || id <= 0 || !name) throw new Error('Invalid round');
    if (byId.has(id) && byId.get(id) !== name) throw new Error('Conflicting round');
    byId.set(id, name);
    if (
      button.closest('#standings-round-selector-container') &&
      button.getAttribute('data-is-completed')?.toLowerCase() === 'true'
    )
      standingRoundId = id;
  }
  if (byId.size > 100) throw new Error('Too many rounds');
  const numbers = new Map<string, number>();
  const assignedNumbers = new Set<number>();
  for (const [index, name] of [...byId.values()].entries()) {
    const key = normalize(name);
    const number = Number(name.match(/^Round\s+(\d+)$/i)?.[1] ?? index + 1);
    if (numbers.has(key) || assignedNumbers.has(number) || number < 1 || number > 100)
      throw new Error('Ambiguous round');
    numbers.set(key, number);
    assignedNumbers.add(number);
  }
  // Latest completed standings include late entrants as well as dropped players
  // (verified with a player who dropped before Torino's cut). No standings yet
  // means there are no published results to prefill.
  return { standingRoundId, numbers };
}

export function parseMeleePlayerReport(
  value: unknown,
  username: string,
  roundNumbers: Map<string, number>,
): TournamentReportRound[] {
  const report = playerReportSchema.parse(value);
  if (normalize(report.username) !== normalize(username)) throw new Error('Wrong player');
  const seen = new Set<number>();
  const rounds = report.matches
    .map((match): TournamentReportRound => {
      const round = roundNumbers.get(normalize(match.roundName));
      if (!round || seen.has(round)) throw new Error('Unknown or duplicate round');
      seen.add(round);
      const opponentName = match.opponentName?.trim() || match.opponentUsername?.trim() || null;
      const short = match.shortResult?.trim() ?? '';
      const bye =
        !opponentName && (/^bye$/i.test(short) || / was assigned a bye\.?$/i.test(match.result));
      const score = short.match(/^(Win|Loss|Draw)(?: (\d{1,3})-(\d{1,3})-(\d{1,3}))?$/i);
      const outcome = bye
        ? 'bye'
        : score
          ? ({ win: 'win', loss: 'loss', draw: 'draw' } as const)[
              normalize(score[1]!) as 'win' | 'loss' | 'draw'
            ]
          : 'unknown';
      let games: TournamentReportRound['games'] = null;
      if (!bye && score?.[2]) {
        // Verified on Melee's player hovercard: "Loss 2-1-0" is winner-first,
        // even though the Win/Loss label is already from this player's perspective.
        const first = Number(score[2]);
        const second = Number(score[3]);
        if (first + second > 0)
          games = {
            wins: outcome === 'loss' ? second : first,
            losses: outcome === 'loss' ? first : second,
            draws: Number(score[4]),
          };
      }
      return {
        round,
        opponentName: bye ? null : opponentName,
        opponentDeck: null,
        outcome,
        games,
        record: null,
      };
    })
    .sort((a, b) => a.round - b.round);
  const record = { wins: 0, losses: 0, draws: 0 };
  let previous = 0;
  let complete = true;
  for (const round of rounds) {
    complete &&= round.round === previous + 1 && round.outcome !== 'unknown';
    previous = round.round;
    if (round.outcome === 'win' || round.outcome === 'bye') record.wins++;
    if (round.outcome === 'loss') record.losses++;
    if (round.outcome === 'draw') record.draws++;
    round.record = complete ? { ...record } : null;
  }
  return rounds;
}

export function createMeleePlayerReportFetcher(fetcher: typeof fetch = fetch, now = Date.now) {
  const cache = new Map<string, { expiresAt: number; promise: Promise<TournamentReportRound[]> }>();

  async function load(meleeId: number, username: string) {
    // One budget covers the lookup, filtered standings pages, and player request.
    const signal = AbortSignal.timeout(20_000);
    async function request(path: string, json: boolean, form?: URLSearchParams) {
      const response = await fetcher(`https://melee.gg${path}`, {
        method: form ? 'POST' : 'GET',
        redirect: 'error',
        signal,
        headers: {
          ...headers,
          Accept: json ? 'application/json' : 'text/html',
          ...(form ? { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' } : {}),
        },
        body: form,
      });
      if (
        !response.ok ||
        !response.headers.get('content-type')?.includes(json ? 'application/json' : 'text/html')
      )
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
      return Buffer.concat(chunks).toString('utf8');
    }

    const { standingRoundId, numbers } = readRounds(
      await request(`/Tournament/View/${meleeId}`, false),
      meleeId,
    );
    if (!standingRoundId) return [];
    const playerIds = new Set<number>();
    const seenPlayers = new Set<number>();
    let start = 0;
    let total: number | undefined;
    do {
      const page = standingsSchema.parse(
        JSON.parse(
          await request(
            '/Standing/GetRoundStandings',
            true,
            new URLSearchParams({
              draw: String(start + 1),
              start: String(start),
              length: '100',
              'order[0][column]': '0',
              'order[0][dir]': 'asc',
              'columns[0][data]': 'Rank',
              'search[value]': username,
              'search[regex]': 'false',
              roundId: String(standingRoundId),
            }),
          ),
        ),
      );
      if (
        page.recordsFiltered > page.recordsTotal ||
        (total !== undefined && total !== page.recordsFiltered)
      )
        throw new Error('Standings changed');
      total = page.recordsFiltered;
      if ((!page.data.length && start < total) || start + page.data.length > total)
        throw new Error('Incomplete standings');
      for (const row of page.data)
        for (const player of row.Team.Players) {
          if (seenPlayers.has(player.ID)) throw new Error('Repeated standings');
          seenPlayers.add(player.ID);
          if (normalize(player.Username) === normalize(username)) playerIds.add(player.ID);
        }
      start += page.data.length;
    } while (start < total);
    if (playerIds.size !== 1) throw new Error('Player not uniquely identified');
    // This returns every match for this event's player, including opponents and
    // results when decklists are absent. Never fetch the event's full pairings.
    return parseMeleePlayerReport(
      JSON.parse(await request(`/Player/GetPlayerDetails?id=${[...playerIds][0]}`, true)),
      username,
      numbers,
    );
  }

  return async (meleeId: number, username: string): Promise<TournamentReportRound[]> => {
    try {
      z.number().int().positive().parse(meleeId);
      username = meleeUsernameSchema.parse(username);
      const key = JSON.stringify([meleeId, normalize(username)]);
      let entry = cache.get(key);
      if (!entry || entry.expiresAt <= now()) {
        if (cache.size >= 128) cache.delete(cache.keys().next().value!);
        const next = {
          expiresAt: Infinity,
          promise: Promise.resolve([] as TournamentReportRound[]),
        };
        next.promise = load(meleeId, username)
          .then(rounds => {
            next.expiresAt = now() + 60_000;
            return rounds;
          })
          .catch(error => {
            if (cache.get(key) === next) cache.delete(key);
            throw error;
          });
        cache.set(key, next);
        entry = next;
      }
      return structuredClone(await entry.promise);
    } catch {
      throw new MeleeConnectionError(
        'Could not load your rounds from Melee. Retry to fill them in, or continue with the available report details.',
        502,
      );
    }
  };
}

export const fetchMeleePlayerReport = createMeleePlayerReportFetcher();
