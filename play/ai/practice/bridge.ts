import { createInterface } from 'node:readline';
import { z } from 'zod';
import { leagueGameContract } from '../full-game/game.ts';
import { curriculumManifest, curriculumRows } from './curriculum.ts';
const request = z.discriminatedUnion('op', [
  z.strictObject({ id: z.number().int(), op: z.literal('hello') }),
  z.strictObject({ id: z.number().int(), op: z.literal('catalogue') }),
  z.strictObject({ id: z.number().int(), op: z.literal('case'), caseId: z.string().max(100) }),
]);
// Keep framing identical to the game bridge: the JSON and newline must flush
// together even when a response ends exactly on a pipe-buffer boundary.
const respond = (json: string) =>
  new Promise<void>((resolve, reject) => {
    process.stdout.write(`${json}\n`, error => (error ? reject(error) : resolve()));
  });
if (import.meta.main)
  for await (const line of createInterface({ input: process.stdin, crlfDelay: Infinity })) {
    let id: number | null = null;
    try {
      if (Buffer.byteLength(line) > 65536) throw new Error('Request too large');
      const r = request.parse(JSON.parse(line));
      id = r.id;
      const data =
        r.op === 'hello'
          ? leagueGameContract
          : r.op === 'catalogue'
            ? curriculumManifest
            : curriculumRows(r.caseId);
      const response = JSON.stringify({ id, ok: true, data });
      if (Buffer.byteLength(response) > 32_000_000)
        throw new Error('Practice response exceeds budget');
      await respond(response);
    } catch (error) {
      await respond(
        JSON.stringify({
          id,
          ok: false,
          error: error instanceof Error ? error.message : 'Practice request failed',
        }),
      );
    }
  }
