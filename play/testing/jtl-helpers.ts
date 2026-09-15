import { advance, settle } from '../engine/advance.ts';
import { cardDefinition } from '../cards/registry.ts';
import { attachedUpgrades, unitStats } from '../engine/attachments.ts';
import { effectiveAbilities } from '../engine/effective-abilities.ts';
import { modifyUnit } from '../engine/lasting.ts';
import type { GameState, Intent } from '../engine/model.ts';
import { choose, ids, position } from './helpers.ts';
export { ids, position };
export function drain(state: GameState): GameState {
  let s = state;
  for (let n = 0; n < 100; n++) {
    if (s.execution.random) {
      s = advance(s, {
        type: 'random',
        gameId: s.gameId,
        expectedRevision: s.revision,
        requestId: s.execution.random.id,
        values: s.execution.random.bounds.map(() => 0),
      }).state;
      continue;
    }
    if (s.execution.decision?.kind === 'trigger-player') {
      s = advance(s, choose(s, 'trigger-player')).state;
      continue;
    }
    if (s.execution.decision?.kind === 'trigger') {
      s = advance(s, choose(s, 'trigger')).state;
      continue;
    }
    return s;
  }
  throw Error('Unsettled JTL fixture');
}
export const step = (
  s: GameState,
  p: Intent['kind'] | ((i: Intent) => boolean),
  selected: string[] = [],
) => drain(advance(s, choose(s, p, selected)).state);
export const target = (s: GameState, id: string) =>
  step(s, i => i.kind === 'target' && i.card === id);
export const select = (s: GameState, ...ids: string[]) => step(s, 'accept-effect', ids);
export const play = (s: GameState, id: string, host?: string) =>
  step(s, i => i.kind === 'play' && i.card === id && (host ? i.target === host : !i.target));
export const attack = (s: GameState, id: string, defender = s.players.bob!.base) =>
  step(s, i => i.kind === 'attack' && i.attacker === id && i.defender === defender);
export const mode = (s: GameState, value: string) =>
  step(s, i => i.kind === 'choose-mode' && i.mode === value);
export const refresh = (s: GameState) => {
  s.execution.decision = null;
  settle(s);
};
export const blank = (s: GameState, id: string) =>
  modifyUnit(s, s.cards[id]!, s.cards[id]!, {
    kind: 'modify',
    power: 0,
    hp: 0,
    duration: 'phase',
    loseAbilities: true,
  });
export const stats = (s: GameState, id: string) => unitStats(s, s.cards[id]!);
export const keyword = (s: GameState, id: string, k: string) =>
  effectiveAbilities(s, s.cards[id]!).keywords?.includes(k as never) ?? false;
export const tokens = (s: GameState, id: string, kind = 'experience') =>
  attachedUpgrades(s, s.cards[id]!).filter(c => c.cardId === kind).length;
export const options = (s: GameState) => s.execution.decision?.options.map(o => o.intent) ?? [];
export const nextOwn = (s: GameState) =>
  step(s, i => i.kind === 'use-ability' && i.card === s.players.bob!.leader);
export function board(card: string, inHand = true) {
  const p = position();
  p.players[0].resources = Array.from({ length: 25 }, () => ({ card: ids.marine }));
  const d = cardDefinition(card);
  if (inHand) p.players[0].hand = [{ card, ref: 'source' }];
  else if (d.kind === 'unit') p.players[0][d.arena] = [{ card, ref: 'source' }];
  else throw Error('Expected unit');
  return p;
}
