import { expect, test } from 'bun:test';
import {
  attack,
  board,
  choose,
  damage,
  effects,
  ids,
  play,
  resume,
  scenario,
  step,
  target,
  tokens,
} from './early-set-completion-helpers.ts';

test('Doctor Pershing can pay with damage to himself, including lethal damage before drawing', () => {
  const p = board('doctor-pershing--experimenting-with-life');
  p.players[0].ground![0]!.damage = 4;
  const g = scenario(p),
    payment = step(g.state, i => i.kind === 'use-ability' && i.card === g.refs.card);
  resume(payment, choose(payment, 'accept-effect', [g.refs.card!]));
  const s = step(payment, 'accept-effect', [g.refs.card!]);
  expect(s.cards[g.refs.card!]!.zone).toBe('discard');
  expect(s.players.alice!.hand).toHaveLength(1);
  expect(s.facts.findIndex(f => f.type === 'damage')).toBeLessThan(
    s.facts.findIndex(f => f.type === 'drawn'),
  );
});
test('Heroic Resolve pays two and defeats a matching attached copy before granting the attack bonus', () => {
  const p = board('heroic-resolve');
  p.players[0].ground = [{ card: ids.marine, ref: 'host' }];
  p.attachments = [{ card: 'heroic-resolve', unit: 'host', owner: 'bob', ref: 'upgrade' }];
  const g = scenario(p),
    payment = step(g.state, i => i.kind === 'use-ability' && i.card === g.refs.host);
  expect(payment.execution.decision!.selection!.cards).toEqual([g.refs.upgrade!]);
  const pending = step(payment, 'accept-effect', [g.refs.upgrade!]);
  expect(pending.cards[g.refs.upgrade!]!.zone).toBe('discard');
  expect(pending.players.alice!.resources.filter(id => pending.cards[id]!.exhausted)).toHaveLength(
    2,
  );
  resume(
    pending,
    choose(pending, i => i.kind === 'attack'),
  );
  const s = attack(pending, g.refs.host!);
  expect(damage(s)).toBe(7);
});
test('Pre Vizsla pays the printed upgrade cost and moves it to himself under his control', () => {
  const p = board('pre-vizsla--power-hungry');
  p.players[1].ground = [{ card: ids.consular, ref: 'host' }];
  p.attachments = [{ card: 'academy-training', unit: 'host', ref: 'upgrade' }];
  const g = scenario(p);
  let s = target(attack(g.state, g.refs.card!), g.refs.host!);
  s = step(s, 'accept-effect', [g.refs.upgrade!]);
  resume(s, choose(s, 'accept-effect'));
  s = step(s, 'accept-effect');
  s = target(s, g.refs.card!);
  expect(s.cards[g.refs.upgrade!]!).toMatchObject({
    controller: 'alice',
    owner: 'bob',
    attachedTo: { instanceId: g.refs.card },
  });
  expect(s.players.alice!.resources.filter(id => s.cards[id]!.exhausted)).toHaveLength(2);
});
test('Pre Vizsla may pay zero for a Shield, and may decline payment without moving it', () => {
  const p = board('pre-vizsla--power-hungry');
  p.players[1].ground = [{ card: ids.consular, ref: 'host' }];
  p.attachments = [{ card: 'shield', unit: 'host', ref: 'upgrade' }];
  const g = scenario(p);
  const pending = step(target(attack(g.state, g.refs.card!), g.refs.host!), 'accept-effect', [
    g.refs.upgrade!,
  ]);
  expect(step(pending, 'decline-effect').cards[g.refs.upgrade!]!.attachedTo?.instanceId).toBe(
    g.refs.host!,
  );
  const s = target(step(pending, 'accept-effect'), g.refs.card!);
  expect(tokens(s, g.refs.card!, 'shield')).toBe(1);
  expect(s.players.alice!.resources.filter(id => s.cards[id]!.exhausted)).toHaveLength(0);
});
