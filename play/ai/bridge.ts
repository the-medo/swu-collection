import { createInterface } from 'node:readline';
import { z } from 'zod';
import { versions } from '../engine/model.ts';
import { FEATURES, FEATURE_VERSION, GENERATOR_VERSION, puzzleFor } from './tactics.ts';
import type { TacticalPuzzle } from './tactics.ts';

export const PROTOCOL = 1;
const request = z.discriminatedUnion('op', [
  z.strictObject({ id: z.number().int().nonnegative(), op: z.literal('hello') }),
  z.strictObject({
    id: z.number().int().nonnegative(),
    op: z.literal('reset'),
    split: z.enum(['train', 'validation', 'test']),
    start: z.number().int().min(0).max(999_744),
    batch: z.number().int().min(1).max(256),
  }),
  z.strictObject({
    id: z.number().int().nonnegative(),
    op: z.literal('step'),
    generation: z.number().int().positive(),
    actions: z.array(z.number().int().nonnegative()).min(1).max(256),
  }),
]);

export class TacticalSession {
  #puzzles: TacticalPuzzle[] = [];
  #generation = 0;
  handle(raw: unknown) {
    const command = request.parse(raw);
    if (command.op === 'hello')
      return {
        protocol: PROTOCOL,
        featureVersion: FEATURE_VERSION,
        generatorVersion: GENERATOR_VERSION,
        features: FEATURES,
        versions,
        scope: 'vanilla-one-move-tactics',
      };
    if (command.op === 'reset') {
      const puzzles = Array.from({ length: command.batch }, (_, i) =>
        puzzleFor(command.split, command.start + i),
      );
      this.#puzzles = puzzles;
      this.#generation++;
      return { generation: this.#generation, observations: puzzles.map(p => p.observation()) };
    }
    if (
      command.generation !== this.#generation ||
      command.actions.length !== this.#puzzles.length ||
      !this.#puzzles.length
    )
      throw new Error('Stale or missing puzzle batch');
    if (command.actions.some((action, i) => !this.#puzzles[i]!.options[action]))
      throw new Error('Invalid action index');
    const puzzles = this.#puzzles;
    this.#puzzles = [];
    return {
      results: puzzles.map((puzzle, i) => {
        const { state: _state, inputs: _inputs, ...outcome } = puzzle.step(command.actions[i]!);
        return outcome;
      }),
    };
  }
}

if (import.meta.main) {
  const session = new TacticalSession();
  // Local subprocess protocol only; never expose this scenario constructor as
  // a live-game endpoint. stdout contains JSON responses and nothing else.
  const lines = createInterface({ input: process.stdin, crlfDelay: Infinity });
  for await (const line of lines) {
    let id: unknown = null;
    try {
      if (Buffer.byteLength(line) > 65_536) throw new Error('Request too large');
      const raw = JSON.parse(line);
      id = raw?.id ?? null;
      console.log(JSON.stringify({ id, ok: true, data: session.handle(raw) }));
    } catch (error) {
      console.log(
        JSON.stringify({
          id,
          ok: false,
          error: error instanceof Error ? error.message : 'Bridge failed',
        }),
      );
    }
  }
}
