import { expect, test } from 'bun:test';
import { advance } from '../engine/advance.ts';
import { cardTraits } from '../engine/attributes.ts';
import { unitStats } from '../engine/attachments.ts';
import { effectiveAbilities } from '../engine/effective-abilities.ts';
import { Projector } from '../projection/projector.ts';
import { scenario } from './scenario.ts';
import { choose, position } from './helpers.ts';

// Minimized from Luke/Greef training seed 20277449: giving Advantage to
// Luke's host recursed through token blanking -> pilot grant -> host traits.
for (const [host, fighter, power] of [
  ['blue-leader--scarif-air-support', true, 3],
  ['skyhopper-canyon-runner', false, 1],
] as const) {
  test(`Luke's conditional pilot ability and Advantage coexist on ${host}`, () => {
    const p = position();
    p.players[0].ground = [{ card: host, ref: 'host', movedArena: fighter }];
    p.players[0].leader = {
      card: 'luke-skywalker--hero-of-yavin',
      ref: 'luke',
      deployedAs: 'upgrade',
      attachedTo: 'host',
      abilityUses: { deploy: 1 },
    };
    p.attachments = [{ card: 'advantage', unit: 'host', ref: 'token' }];
    const { state, refs } = scenario(p);
    const unit = state.cards[refs.host!]!;
    expect(cardTraits(state, unit).includes('Fighter')).toBe(fighter);
    expect(
      effectiveAbilities(state, unit).triggers?.some(t => t.id.endsWith('fighter-attack')) ?? false,
    ).toBe(fighter);
    expect(unitStats(state, unit).power).toBe(power + 4 + 1);
    expect(
      new Projector(state.gameId, { role: 'spectator' }).project(state).decision,
    ).toBeDefined();
    expect(advance(state, choose(state, 'pass')).state.revision).toBe(state.revision + 1);
  });
}
