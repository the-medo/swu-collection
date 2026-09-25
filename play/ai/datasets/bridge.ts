import { createInterface } from 'node:readline';
import { realpathSync, statSync, readFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { z } from 'zod';
import { configuredAiObjects } from '../releases/objects.ts';
import { datasetIndex, datasetKey } from './objects.ts';
import { decodeTrajectory } from './trajectory.ts';
import { humanExamples } from './examples.ts';
import { readTrainingRoster } from '../full-game/training-roster.ts';
import { leagueGameContract, rosterEnvironment } from '../full-game/game.ts';
import { aiHash } from '../../../shared/types/crossfire-ai-releases.ts';

const request = z.discriminatedUnion('op', [
  z.strictObject({ id: z.number().int(), op: z.literal('hello') }),
  z.strictObject({
    id: z.number().int(),
    op: z.literal('index'),
    shard: z.string().regex(/^[a-f0-9]{2}$/),
  }),
  z.strictObject({
    id: z.number().int(),
    op: z.literal('download'),
    exportId: z.uuid(),
    checksum: aiHash,
  }),
  z.strictObject({
    id: z.number().int(),
    op: z.literal('open'),
    path: z.string(),
    checksum: aiHash,
  }),
  z.strictObject({ id: z.number().int(), op: z.literal('next') }),
]);
if (import.meta.main) {
  const rosterIndex = process.argv.indexOf('--roster');
  const roster = rosterIndex < 0 ? undefined : readTrainingRoster(process.argv[rosterIndex + 1]!);
  const objects = configuredAiObjects();
  let examples: ReturnType<typeof humanExamples> | undefined;
  for await (const line of createInterface({ input: process.stdin, crlfDelay: Infinity })) {
    let id: number | null = null;
    try {
      if (Buffer.byteLength(line) > 65536) throw new Error('Request too large');
      const r = request.parse(JSON.parse(line));
      id = r.id;
      let data: unknown;
      if (r.op === 'hello') data = roster ? rosterEnvironment(roster).contract : leagueGameContract;
      else if (r.op === 'index') {
        if (!objects) throw new Error('Configure CROSSFIRE_AI_BUCKET');
        data = await datasetIndex(objects, r.shard);
      } else if (r.op === 'download') {
        if (!objects) throw new Error('Configure CROSSFIRE_AI_BUCKET');
        const entry = (await datasetIndex(objects, r.exportId.slice(0, 2))).entries.find(
          e => e.id === r.exportId && e.checksum === r.checksum,
        );
        if (!entry || entry.state !== 'available' || Date.parse(entry.expiresAt) <= Date.now())
          throw new Error('Dataset is withdrawn or expired');
        const object = await objects.read(datasetKey(r.exportId, r.checksum));
        if (!object) throw new Error('Dataset unavailable');
        const trajectory = decodeTrajectory(object.bytes, r.checksum);
        if (
          trajectory.exportId !== entry.id ||
          trajectory.groupId !== entry.groupId ||
          trajectory.createdAt !== entry.createdAt ||
          trajectory.expiresAt !== entry.expiresAt
        )
          throw new Error('Dataset provenance does not match its index');
        data = { bytes: object.bytes.toString('base64') };
      } else if (r.op === 'open') {
        const root = realpathSync(resolve('.swubase/crossfire-ai'));
        const path = realpathSync(r.path);
        if (!path.startsWith(root + sep) || statSync(path).size > 8_000_000)
          throw new Error('Invalid local dataset');
        const trajectory = decodeTrajectory(readFileSync(path), r.checksum);
        try {
          for (const _row of humanExamples(trajectory, roster)) {
            /* Validate before any learning. */
          }
          examples = humanExamples(trajectory, roster);
          data = { ready: true };
        } catch {
          examples = undefined;
          data = {
            ready: false,
            reason: 'Game requires a matching roster, engine target or action adapter',
          };
        }
      } else {
        if (!examples) throw new Error('Open a human game first');
        const next = examples.next();
        data = next.done ? { done: true } : { done: false, row: next.value };
      }
      await new Promise<void>((ok, fail) =>
        process.stdout.write(`${JSON.stringify({ id, ok: true, data })}\n`, e =>
          e ? fail(e) : ok(),
        ),
      );
    } catch (error) {
      examples = undefined;
      await new Promise<void>((ok, fail) =>
        process.stdout.write(
          `${JSON.stringify({ id, ok: false, error: error instanceof Error ? error.message : 'Dataset conversion failed' })}\n`,
          e => (e ? fail(e) : ok()),
        ),
      );
    }
  }
}
