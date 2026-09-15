import { lofFinaleContinuations } from './lof-finale-continuations.ts';
import { lofAttributeContinuations } from './lof-attribute-continuations.ts';
import { lofEffectContinuations } from './lof-effect-continuations.ts';
import { advance } from '../engine/advance.ts';
import { choose, ids, position } from './helpers.ts';
import { scenario } from './scenario.ts';
import type { ContinuationCase } from './continuations.ts';
export function lofContinuations(): ContinuationCase[] {
  const p = position('lof-distinct-upgrade-hosts');
  p.players[0].ground = [
    { card: 'guardian-of-the-whills', ref: 'first' },
    { card: 'guardian-of-the-whills', ref: 'second' },
  ];
  p.players[0].resources = Array.from({ length: 6 }, () => ({ card: ids.marine }));
  p.players[0].hand = [
    { card: 'academy-training', ref: 'firstUpgrade' },
    { card: 'academy-training', ref: 'secondUpgrade' },
  ];
  const g = scenario(p);
  let state = advance(
    g.state,
    choose(
      g.state,
      i => i.kind === 'play' && i.card === g.refs.firstUpgrade && i.target === g.refs.first,
    ),
  ).state;
  state = advance(state, choose(state, 'pass')).state;
  return [
    ...lofFinaleContinuations(),
    ...lofEffectContinuations(),
    ...lofAttributeContinuations(),
    {
      name: 'lof-round-upgrade-host-history',
      description: 'A second Guardian retains its own first-upgrade discount after recovery',
      state,
      input: choose(
        state,
        i => i.kind === 'play' && i.card === g.refs.secondUpgrade && i.target === g.refs.second,
      ),
    },
  ];
}
