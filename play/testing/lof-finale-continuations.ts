import { advance } from '../engine/advance.ts';
import { choose, ids, position } from './helpers.ts';
import { scenario } from './scenario.ts';
import type { GameState, Intent } from '../engine/model.ts';
import type { ContinuationCase } from './continuations.ts';
export function lofFinaleContinuations(): ContinuationCase[] {
  const cases: ContinuationCase[] = [];
  const step = (s: GameState, p: Intent['kind'] | ((i: Intent) => boolean), cards: string[] = []) =>
    advance(s, choose(s, p, cards)).state;
  const board = (card: string) => {
    const p = position(`lof-final-${card}`);
    p.players[0].hand = [{ card, ref: 'source' }];
    p.players[0].resources = Array.from({ length: 20 }, () => ({ card: ids.marine }));
    return p;
  };
  const add = (
    name: string,
    description: string,
    state: GameState,
    p: Intent['kind'] | ((i: Intent) => boolean),
    cards: string[] = [],
  ) => cases.push({ name, description, state, input: choose(state, p, cards) });
  const random = (name: string, description: string, state: GameState) => {
    const r = state.execution.random!;
    const input = {
      type: 'random' as const,
      gameId: state.gameId,
      expectedRevision: state.revision,
      requestId: r.id,
      values: r.bounds.map(() => 0),
    };
    cases.push({ name, description, state, input });
    return advance(state, input).state;
  };
  {
    const p = board('as-i-have-foreseen');
    p.players[0].force = true;
    p.players[0].deck = [{ card: ids.marine, ref: 'top' }];
    const g = scenario(p);
    let s = step(g.state, 'play');
    add(
      'lof-foreseen-private-look',
      'Inspect exactly one top card before choosing whether to use Force',
      s,
      'accept-effect',
      [g.refs.top!],
    );
    s = step(s, 'accept-effect', [g.refs.top!]);
    add(
      'lof-foreseen-force-payment',
      'Preserve the inspected exact card through optional Force payment',
      s,
      'accept-effect',
    );
  }
  {
    const p = board('following-the-path');
    p.players[0].deck = [
      { card: 'jedi-guardian', ref: 'a' },
      { card: 'jedi-sentinel', ref: 'b' },
      ...Array.from({ length: 7 }, () => ({ card: ids.marine })),
    ];
    const g = scenario(p);
    let s = step(step(g.state, 'play'), 'search', [g.refs.a!, g.refs.b!]);
    s = random(
      'lof-search-top-remainder',
      'Randomize unselected cards while preserving the selected top candidates',
      s,
    );
    add(
      'lof-search-top-order',
      'Order only the revealed search results before the uninspected deck',
      s,
      i => i.kind === 'target' && i.card === g.refs.b,
    );
  }
  {
    const p = board('luminous-beings');
    p.players[0].discard = [
      { card: 'jedi-guardian', ref: 'a' },
      { card: 'jedi-sentinel', ref: 'b' },
    ];
    p.players[0].ground = [{ card: ids.marine, ref: 'unit-a' }];
    p.players[1].ground = [{ card: ids.marine, ref: 'unit-b' }];
    const g = scenario(p);
    let s = step(step(g.state, 'play'), 'accept-effect', [g.refs.a!, g.refs.b!]);
    s = random(
      'lof-random-discard-bottom',
      'Move chosen discard cards into the concealed randomized bottom group',
      s,
    );
    add(
      'lof-returned-count-targets',
      'Keep the actual returned count for distinct unit bonuses',
      s,
      'accept-effect',
      [g.refs['unit-a']!, g.refs['unit-b']!],
    );
  }
  {
    const p = board('premonition-of-doom');
    p.players[0].ground = [{ card: ids.marine }];
    p.players[1].ground = [{ card: ids.marine }];
    const g = scenario(p);
    const s = step(
      step(g.state, 'play'),
      i => i.kind === 'use-ability' && i.card === g.state.players.bob!.leader,
    );
    add(
      'lof-next-initiative',
      'A scheduled event survives its source being in discard until initiative is claimed',
      s,
      'take-initiative',
    );
  }
  {
    const p = board('ravening-gundark');
    p.players[0].space = [
      { card: 'qui-gon-jinn-s-aethersprite--guided-by-the-force', ref: 'ship' },
    ];
    p.players[1].hand = [{ card: 'it-s-worse', ref: 'removal' }];
    p.players[1].resources = Array.from({ length: 15 }, () => ({ card: ids.marine }));
    p.players[1].ground = [{ card: 'jedi-guardian', ref: 'target' }];
    const g = scenario(p);
    let s = step(
      g.state,
      i =>
        i.kind === 'attack' &&
        i.attacker === g.refs.ship &&
        i.defender === g.state.players.bob!.base,
    );
    s = step(
      step(s, i => i.kind === 'play' && i.card === g.refs.removal),
      i => i.kind === 'target' && i.card === g.refs.ship,
    );
    s = step(
      step(s, i => i.kind === 'play' && i.card === g.refs.source),
      i => i.kind === 'target' && i.card === g.refs.target,
    );
    add(
      'lof-repeat-played-after-departure',
      'Repeat a used When Played ability after the scheduling ship was defeated',
      s,
      'accept-effect',
    );
  }
  {
    const p = board('do-or-do-not');
    p.players[0].deck = [{ card: 'rey--with-palpatine-s-power', ref: 'rey' }];
    p.players[1].ground = [{ card: 'jedi-guardian', ref: 'target' }];
    const g = scenario(p);
    let s = step(g.state, 'play');
    add(
      'lof-private-drawn-reveal',
      'Rey retains her exact drawn hand reference and private reveal choice',
      s,
      i => i.kind === 'choose-mode' && i.mode === 'reveal-rey',
    );
    s = step(s, i => i.kind === 'choose-mode' && i.mode === 'reveal-rey');
    add(
      'lof-revealed-rey-target',
      'After revealing, select a unit before choosing a base for the same damage event',
      s,
      i => i.kind === 'target' && i.card === g.refs.target,
    );
    s = step(s, i => i.kind === 'target' && i.card === g.refs.target);
    add(
      'lof-rey-simultaneous-damage',
      'Commit damage to the chosen unit and base together',
      s,
      i => i.kind === 'target' && i.card === s.players.alice!.base,
    );
  }
  return cases;
}
