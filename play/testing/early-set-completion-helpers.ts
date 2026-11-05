import { expect } from 'bun:test';
import type { CardEffect, UnitDefinition } from '../cards/definition.ts';
import { cardDefinition } from '../cards/registry.ts';
import { advance, settle } from '../engine/advance.ts';
import { attachedUpgrades, unitStats } from '../engine/attachments.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { effectiveAbilities } from '../engine/effective-abilities.ts';
import { modifyUnit } from '../engine/lasting.ts';
import type { EngineInput, GameState } from '../engine/model.ts';
import { effectFrames } from '../engine/triggers.ts';
import { ordered, position, resources } from './ic27-helpers.ts';
export {
  attack,
  choose,
  ids,
  ordered,
  play,
  position,
  resources,
  scenario,
  step,
  target,
  use,
} from './ic27-helpers.ts';
export function board(id: string, inHand = false) {
  const p = position(),
    d = cardDefinition(id);
  p.players[0].resources = resources();
  p.players[0][inHand || d.kind !== 'unit' ? 'hand' : d.arena] = [{ card: id, ref: 'card' }];
  return p;
}
export function unit(id: string): UnitDefinition {
  const d = cardDefinition(id);
  if (d.kind !== 'unit') throw new Error('Expected unit');
  return d;
}
export const stats = (s: GameState, id: string) => unitStats(s, s.cards[id]!);
export const abilities = (s: GameState, id: string) => effectiveAbilities(s, s.cards[id]!);
export const damage = (s: GameState, who = 'bob') => s.cards[s.players[who]!.base]!.damage;
export const tokens = (s: GameState, id: string, token = 'experience') =>
  attachedUpgrades(s, s.cards[id]!).filter(c => c.cardId === token).length;
export const targets = (s: GameState) =>
  s.execution.decision!.options.flatMap(o => (o.intent.kind === 'target' ? [o.intent.card] : []));
export const attacks = (s: GameState) =>
  s.execution.decision!.options.flatMap(o =>
    o.intent.kind === 'attack' ? [o.intent.defender] : [],
  );
export function effects(
  state: GameState,
  list: readonly CardEffect[],
  source = state.players.alice!.leader,
) {
  const s = structuredClone(state);
  s.execution.decision = null;
  s.execution.frames = [
    ...effectFrames(s.cards[source]!.controller, s.cards[source]!, list),
    { kind: 'flush-triggers' },
    { kind: 'action' },
  ];
  settle(s);
  return ordered(s);
}
export const defeat = (s: GameState, id: string) =>
  effects(s, [{ kind: 'on-unit', target: 'source', operation: { kind: 'defeat' } }], id);
export function blank(s: GameState, id: string) {
  modifyUnit(s, s.cards[id]!, s.cards[id]!, {
    kind: 'modify',
    power: 0,
    hp: 0,
    duration: 'phase',
    loseAbilities: true,
  });
}
export function resume(s: GameState, input: EngineInput) {
  expect(decodeState(encodeState(s))).toEqual(s);
  const child = Bun.spawnSync(
    [process.execPath, new URL('./fixtures/resume.ts', import.meta.url).pathname],
    {
      stdin: new TextEncoder().encode(JSON.stringify({ state: encodeState(s), input })),
      stdout: 'pipe',
      stderr: 'pipe',
    },
  );
  expect(child.exitCode, child.stderr.toString()).toBe(0);
  expect(JSON.parse(child.stdout.toString())).toEqual(advance(s, input));
}
