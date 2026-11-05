import type { ContinuationCase } from './continuations.ts';
import { advance, settle } from '../engine/advance.ts';
import { effectFrames } from '../engine/triggers.ts';
import { choose, ids, ordered, play, position, resources, scenario, step } from './ic27-helpers.ts';

export function ic27ReprintContinuations(): ContinuationCase[] {
  const cases: ContinuationCase[] = [];
  {
    const p = position('ic27-c3po-printed-cost');
    p.players[0].resources = resources();
    p.players[0].hand = [{ card: 'c-3po--protocol-droid', ref: 'droid' }];
    p.players[0].deck = [{ card: ids.marine, ref: 'top' }];
    const g = scenario(p),
      numbered = play(g.state, g.refs.droid!);
    const state = ordered(
      advance(numbered, { ...choose(numbered, 'accept-effect'), chosenNumber: 2 }).state,
    );
    cases.push({
      name: p.gameId,
      description:
        'A private top-card match retains its public chosen number and optional reveal/draw',
      state,
      input: choose(state, 'accept-effect', [g.refs.top!]),
    });
  }
  {
    const p = position('ic27-k2so-simultaneous-damage');
    p.players[0].ground = [{ card: 'k-2so--evacuate-the-vault-door', ref: 'droid' }];
    p.players[1].ground = [{ card: ids.consular, ref: 'target' }];
    p.players[1].space = [{ card: ids.fighter }];
    p.attachments = [
      { card: 'shield', unit: 'target', ref: 'first' },
      { card: 'shield', unit: 'target' },
    ];
    const g = scenario(p);
    g.state.execution.decision = null;
    g.state.execution.frames = [
      ...effectFrames('alice', g.state.cards[g.state.players.alice!.leader]!, [
        { kind: 'defeat-units', filter: { name: 'K-2SO' } },
      ]),
      { kind: 'flush-triggers' },
      { kind: 'action' },
    ];
    settle(g.state);
    const state = ordered(g.state);
    cases.push({
      name: p.gameId,
      description: 'A Shield choice suspends one shared unit/base damage batch',
      state,
      input: choose(state, i => i.kind === 'target' && i.card === g.refs.first),
    });
  }
  {
    const p = position('ic27-only-hope-unaffordable');
    p.players[0].resources = resources(3);
    p.players[0].hand = [{ card: 'you-re-my-only-hope', ref: 'event' }];
    p.players[0].deck = [{ card: ids.consular, ref: 'top' }];
    const g = scenario(p),
      state = step(play(g.state, g.refs.event!), 'accept-effect', [g.refs.top!]);
    cases.push({
      name: p.gameId,
      description: 'An unaffordable hidden top card retains the private decline choice',
      state,
      input: choose(state, 'decline-effect'),
    });
  }
  return cases;
}
