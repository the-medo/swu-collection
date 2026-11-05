import { expect, test } from 'bun:test';
import {
  attack,
  board,
  choose,
  damage,
  defeat,
  effects,
  ids,
  resume,
  scenario,
  step,
  target,
  tokens,
} from './early-set-completion-helpers.ts';
function position() {
  const p = board('maul--shadow-collective-visionary');
  p.players[0].ground!.push({ card: 'gamorrean-guards', ref: 'ally' });
  p.players[1].ground = [{ card: ids.consular, ref: 'defender' }];
  return p;
}
test('Maul redirects all combat damage for his attack to the chosen friendly Underworld unit', () => {
  const g = scenario(position());
  const pending = attack(g.state, g.refs.card!, g.refs.defender!);
  resume(
    pending,
    choose(pending, i => i.kind === 'target' && i.card === g.refs.ally),
  );
  const s = target(pending, g.refs.ally!);
  expect(s.cards[g.refs.card!]!.damage).toBe(0);
  expect(s.cards[g.refs.ally!]!.damage).toBe(3);
  expect(s.cards[g.refs.defender!]!.zone).toBe('discard');
});
test('Maul’s controller may use his Shield before redirection, or redirect and preserve it', () => {
  const p = position();
  p.attachments = [{ card: 'shield', unit: 'card', ref: 'shield' }];
  const g = scenario(p);
  const pending = target(attack(g.state, g.refs.card!, g.refs.defender!), g.refs.ally!);
  expect(pending.execution.decision!.kind).toBe('replacement');
  resume(
    pending,
    choose(pending, i => i.kind === 'target' && i.card === g.refs.ally),
  );
  const redirected = target(pending, g.refs.ally!);
  expect(tokens(redirected, g.refs.card!, 'shield')).toBe(1);
  expect(redirected.cards[g.refs.ally!]!.damage).toBe(3);
  const shielded = target(pending, g.refs.shield!);
  expect(tokens(shielded, g.refs.card!, 'shield')).toBe(0);
  expect(shielded.cards[g.refs.ally!]!.damage).toBe(0);
});
test('Redirected combat damage can be prevented by the recipient’s Shields, including after reload', () => {
  const p = position();
  p.attachments = [
    { card: 'shield', unit: 'ally', ref: 'first' },
    { card: 'shield', unit: 'ally', ref: 'second' },
  ];
  const g = scenario(p);
  const pending = target(attack(g.state, g.refs.card!, g.refs.defender!), g.refs.ally!);
  resume(
    pending,
    choose(pending, i => i.kind === 'target' && i.card === g.refs.first),
  );
  const s = target(pending, g.refs.first!);
  expect(s.cards[g.refs.card!]!.damage).toBe(0);
  expect(s.cards[g.refs.ally!]!.damage).toBe(0);
  expect(tokens(s, g.refs.ally!, 'shield')).toBe(1);
});
test('Maul can decline redirection and cannot choose himself or a unit without Underworld', () => {
  const p = position();
  p.players[0].ground!.push({ card: ids.marine, ref: 'ordinary' });
  const g = scenario(p);
  const pending = attack(g.state, g.refs.card!, g.refs.defender!);
  expect(
    pending.execution
      .decision!.options.filter(o => o.intent.kind === 'target')
      .map(o => o.intent.kind === 'target' && o.intent.card),
  ).toEqual([g.refs.ally!]);
  expect(step(pending, 'decline-effect').cards[g.refs.card!]!.damage).toBe(3);
});
