import { expect, test } from 'bun:test';
import { advance } from '../engine/advance.ts';
import { Projector } from '../projection/projector.ts';
import { gameViewSchema } from '../view/parse.ts';
import { choose, ids, position } from './helpers.ts';
import { scenario } from './scenario.ts';

test('Sentinel presentation follows the effective ability, including Koska token conditions', () => {
  for (const owner of ['alice', 'bob', null]) {
    const p = position();
    p.players[0].ground = [{ card: 'koska-reeves--warrior-of-mandalore', ref: 'koska' }];
    if (owner)
      p.players[owner === 'alice' ? 0 : 1].ground = [
        ...(owner === 'alice' ? p.players[0].ground : []),
        { card: 'mandalorian' },
      ];
    const { state } = scenario(p);
    const view = new Projector(state.gameId, { role: 'spectator' }).project(state);
    expect(gameViewSchema.parse(view)).toEqual(view);
    expect(
      view.cards.find(c => c.face?.cardId === 'koska-reeves--warrior-of-mandalore')!.face!.sentinel,
    ).toBe(owner === 'alice');
  }
});

test('Shuttle exposes both Shielded and the separate When Played trigger', () => {
  const p = position();
  p.players[0].hand = [{ card: 'shuttle-st-149--under-krennic-s-authority' }];
  p.players[0].resources = Array.from({ length: 8 }, () => ({ card: ids.marine }));
  let s = scenario(p).state;
  s = advance(
    s,
    choose(s, i => i.kind === 'play'),
  ).state;
  const view = new Projector(s.gameId, { role: 'player', playerId: 'alice' }).project(s);
  expect(view.decision?.kind).toBe('trigger');
  expect(view.decision!.options.map(o => o.ability?.id).sort()).toEqual([
    'move-token-played',
    'shielded-played',
  ]);
  expect(view.decision!.options.every(o => o.ability?.timing === 'played')).toBe(true);
});

test('Grogu, Cobb and Shien Flurry produce five distinct illustrated-choice sources for Anakin', () => {
  const p = position();
  p.players[0].leader = { card: 'grogu--charming-companion' };
  p.players[0].ground = [{ card: 'cobb-vanth--let-me-handle-this' }];
  p.players[0].hand = [{ card: 'shien-flurry' }, { card: 'anakin-skywalker--champion-of-mortis' }];
  p.players[0].discard = [{ card: ids.marine }, { card: ids.trooper }];
  p.players[0].resources = Array.from({ length: 10 }, () => ({ card: ids.marine }));
  let s = scenario(p).state;
  s = advance(
    s,
    choose(s, i => i.kind === 'play' && s.cards[i.card]!.cardId === 'shien-flurry'),
  ).state;
  s = advance(
    s,
    choose(s, i => i.kind === 'play'),
  ).state;
  const view = new Projector(s.gameId, { role: 'player', playerId: 'alice' }).project(s);
  expect(gameViewSchema.parse(view)).toEqual(view);
  expect(view.decision?.kind).toBe('trigger');
  const choices = view.decision!.options.map(o => o.ability!);
  expect(choices.map(o => o.id).sort()).toEqual(
    ['ambush', 'discard-heroism', 'discard-villainy', 'shield-played-unit', 'unique-play'].sort(),
  );
  expect(
    choices
      .filter(o => o.source.cardId === 'anakin-skywalker--champion-of-mortis' && o.id !== 'ambush')
      .map(o => o.index),
  ).toEqual([0, 1]);
});
