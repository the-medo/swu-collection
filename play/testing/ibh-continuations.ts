import type { ContinuationCase } from './continuations.ts';
import { scenario } from './scenario.ts';
import { choose } from './helpers.ts';
import { board, play, attack, step, target, ids } from './jtl-helpers.ts';
export function ibhContinuations(): ContinuationCase[] {
  const cases: ContinuationCase[] = [];
  {
    const p = board('i-ve-found-them');
    p.gameId = 'ibh-reveal-draw';
    p.players[0].deck = [
      { card: 'echo-coordinator', ref: 'first' },
      { card: 'trench-defender', ref: 'second' },
      { card: 'recovery' },
    ];
    const g = scenario(p),
      state = play(g.state, g.refs.source!);
    cases.push({
      name: p.gameId,
      description: 'A public revealed group survives the private choice of which unit to draw',
      state,
      input: choose(state, 'accept-effect', [g.refs.second!]),
    });
  }
  {
    const p = board('admiral-ozzel--as-clumsy-as-he-is-stupid', false);
    p.gameId = 'ibh-opponent-discard';
    p.activePlayer = 'bob';
    p.players[1].ground = [{ card: ids.marine, ref: 'attacker' }];
    p.players[1].hand = [{ card: 'open-fire', ref: 'discard' }, { card: 'recovery' }];
    const g = scenario(p),
      state = attack(g.state, g.refs.attacker!, g.refs.source!);
    cases.push({
      name: p.gameId,
      description: 'The opponent owns the private hand choice after the source is defeated',
      state,
      input: choose(state, 'accept-effect', [g.refs.discard!]),
    });
  }
  {
    const p = board('you-have-failed-me');
    p.gameId = 'ibh-after-sacrifice';
    p.players[0].ground = [
      { card: ids.marine, ref: 'sacrifice' },
      { card: ids.consular, exhausted: true, ref: 'ready' },
    ];
    const g = scenario(p),
      state = target(play(g.state, g.refs.source!), g.refs.sacrifice!);
    cases.push({
      name: p.gameId,
      description: 'The successful defeat continues to a surviving friendly ready target',
      state,
      input: choose(state, i => i.kind === 'target' && i.card === g.refs.ready),
    });
  }
  {
    const p = board('hoth-lieutenant');
    p.gameId = 'ibh-optional-attack';
    p.players[0].ground = [{ card: ids.marine, ref: 'attacker' }];
    const g = scenario(p),
      optional = play(g.state, g.refs.source!);
    cases.push({
      name: p.gameId,
      description: 'The optional played ability can resume and begin a separate attack',
      state: optional,
      input: choose(optional, 'accept-effect'),
    });
    const state = step(optional, 'accept-effect');
    cases.push({
      name: 'ibh-granted-attack',
      description: 'A granted attack preserves its two-power bonus and exact attacker',
      state,
      input: choose(
        state,
        i =>
          i.kind === 'attack' &&
          i.attacker === g.refs.attacker &&
          i.defender === state.players.bob!.base,
      ),
    });
  }
  {
    const p = board('ion-cannon', false);
    p.gameId = 'ibh-shield-choice';
    p.players[1].space = [{ card: 'bright-hope--narrow-escape', ref: 'enemy' }];
    p.attachments = [
      { card: 'shield', unit: 'enemy', ref: 'first' },
      { card: 'shield', unit: 'enemy', ref: 'second' },
    ];
    const g = scenario(p),
      state = target(
        step(g.state, i => i.kind === 'use-ability' && i.card === g.refs.source),
        g.refs.enemy!,
      );
    cases.push({
      name: p.gameId,
      description: 'Damage resumes at the defending owner’s choice of physical Shield token',
      state,
      input: choose(state, i => i.kind === 'target' && i.card === g.refs.second),
    });
  }
  {
    const p = board('i-ll-cover-for-you');
    p.gameId = 'ibh-two-targets';
    p.players[1].ground = [
      { card: ids.marine, ref: 'first' },
      { card: ids.marine, ref: 'second' },
    ];
    const g = scenario(p),
      state = play(g.state, g.refs.source!);
    cases.push({
      name: p.gameId,
      description: 'Exactly two distinct physical targets receive simultaneous damage',
      state,
      input: choose(state, 'accept-effect', [g.refs.first!, g.refs.second!]),
    });
  }
  return cases;
}
