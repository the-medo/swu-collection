import { advance } from '../engine/advance.ts';
import { choose, ids, position } from './helpers.ts';
import { scenario } from './scenario.ts';
import type { ContinuationCase } from './continuations.ts';
export function lofAttributeContinuations(): ContinuationCase[] {
  const cases: ContinuationCase[] = [];
  for (const card of ['mind-trick', 'curious-flock', 'psychometry']) {
    const p = position(`lof-${card}-recovery`);
    p.players[0].hand = [{ card, ref: 'source' }];
    p.players[0].resources = Array.from({ length: 20 }, () => ({ card: ids.marine }));
    p.players[0].ground = [{ card: 'jedi-guardian', ref: 'force' }];
    p.players[1].space = [
      { card: ids.fighter, ref: 'a' },
      { card: ids.fighter, ref: 'b' },
    ];
    p.players[0].discard = [{ card: 'force-slow', ref: 'discard' }];
    p.players[0].deck = [{ card: 'force-slow', ref: 'top' }, { card: ids.marine }];
    const g = scenario(p);
    let state = advance(g.state, choose(g.state, 'play')).state;
    if (card === 'mind-trick')
      cases.push({
        name: 'lof-combined-power-selection',
        description:
          'Combined live power budget survives before grouped exhaustion and ability loss',
        state,
        input: choose(state, 'accept-effect', [g.refs.a!, g.refs.b!]),
      });
    if (card === 'curious-flock') {
      state = advance(
        state,
        choose(state, i => i.kind === 'choose-mode' && i.mode === 'pay-3'),
      ).state;
      cases.push({
        name: 'lof-variable-experience-payment',
        description: 'Chosen resource amount stays bound through payment and token creation',
        state,
        input: choose(state, 'accept-effect'),
      });
    }
    if (card === 'psychometry') {
      state = advance(state, choose(state, 'accept-effect', [g.refs.discard!])).state;
      cases.push({
        name: 'lof-bound-trait-search',
        description: 'Private search keeps the exact public discard reference as its trait filter',
        state,
        input: choose(state, 'search', [g.refs.top!]),
      });
    }
  }
  return cases;
}
