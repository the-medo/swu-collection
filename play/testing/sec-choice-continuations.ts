import { advance, settle } from '../engine/advance.ts';
import { reference, move, addCard } from '../engine/state.ts';
import { cardDefinition } from '../cards/registry.ts';
import { choose, ids, position } from './helpers.ts';
import { scenario } from './scenario.ts';
import type { GameState, Intent } from '../engine/model.ts';
import type { ContinuationCase } from './continuations.ts';
export function secChoiceContinuations(): ContinuationCase[] {
  const cases: ContinuationCase[] = [];
  const board = (card: string, inPlay = false) => {
    const p = position(`sec-choice-${card}`);
    p.players[0].resources = Array.from({ length: 20 }, () => ({ card: ids.marine }));
    const d = cardDefinition(card);
    if (inPlay && d.kind === 'unit') p.players[0][d.arena] = [{ card, ref: 'source' }];
    else p.players[0].hand = [{ card, ref: 'source' }];
    return p;
  };
  const step = (
    s: GameState,
    p: Intent['kind'] | ((i: Intent) => boolean),
    selected: string[] = [],
  ) => advance(s, choose(s, p, selected)).state;
  const target = (s: GameState, id: string) => step(s, i => i.kind === 'target' && i.card === id);
  const play = (s: GameState, id: string) => step(s, i => i.kind === 'play' && i.card === id);
  const attack = (s: GameState, a: string, d: string) =>
    step(s, i => i.kind === 'attack' && i.attacker === a && i.defender === d);
  const save = (
    name: string,
    description: string,
    state: GameState,
    input: ContinuationCase['input'],
  ) => cases.push({ name, description, state, input });
  {
    const p = board('elia-kane--false-convert');
    p.players[1].resources = [0, 1, 2, 3].map(i => ({ card: ids.marine, ref: `r${i}` }));
    const g = scenario(p);
    const s = step(play(g.state, g.refs.source!), 'accept-effect', [
      g.refs.r0!,
      g.refs.r1!,
      g.refs.r2!,
    ]);
    save(
      'sec-resource-subset-inspection',
      'Only the three chosen resource identities are inspected before an optional defeat',
      s,
      choose(s, 'accept-effect', [g.refs.r1!]),
    );
  }
  {
    const p = board('hired-slicer', true);
    p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
    const g = scenario(p);
    let s = step(
      attack(g.state, g.refs.source!, g.state.players.bob!.base),
      i => i.kind === 'choose-mode' && i.mode === 'enemy',
    );
    s = step(s, 'decline-effect');
    if (!s.execution.random) throw Error('Missing randomized bottom');
    save(
      'sec-randomized-reveal-bottom',
      'Public revealed cards return in a server-chosen bottom order after declining exhaustion',
      s,
      {
        type: 'random',
        gameId: s.gameId,
        expectedRevision: s.revision,
        requestId: s.execution.random.id,
        values: s.execution.random.bounds.map(() => 0),
      },
    );
  }
  {
    const p = board('let-s-talk');
    p.players[0].ground = [
      { card: ids.marine, ref: 'a' },
      { card: ids.marine, ref: 'b' },
    ];
    p.players[1].ground = [
      { card: ids.marine, ref: 'x' },
      { card: ids.marine, ref: 'y' },
    ];
    const g = scenario(p);
    const s = target(
      target(target(play(g.state, g.refs.source!), g.refs.a!), g.refs.x!),
      g.refs.b!,
    );
    save(
      'sec-simultaneous-capture-pairs',
      'The first assigned prisoner remains in play until the final pair has been selected',
      s,
      choose(s, i => i.kind === 'target' && i.card === g.refs.y),
    );
  }
  {
    const p = board('mon-mothma--clinging-to-hope');
    p.players[0].ground = [
      { card: ids.marine, ref: 'a', exhausted: true },
      { card: ids.marine, ref: 'b', exhausted: true },
    ];
    p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
    const g = scenario(p);
    const s = attack(target(play(g.state, g.refs.source!), g.refs.a!), g.refs.a!, g.refs.enemy!);
    save(
      'sec-sequential-unit-attacks',
      'The previous exact attacker is excluded after its completed attack',
      s,
      choose(s, i => i.kind === 'target' && i.card === g.refs.b),
    );
  }
  {
    const p = board('obi-wan-kenobi--finding-what-doesn-t-exist', true);
    p.players[1].deck = [{ card: ids.consular, ref: 'stolen' }, { card: ids.marine }];
    const g = scenario(p);
    const s = step(attack(g.state, g.refs.source!, g.state.players.bob!.base), 'pass');
    save(
      'sec-paid-foreign-discard-play',
      'A later action pays the exact milled card’s printed cost and retains its owner',
      s,
      choose(s, i => i.kind === 'play' && i.card === g.refs.stolen),
    );
  }
  {
    const p = board('vuutun-palaa--droid-control-ship', true);
    p.players[0].ground = [{ card: 'battle-droid', ref: 'droid' }];
    p.players[0].hand = [{ card: ids.marine, ref: 'unit' }];
    const g = scenario(p);
    const s = play(g.state, g.refs.unit!);
    save(
      'sec-droid-resource-payment',
      'An optional unit payment exhausts the Droid and pays the balance with real resources',
      s,
      choose(s, 'accept-effect', [g.refs.droid!]),
    );
  }
  {
    const p = board('cikatro-vizago--business-is-what-matters', true);
    p.players[1].credits = ['credit'];
    const g = scenario(p);
    const s = step(attack(g.state, g.refs.source!, g.state.players.bob!.base), 'accept-effect');
    save(
      'sec-opponent-paid-reveal',
      'The payer spends their own Credit while the revealed card belongs to the ability controller',
      s,
      choose(s, 'accept-effect', [g.refs.credit!]),
    );
  }
  {
    const p = board('vigil--securing-the-future', true);
    p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
    p.attachments = [
      { card: 'shield', unit: 'source', ref: 'shield' },
      { card: 'deadly-vulnerability', unit: 'source', owner: 'bob', ref: 'double' },
    ];
    const g = scenario(p);
    let s = g.state;
    s.execution.decision = null;
    s.execution.frames.unshift({
      kind: 'damage',
      actor: 'bob',
      assignments: [
        {
          target: reference(s.cards[g.refs.source!]!),
          amount: 1,
          source: structuredClone(s.cards[g.refs.enemy!]!),
          preventedBy: null,
        },
      ],
    });
    settle(s);
    s = target(s, g.refs.source!);
    save(
      'sec-ordered-damage-increase',
      'Vigil’s once-per-packet increase remains consumed while ordering the Shield and multiplier',
      s,
      choose(s, i => i.kind === 'target' && i.card === g.refs.shield),
    );
  }
  {
    const p = board('aat-incinerator');
    p.players[0].ground = [{ card: ids.consular, ref: 'ally' }];
    p.players[0].space = [{ card: 'vigil--securing-the-future', ref: 'vigil' }];
    p.attachments = [{ card: 'shield', unit: 'ally', ref: 'shield' }];
    const g = scenario(p);
    const s = step(play(g.state, g.refs.source!), 'accept-effect', [g.refs.ally!]);
    save(
      'sec-after-damage-condition',
      'AAT checks the actual damage result after replacement choices',
      s,
      choose(s, i => i.kind === 'target' && i.card === g.refs.vigil),
    );
  }
  {
    const p = board('sly-moore--witness-to-power');
    const g = scenario(p);
    let s = play(g.state, g.refs.source!);
    move(s, s.cards[g.refs.source!]!, 'hand');
    const enemy = addCard(s, 'bob', ids.marine, 'ground');
    enemy.exhausted = false;
    s.execution.decision = null;
    settle(s);
    save(
      'sec-phase-wide-attack-modifier',
      'A departed source still modifies a later enemy attacker during the recorded phase',
      s,
      choose(
        s,
        i =>
          i.kind === 'attack' &&
          i.attacker === enemy.instanceId &&
          i.defender === s.players.alice!.base,
      ),
    );
  }
  return cases;
}
