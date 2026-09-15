import { expect, test } from 'bun:test';
import { advance } from '../engine/advance.ts';
import { move } from '../engine/state.ts';
import { modifyUnit } from '../engine/lasting.ts';
import { effectiveAbilities } from '../engine/effective-abilities.ts';
import { Projector } from '../projection/projector.ts';
import { gameViewSchema } from '../view/parse.ts';
import { scenario } from './scenario.ts';
import { choose, ids, position } from './helpers.ts';

for (const namedCardId of ['mystic-monastery', 'shield'])
  test(`Galen's warning reaches named ${namedCardId} copies and disappears when he leaves`, () => {
    const p = position();
    p.players[0].hand = [{ card: 'galen-erso--you-ll-never-win', ref: 'galen' }];
    p.players[0].resources = Array.from({ length: 12 }, () => ({ card: ids.marine }));
    p.players[1].base = { card: 'mystic-monastery' };
    p.players[1].ground = [{ card: ids.consular, ref: 'unit' }];
    p.attachments = [
      { card: 'shield', unit: 'unit', ref: 'shield-a' },
      { card: 'shield', unit: 'unit', ref: 'shield-b' },
    ];
    const { state, refs } = scenario(p);
    let s = advance(state, choose(state, 'play')).state;
    s = advance(s, { ...choose(s, 'accept-effect'), namedCardId }).state;
    const projector = new Projector(s.gameId, { role: 'player', playerId: 'bob' });
    const cards = projector.project(s).cards.filter(c => c.face?.cardId === namedCardId);
    expect(cards.length).toBe(namedCardId === 'shield' ? 2 : 1);
    for (const card of cards)
      expect(card.face?.warnings).toContain('This card has lost its abilities.');
    if (namedCardId === 'shield') {
      for (const card of cards)
        expect(card.face?.warnings).toContain('This Shield does not prevent damage.');
    } else {
      expect(
        s.execution.decision?.options.some(
          o => o.intent.kind === 'use-ability' && o.intent.card === s.players.bob!.base,
        ),
      ).toBe(false);
      expect(effectiveAbilities(s, s.cards[s.players.bob!.base]!).actions).toEqual([]);
    }
    move(s, s.cards[refs.galen!]!, 'discard');
    for (const card of projector.project(s).cards.filter(c => c.face?.cardId === namedCardId))
      expect(card.face?.warnings).toBeUndefined();
    if (namedCardId !== 'shield')
      expect(effectiveAbilities(s, s.cards[s.players.bob!.base]!).actions?.[0]?.id).toBe(
        'gain-force',
      );
  });

test('Masterpiece describes healing, Experience and damage separately as the attack resolves', () => {
  const p = position();
  p.players[0].space = [{ card: 'sabine-s-masterpiece--crazy-colorful', ref: 'ship' }];
  p.players[0].ground = [{ card: ids.consular }, { card: ids.marine }, { card: ids.trooper }];
  p.players[0].base.damage = 5;
  const { state, refs } = scenario(p);
  let s = advance(
    state,
    choose(state, i => i.kind === 'attack' && i.attacker === refs.ship),
  ).state;
  const projector = new Projector(s.gameId, { role: 'player', playerId: 'alice' });
  expect(projector.project(s).decision?.presentation?.text).toBe('Heal 2 damage from a base.');
  s = advance(
    s,
    choose(s, i => i.kind === 'target' && i.card === s.players.alice!.base),
  ).state;
  expect(projector.project(s).decision?.presentation?.text).toBe(
    'Give an Experience token to a unit.',
  );
  s = advance(
    s,
    choose(s, i => i.kind === 'target' && i.card === refs.ship),
  ).state;
  expect(projector.project(s).decision?.presentation?.text).toBe(
    'Deal 1 damage to the chosen target.',
  );
  expect(gameViewSchema.parse(projector.project(s))).toEqual(projector.project(s));
});

for (const [source, warning] of [
  ['galen-erso--you-ll-never-win', 'This card has lost its abilities.'],
  ['ryder-azadi--restored-governor', 'This card cannot be played.'],
] as const)
  test(`${source} projects its chosen title and active restrictions without exposing hidden copies`, () => {
    const p = position();
    p.players[0].hand = [{ card: source, ref: 'source' }];
    p.players[0].resources = Array.from({ length: 14 }, () => ({ card: ids.marine }));
    p.players[1].ground = [{ card: ids.marine, ref: 'board' }];
    p.players[1].hand = [{ card: ids.marine, ref: 'hidden' }];
    p.players[1].resources = [{ card: ids.marine, ref: 'resource' }];
    const { state, refs } = scenario(p);
    let s = advance(state, choose(state, 'play')).state;
    s = advance(s, { ...choose(s, 'accept-effect'), namedCardId: ids.marine }).state;
    const viewer = new Projector(s.gameId, { role: 'player', playerId: 'bob' });
    const view = viewer.project(s);
    expect(view.cards.find(c => c.face?.cardId === source)!.face?.notes).toEqual([
      'Battlefield Marine',
    ]);
    expect(view.cards.find(c => c.zone === 'hand')!.face?.warnings).toContain(warning);
    const spectator = new Projector(s.gameId, { role: 'spectator' });
    const publicView = spectator.project(s);
    expect(publicView.cards.some(c => c.zone === 'hand')).toBe(false);
    expect(publicView.cards.filter(c => c.zone === 'resources').every(c => !c.face)).toBe(true);
    const changed = structuredClone(s);
    changed.cards[refs.hidden!]!.cardId = ids.fighter;
    changed.cards[refs.resource!]!.cardId = ids.fighter;
    expect(spectator.project(changed)).toEqual(publicView);
    move(s, s.cards[refs.source!]!, 'discard');
    const gone = viewer.project(s);
    expect(gone.cards.find(c => c.zone === 'hand')!.face?.warnings).toBeUndefined();
    expect(gone.cards.find(c => c.face?.cardId === source)!.face?.notes).toBeUndefined();
  });

test('temporary ability loss is marked and ends with its active lasting effect', () => {
  const p = position();
  p.players[0].ground = [{ card: ids.marine, ref: 'unit' }];
  const { state, refs } = scenario(p);
  modifyUnit(state, state.cards[state.players.alice!.leader]!, state.cards[refs.unit!]!, {
    kind: 'modify',
    power: 0,
    hp: 0,
    loseAbilities: true,
    duration: 'phase',
  });
  const projector = new Projector(state.gameId, { role: 'spectator' });
  expect(projector.project(state).cards.find(c => c.zone === 'ground')!.face?.warnings).toContain(
    'This card has lost its abilities.',
  );
  state.lastingEffects = [];
  expect(
    projector.project(state).cards.find(c => c.zone === 'ground')!.face?.warnings,
  ).toBeUndefined();
});

test('target descriptions never reduce ability loss to a misleading zero-stat modifier', () => {
  const p = position();
  p.players[0].leader = { card: 'kazuda-xiono--best-pilot-in-the-galaxy', ref: 'leader' };
  p.players[0].ground = [{ card: ids.marine }];
  const { state, refs } = scenario(p);
  const s = advance(
    state,
    choose(
      state,
      i => i.kind === 'use-ability' && i.card === refs.leader && i.abilityId === 'extra-action',
    ),
  ).state;
  const view = new Projector(s.gameId, { role: 'player', playerId: 'alice' }).project(s);
  expect(view.decision?.effect).toBe('select-unit');
  expect(view.decision?.source?.cardId).toBe('kazuda-xiono--best-pilot-in-the-galaxy');
  expect(view.decision?.presentation).toBeUndefined();
});
