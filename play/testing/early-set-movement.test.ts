import { expect, test } from 'bun:test';
import {
  abilities,
  attack,
  board,
  choose,
  damage,
  defeat,
  effects,
  ids,
  play,
  resume,
  scenario,
  stats,
  step,
  target,
  targets,
  tokens,
} from './early-set-completion-helpers.ts';
import type { GameState } from '../engine/model.ts';
const mode = (s: GameState, id: string) => step(s, i => i.kind === 'choose-mode' && i.mode === id);
const defeatUpgrade = (s: GameState, id: string) =>
  effects(
    s,
    [
      {
        kind: 'select-upgrades',
        filter: { sameAs: 'source' },
        min: 'all',
        max: 'all',
        bind: 'upgrade',
        effects: [{ kind: 'move-upgrades', group: 'upgrade', to: 'discard' }],
      },
    ],
    id,
  );

test('Traitorous takes an eligible unit and returns it to its owner when the upgrade is defeated', () => {
  const p = board('traitorous');
  p.players[1].ground = [{ card: ids.marine, ref: 'host' }];
  const g = scenario(p);
  let s = step(
    g.state,
    i => i.kind === 'play' && i.card === g.refs.card && i.target === g.refs.host,
  );
  expect(s.cards[g.refs.host!]!.controller).toBe('alice');
  s = defeatUpgrade(s, g.refs.card!);
  expect(s.cards[g.refs.host!]!.controller).toBe('bob');
});
test('Roger Roger attaches from discard to a friendly Battle Droid without being played', () => {
  const p = board('roger-roger');
  p.players[0].ground = [
    { card: ids.marine, ref: 'host' },
    { card: 'battle-droid', ref: 'droid' },
  ];
  p.players[1].ground = [{ card: 'battle-droid', ref: 'enemy' }];
  p.attachments = [{ card: 'roger-roger', unit: 'host', ref: 'upgrade' }];
  const g = scenario(p),
    pending = defeatUpgrade(g.state, g.refs.upgrade!);
  expect(targets(pending)).toEqual([g.refs.droid!]);
  resume(
    pending,
    choose(pending, i => i.kind === 'target' && i.card === g.refs.droid),
  );
  const s = target(pending, g.refs.droid!);
  expect(s.cards[g.refs.upgrade!]!.attachedTo?.instanceId).toBe(g.refs.droid!);
  expect(s.facts.some(f => f.type === 'played')).toBe(false);
});
test('Survivors’ Gauntlet moves an upgrade only between eligible units controlled by the same player', () => {
  const p = board('survivors--gauntlet');
  p.players[1].ground = [
    { card: ids.consular, ref: 'host' },
    { card: ids.marine, ref: 'destination' },
  ];
  p.players[0].ground = [{ card: ids.marine, ref: 'friendly' }];
  p.attachments = [{ card: 'academy-training', unit: 'host', ref: 'upgrade' }];
  const g = scenario(p),
    pending = step(target(attack(g.state, g.refs.card!), g.refs.host!), 'accept-effect', [
      g.refs.upgrade!,
    ]);
  expect(targets(pending)).toEqual([g.refs.destination!]);
  const s = target(pending, g.refs.destination!);
  expect(s.cards[g.refs.upgrade!]!.attachedTo?.instanceId).toBe(g.refs.destination!);
});
test('Evidence of the Crime takes and reattaches only an upgrade costing at most three', () => {
  const p = board('evidence-of-the-crime', true);
  p.players[0].ground = [{ card: ids.marine, ref: 'friendly' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'host' }];
  p.attachments = [
    { card: 'academy-training', unit: 'host', ref: 'cheap' },
    { card: 'the-darksaber', unit: 'host', ref: 'expensive' },
  ];
  const g = scenario(p),
    pending = play(g.state, g.refs.card!);
  expect(pending.execution.decision!.selection!.cards).toEqual([g.refs.cheap!]);
  const s = target(step(pending, 'accept-effect', [g.refs.cheap!]), g.refs.friendly!);
  expect(s.cards[g.refs.cheap!]!).toMatchObject({
    owner: 'bob',
    controller: 'alice',
    attachedTo: { instanceId: g.refs.friendly },
  });
});
test('Spare the Target returns the unit and still collects its detached Bounty', () => {
  const p = board('spare-the-target', true);
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  p.attachments = [{ card: 'price-on-your-head', unit: 'enemy' }];
  const g = scenario(p),
    pending = target(play(g.state, g.refs.card!), g.refs.enemy!);
  expect(pending.cards[g.refs.enemy!]!.zone).toBe('hand');
  const s = step(pending, 'accept-effect');
  expect(s.players.alice!.resources).toHaveLength(21);
});
test('Impropriety exchanges ready units and returns each exact unit to its owner at regroup', () => {
  const p = board('impropriety-among-thieves', true);
  p.players[0].ground = [{ card: ids.marine, ref: 'own' }];
  p.players[1].ground = [
    { card: ids.consular, ref: 'enemy' },
    { card: ids.marine, ref: 'exhausted', exhausted: true },
  ];
  const g = scenario(p),
    pending = target(play(g.state, g.refs.card!), g.refs.own!);
  expect(targets(pending)).toEqual([g.refs.enemy!]);
  let s = target(pending, g.refs.enemy!);
  expect(s.cards[g.refs.own!]!.controller).toBe('bob');
  expect(s.cards[g.refs.enemy!]!.controller).toBe('alice');
  resume(s, choose(s, 'pass'));
  s = step(step(s, 'pass'), 'pass');
  while (s.execution.decision!.kind === 'delayed') s = step(s, 'delayed');
  expect(s.cards[g.refs.own!]!.controller).toBe('alice');
  expect(s.cards[g.refs.enemy!]!.controller).toBe('bob');
});
test('I Had No Choice lets the opponent choose the returned unit and bottoms the other without another owner choice', () => {
  const p = board('i-had-no-choice', true);
  p.players[0].ground = [{ card: ids.marine, ref: 'first' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'second' }];
  const g = scenario(p),
    pending = step(play(g.state, g.refs.card!), 'accept-effect', [g.refs.first!, g.refs.second!]);
  expect(pending.execution.decision!.playerId).toBe('bob');
  resume(
    pending,
    choose(pending, i => i.kind === 'target' && i.card === g.refs.second),
  );
  const s = target(pending, g.refs.second!);
  expect(s.cards[g.refs.second!]!.zone).toBe('hand');
  expect(s.players.alice!.deck.at(-1)).toBe(g.refs.first!);
  expect(s.execution.decision!.kind).toBe('action');
});
test('Bold Resistance requires one trait shared by all three units, not merely pairwise matches', () => {
  const p = board('bold-resistance', true);
  p.players[0].ground = [
    { card: 'clone-trooper', ref: 'clone' },
    { card: ids.marine, ref: 'marine' },
    { card: 'battle-droid', ref: 'droid' },
    { card: 'omega--part-of-the-squad', ref: 'omega' },
  ];
  const g = scenario(p);
  let s = target(target(play(g.state, g.refs.card!), g.refs.clone!), g.refs.marine!);
  expect(targets(s)).toContain(g.refs.droid!);
  expect(targets(s)).not.toContain(g.refs.omega!);
  s = target(s, g.refs.droid!);
  expect(stats(s, g.refs.clone!).power).toBe(4);
  expect(stats(s, g.refs.marine!).power).toBe(5);
  expect(stats(s, g.refs.droid!).power).toBe(3);
});
test('Equalize checks unit counts after the first reduction and retains a defeated unit’s last controller', () => {
  const p = board('equalize', true);
  p.players[1].ground = [
    { card: 'battle-droid', ref: 'first' },
    { card: ids.consular, ref: 'second' },
  ];
  const g = scenario(p),
    pending = target(play(g.state, g.refs.card!), g.refs.first!);
  expect(pending.cards[g.refs.first!]!.zone).toBe('set-aside');
  const s = target(pending, g.refs.second!);
  expect(stats(s, g.refs.second!)).toEqual({ power: 1, hp: 5 });
});
test('A Fine Addition plays an enemy discard upgrade under your control, paying only its printed cost', () => {
  const p = board('a-fine-addition', true);
  p.players[0].ground = [{ card: ids.marine, ref: 'host' }];
  p.players[1].ground = [{ card: ids.marine, ref: 'victim' }];
  p.players[1].discard = [{ card: 'jedi-lightsaber', ref: 'upgrade' }];
  const g = scenario(p);
  let s = mode(play(defeat(g.state, g.refs.victim!), g.refs.card!), 'from-enemy-discard');
  s = step(s, 'accept-effect', [g.refs.upgrade!]);
  resume(
    s,
    choose(s, i => i.kind === 'play' && i.card === g.refs.upgrade && i.target === g.refs.host),
  );
  s = step(s, i => i.kind === 'play' && i.card === g.refs.upgrade && i.target === g.refs.host);
  expect(s.cards[g.refs.upgrade!]!).toMatchObject({
    owner: 'bob',
    controller: 'alice',
    attachedTo: { instanceId: g.refs.host },
  });
  expect(s.facts.findLast(f => f.type === 'played')!.amount).toBe(3);
});
test('Jetpack removes only the Shield it created at regroup, preserving an older Shield', () => {
  const p = board('jetpack');
  p.players[0].ground = [{ card: ids.marine, ref: 'host' }];
  p.attachments = [{ card: 'shield', unit: 'host', ref: 'old' }];
  const g = scenario(p);
  let s = step(
    g.state,
    i => i.kind === 'play' && i.card === g.refs.card && i.target === g.refs.host,
  );
  expect(tokens(s, g.refs.host!, 'shield')).toBe(2);
  const created = s.delayedEffects.find(e => e.kind === 'regroup-operation')!;
  expect(created.target!.instanceId).not.toBe(g.refs.old!);
  resume(s, choose(s, 'pass'));
  s = step(step(s, 'pass'), 'pass');
  expect(tokens(s, g.refs.host!, 'shield')).toBe(1);
  expect(s.cards[g.refs.old!]!.zone).toBe('ground');
});
test('Tobias preserves his once-per-round use when his optional trigger is declined', () => {
  const p = board('tobias-beckett--i-trust-no-one');
  p.players[0].hand = [
    { card: 'academy-training', ref: 'first' },
    { card: 'academy-training', ref: 'second' },
  ];
  p.players[0].ground!.push({ card: ids.marine, ref: 'ally' });
  const g = scenario(p);
  let s = step(
    g.state,
    i => i.kind === 'play' && i.card === g.refs.first && i.target === g.refs.ally,
  );
  s = step(step(s, 'decline-effect'), 'pass');
  s = step(s, i => i.kind === 'play' && i.card === g.refs.second && i.target === g.refs.ally);
  s = step(s, 'accept-effect');
  s = target(s, g.refs.ally!);
  expect(s.cards[g.refs.ally!]!.exhausted).toBe(true);
});
