import type { BundleVersions } from '../../cards/version-contract.ts';
import { readFileSync, statSync } from 'node:fs';
import { assertCompatibleVersions, catalogFor, registerCatalog } from '../../cards/catalog.ts';
import { validateCatalog } from '../../cards/validate.ts';
import { supportsEngine } from '../../engine/release.ts';
import { versions } from '../../engine/model.ts';
import { aiVersions } from '../../../shared/types/crossfire-ai-releases.ts';
import { createInterface } from 'node:readline';
import { z } from 'zod';
import { FullGame, fullGameContract, leagueGameContract, rosterEnvironment } from './game.ts';
import { readTrainingRoster } from './training-roster.ts';

const request = z.discriminatedUnion('op', [
  z.strictObject({ id: z.number().int(), op: z.literal('hello') }),
  z.strictObject({
    id: z.number().int(),
    op: z.literal('reset'),
    seed: z.number().int().min(0).max(0xffff_ffff),
    orientation: z.number().int().min(0).max(1).default(0),
    decks: z.tuple([z.number().int().min(0).max(31), z.number().int().min(0).max(31)]).optional(),
    limit: z.number().int().min(1).max(2500).nullable().default(1500),
    autoForced: z.boolean().default(false),
  }),
  z.strictObject({
    id: z.number().int(),
    op: z.literal('step'),
    generation: z.number().int(),
    ticket: z.number().int(),
    action: z.number().int().nonnegative(),
  }),
  z.strictObject({
    id: z.number().int(),
    op: z.literal('reference'),
    generation: z.number().int(),
    ticket: z.number().int(),
  }),
  z.strictObject({ id: z.number().int(), op: z.literal('replay'), generation: z.number().int() }),
  z.strictObject({ id: z.number().int(), op: z.literal('truncate'), generation: z.number().int() }),
]);
export class FullSession {
  constructor(
    readonly league = false,
    readonly environment?: ReturnType<typeof rosterEnvironment>,
    readonly target: BundleVersions = versions,
  ) {
    assertCompatibleVersions(target);
    if (!supportsEngine(catalogFor({ versions: target }).data.requiredEngine, target.engine))
      throw new Error('Card bundle requires a newer engine target');
  }
  game: FullGame | null = null;
  generation = 0;
  handle(raw: unknown): unknown {
    const r = request.parse(raw);
    if (r.op === 'hello')
      return {
        ...(this.environment?.contract ?? (this.league ? leagueGameContract : fullGameContract)),
        versions: this.target,
      };
    if (r.op === 'reset') {
      if (this.game && !this.game.done) throw new Error('Cannot reset an unfinished game');
      if ((this.league || !!this.environment) !== (r.decks !== undefined))
        throw new Error('Deck pair does not match session contract');
      this.game = new FullGame(
        r.seed,
        r.orientation,
        r.limit,
        r.autoForced,
        true,
        r.decks,
        this.environment,
        this.target,
      );
      this.generation++;
      return { generation: this.generation, observation: this.game.observation() };
    }
    if (!this.game || r.generation !== this.generation) throw new Error('Stale game generation');
    if (r.op === 'replay') return this.game.verifyReplay();
    if (r.op === 'truncate') return { observation: this.game.truncate() };
    if (r.op === 'reference') return this.game.reference(r.ticket);
    return { observation: this.game.step(r.ticket, r.action) };
  }
}
if (import.meta.main) {
  const index = process.argv.indexOf('--roster');
  const environment =
    index < 0 ? undefined : rosterEnvironment(readTrainingRoster(process.argv[index + 1]!));
  const catalogIndex = process.argv.indexOf('--catalog');
  if (catalogIndex >= 0) {
    const path = process.argv[catalogIndex + 1]!;
    if (statSync(path).size > 16_000_000) throw new Error('Catalog exceeds size limit');
    registerCatalog(validateCatalog(JSON.parse(readFileSync(path, 'utf8'))));
  }
  const targetIndex = process.argv.indexOf('--versions');
  const target =
    targetIndex < 0 ? versions : aiVersions.parse(JSON.parse(process.argv[targetIndex + 1]!));
  const session = new FullSession(process.argv.includes('--league'), environment, target);
  // Send the newline in the same write and await completion. Bun console.log
  // can strand a separate newline when the JSON fills a pipe buffer exactly.
  const respond = (value: unknown) =>
    new Promise<void>((resolve, reject) => {
      process.stdout.write(`${JSON.stringify(value)}\n`, error => {
        if (error) reject(error);
        else resolve();
      });
    });
  for await (const line of createInterface({ input: process.stdin, crlfDelay: Infinity })) {
    let id: unknown = null;
    try {
      if (Buffer.byteLength(line) > 65536) throw new Error('Request too large');
      const raw = JSON.parse(line);
      id = raw?.id ?? null;
      const data = session.handle(raw);
      await respond({ id, ok: true, data });
    } catch (error) {
      // Local training diagnostics stay on stderr; stdout is the IPC protocol.
      console.error(error);
      await respond({
        id,
        ok: false,
        error: error instanceof Error ? error.message : 'Simulation failed',
      });
    }
  }
}
