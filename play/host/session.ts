import { assertCompatibleVersions } from '../cards/catalog.ts';
import { randomInt } from 'node:crypto';
import { z } from 'zod';
import { advance, createGame } from '../engine/advance.ts';
import { inputSchema, versions } from '../engine/model.ts';
import type { EngineInput, GameState } from '../engine/model.ts';
import { gameConfigSchema } from '../engine/state.ts';
import type { GameConfig } from '../engine/state.ts';

export type RandomSource = (upperExclusive: number) => number;
const recordingSchema = z.strictObject({
  recordingVersion: z.literal(1),
  engine: z.string().min(1).max(100),
  cards: z.string().min(1).max(100),
  config: gameConfigSchema,
  inputs: z.array(inputSchema).max(100_000),
});
export type Recording = z.infer<typeof recordingSchema>;

function resolveRandom(
  state: GameState,
  random: RandomSource,
): { state: GameState; inputs: EngineInput[] } {
  const inputs: EngineInput[] = [];
  while (state.execution.random) {
    const request = state.execution.random;
    const input: EngineInput = {
      type: 'random',
      gameId: state.gameId,
      expectedRevision: state.revision,
      requestId: request.id,
      values: request.bounds.map(upper => random(upper)),
    };
    state = advance(state, input).state;
    inputs.push(input);
  }
  return { state, inputs };
}

// In-process harness for milestone 0. This is neither a network endpoint nor a
// durable game actor. Future persistence must commit before publishing/acking.
export class LocalGame {
  #state: GameState;
  #recording: Recording;
  #random: RandomSource;

  constructor(config: GameConfig, random: RandomSource = randomInt) {
    const validated = gameConfigSchema.parse(config);
    const resolved = resolveRandom(createGame(validated), random);
    this.#state = resolved.state;
    this.#random = random;
    this.#recording = {
      recordingVersion: 1,
      engine: resolved.state.versions.engine,
      cards: resolved.state.versions.cards,
      config: validated,
      inputs: resolved.inputs,
    };
  }
  get state(): GameState {
    return structuredClone(this.#state);
  }
  get recording(): Recording {
    return structuredClone(this.#recording);
  }

  submit(raw: unknown): GameState {
    const input = inputSchema.parse(raw);
    // Randomness is provided exclusively by this host, never by a player.
    if (input.type === 'random') throw new Error('Random inputs are host-only');
    const candidate = advance(this.#state, input).state;
    const resolved = resolveRandom(candidate, this.#random);
    this.#state = resolved.state;
    this.#recording.inputs.push(input, ...resolved.inputs);
    return this.state;
  }
}

// Recordings contain private identities and random outcomes. Do not return them
// to a browser. A later replay service must project the reconstructed timeline.
export function replay(raw: unknown): GameState {
  const recording = recordingSchema.parse(raw);
  const pinned = recording.config.versions ?? {
    ...versions,
    engine: recording.engine,
    cards: recording.cards,
  };
  assertCompatibleVersions(pinned);
  if (pinned.engine !== recording.engine || pinned.cards !== recording.cards)
    throw new Error('Recording version mismatch');
  let state = createGame({ ...recording.config, versions: pinned });
  for (const input of recording.inputs) state = advance(state, input).state;
  return state;
}
