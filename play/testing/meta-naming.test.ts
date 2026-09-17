import { expect, test } from 'bun:test';
import { bundledCatalog } from '../cards/catalog.ts';
const cardTitles = bundledCatalog.data.titles;
const cardTitle = (id: string) => bundledCatalog.title(id);
import { cardDefinition, supportedCards } from '../cards/registry.ts';
import type { CardEffect } from '../cards/definition.ts';
import { advance, settle } from '../engine/advance.ts';
import { unitStats, canAttach } from '../engine/attachments.ts';
import { unitIsLeader } from '../engine/attributes.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { changeControl } from '../engine/control.ts';
import { effectiveAbilities } from '../engine/effective-abilities.ts';
import { modifyUnit } from '../engine/lasting.ts';
import type { GameState, Intent } from '../engine/model.ts';
import { namedAbilityLoss, cannotPlayNamedCard } from '../engine/naming.ts';
import { cardPlayIntents } from '../engine/play-options.ts';
import { move, playCost } from '../engine/state.ts';
import { effectFrames } from '../engine/triggers.ts';
import { Projector } from '../projection/projector.ts';
import { gameViewSchema } from '../view/parse.ts';
import { viewCommandSchema } from '../view/wire.ts';
import { scenario } from './scenario.ts';
import { choose, ids, position } from './helpers.ts';
const ryder = 'ryder-azadi--restored-governor',
  garindan = 'garindan--information-broker',
  galen = 'galen-erso--you-ll-never-win';
const sabine = 'sabine-wren--i-learned-the-hard-way';
const resources = () => Array.from({ length: 14 }, () => ({ card: ids.marine }));
const step = (
  s: GameState,
  intent: Intent['kind'] | ((i: Intent) => boolean),
  selections: string[] = [],
) => advance(s, choose(s, intent, selections)).state;
const nameInput = (s: GameState, namedCardId: string) => ({
  ...choose(s, 'accept-effect'),
  namedCardId,
});
const name = (s: GameState, id: string) => advance(s, nameInput(s, id)).state;
function fixture(card = galen) {
  const p = position();
  p.players[0].resources = resources();
  p.players[1].resources = resources();
  p.players[0].hand = [{ card, ref: 'source' }];
  return p;
}
function play(s: GameState, id: string) {
  return step(s, i => i.kind === 'play' && i.card === id && !i.piloting);
}
function effects(s: GameState, list: CardEffect[], actor = 'alice') {
  const state = structuredClone(s);
  state.execution.decision = null;
  state.execution.frames = [
    ...effectFrames(actor, state.cards[state.players[actor]!.leader]!, list),
    { kind: 'flush-triggers' },
    { kind: 'action' },
  ];
  settle(state);
  return state;
}
function resume(s: GameState, input: ReturnType<typeof choose>) {
  expect(decodeState(encodeState(s))).toEqual(s);
  const child = Bun.spawnSync(
    [process.execPath, new URL('./fixtures/resume.ts', import.meta.url).pathname],
    {
      stdin: new TextEncoder().encode(JSON.stringify({ state: encodeState(s), input })),
      stdout: 'pipe',
      stderr: 'pipe',
    },
  );
  expect(child.stderr.toString()).toBe('');
  expect(child.exitCode).toBe(0);
  expect(JSON.parse(child.stdout.toString())).toEqual(advance(s, input));
}

test('naming pins official full titles separately from supported behavior and ignores only subtitles', async () => {
  const catalog = await Bun.file(
    new URL('../../server/db/json/card-list.json', import.meta.url),
  ).json();
  expect(cardTitles).toEqual(
    Object.fromEntries(
      Object.entries(catalog).map(([id, c]) => [id, (c as { title: string }).title]),
    ),
  );
  expect(cardTitle('no-glory--only-results')).toBe('No Glory, Only Results');
  expect(cardTitle(ids.leader)).toBe(cardTitle(sabine));
  expect(cardTitle('__proto__')).toBeUndefined();
  const s = scenario(fixture(ryder));
  const naming = play(s.state, s.refs.source!);
  const unsupported = Object.keys(cardTitles).find(
    id => !supportedCards.some(c => c.cardId === id),
  );
  if (unsupported) {
    expect(() => cardDefinition(unsupported)).toThrow();
    expect(name(naming, unsupported).namedEffects[0]!.name).toBe(cardTitle(unsupported)!);
  }
  expect(() => advance(naming, choose(naming, 'accept-effect'))).toThrow();
  expect(() => name(naming, 'invented-card')).toThrow();
  expect(() => advance(s.state, { ...choose(s.state, 'pass'), namedCardId: ids.marine })).toThrow();
  resume(naming, nameInput(naming, 'no-glory--only-results'));
});

test('Ryder prohibits every subtitle and nested free plays, but only for the original opponent', () => {
  const p = fixture(ryder);
  p.players[1].hand = [{ card: sabine, ref: 'enemy' }];
  const s = scenario(p);
  let state = name(play(s.state, s.refs.source!), ids.leader);
  expect(cardPlayIntents(state, state.cards[s.refs.enemy!]!, 'bob')).toEqual([]);
  expect(cannotPlayNamedCard(state, state.cards[s.refs.enemy!]!, 'alice')).toBe(false);
  const nested = effects(
    state,
    [{ kind: 'play-card', from: 'hand', filter: {}, free: true, optional: true }],
    'bob',
  );
  expect(nested.execution.decision?.options.some(o => o.intent.kind === 'play')).toBe(false);
  expect(changeControl(state, state.cards[s.refs.source!]!, 'bob')).toBe(true);
  expect(cannotPlayNamedCard(state, state.cards[s.refs.enemy!]!, 'bob')).toBe(true);
  expect(cannotPlayNamedCard(state, state.cards[s.refs.enemy!]!, 'alice')).toBe(false);
  modifyUnit(state, state.cards[state.players.alice!.leader]!, state.cards[s.refs.source!]!, {
    kind: 'modify',
    power: 0,
    hp: 0,
    loseAbilities: true,
    duration: 'phase',
  });
  expect(cannotPlayNamedCard(state, state.cards[s.refs.enemy!]!, 'bob')).toBe(true);
  move(state, state.cards[s.refs.source!]!, 'hand');
  expect(cannotPlayNamedCard(state, state.cards[s.refs.enemy!]!, 'bob')).toBe(false);
  move(state, state.cards[s.refs.source!]!, 'ground');
  expect(cannotPlayNamedCard(state, state.cards[s.refs.enemy!]!, 'bob')).toBe(false);
});

test('Garindan names before looking, privately discards one exact matching copy, and resumes both choices', () => {
  const p = fixture(garindan);
  p.players[1].hand = [
    { card: sabine, ref: 'first' },
    { card: 'sabine-wren--spectre-five', ref: 'second' },
    { card: ids.consular, ref: 'other' },
  ];
  const s = scenario(p),
    naming = play(s.state, s.refs.source!);
  const a = new Projector(naming.gameId, { role: 'player', playerId: 'alice' }, 'n'.repeat(32));
  const before = a.project(naming);
  expect(before.decision!.inspectedCards).toEqual([]);
  expect(JSON.stringify(before)).not.toContain(sabine);
  const altered = structuredClone(naming);
  altered.cards[s.refs.first!]!.cardId = ids.fighter;
  expect(a.project(altered)).toEqual(before);
  resume(naming, nameInput(naming, ids.leader));
  const inspect = name(naming, ids.leader);
  expect(inspect.execution.decision!.selection).toMatchObject({
    min: 1,
    max: 1,
    cards: [s.refs.first!, s.refs.second!],
  });
  expect(a.project(inspect).decision!.inspectedCards).toHaveLength(3);
  const spectator = new Projector(inspect.gameId, { role: 'spectator' }).project(inspect);
  expect(spectator.decision).toBeNull();
  expect(JSON.stringify(spectator)).not.toContain(sabine);
  expect(spectator.events.find(e => e.type === 'card-named')?.namedCard).toBe('Sabine Wren');
  expect(() => step(inspect, 'accept-effect', [s.refs.other!])).toThrow();
  resume(inspect, choose(inspect, 'accept-effect', [s.refs.second!]));
  const done = step(inspect, 'accept-effect', [s.refs.second!]);
  expect(done.cards[s.refs.second!]!.zone).toBe('discard');
  expect(done.cards[s.refs.first!]!.zone).toBe('hand');
  expect(gameViewSchema.parse(a.project(done))).toEqual(a.project(done));
});

test('Garindan still looks when no card matches, requiring no discard', () => {
  const p = fixture(garindan);
  p.players[1].hand = [{ card: ids.marine }];
  const s = scenario(p),
    inspect = name(play(s.state, s.refs.source!), ids.leader);
  expect(inspect.execution.decision!.selection).toMatchObject({ cards: [], min: 0, max: 0 });
  expect(
    new Projector(inspect.gameId, { role: 'player', playerId: 'alice' }).project(inspect).decision!
      .inspectedCards,
  ).toHaveLength(1);
  expect(step(inspect, 'accept-effect').players.bob!.hand).toHaveLength(1);
});

test('Galen strips all owned nonleader copies across zones, including gained abilities, independently of control', () => {
  const p = fixture();
  p.players[0].ground = [{ card: sabine, ref: 'ours' }];
  p.players[1].ground = [{ card: sabine, ref: 'unit' }];
  p.players[1].hand = [{ card: sabine, ref: 'hand' }];
  p.players[1].discard = [{ card: sabine, ref: 'discard' }];
  p.players[1].resources = [{ card: sabine, ref: 'resource' }];
  p.players[1].deck = [...p.players[1].deck!, { card: sabine, ref: 'deck' }];
  const s = scenario(p),
    state = name(play(s.state, s.refs.source!), ids.leader);
  for (const alias of ['unit', 'hand', 'discard', 'resource', 'deck']) {
    expect(namedAbilityLoss(state, state.cards[s.refs[alias]!]!)).toBe(true);
    expect(effectiveAbilities(state, state.cards[s.refs[alias]!]!).keywords).toEqual([]);
  }
  expect(effectiveAbilities(state, state.cards[s.refs.ours!]!).keywords).toContain('Shielded');
  expect(
    effectiveAbilities(state, state.cards[state.players.bob!.leader]!).actions?.length,
  ).toBeGreaterThan(0);
  changeControl(state, state.cards[s.refs.unit!]!, 'alice');
  changeControl(state, state.cards[s.refs.source!]!, 'bob');
  expect(namedAbilityLoss(state, state.cards[s.refs.unit!]!)).toBe(true);
  expect(namedAbilityLoss(state, state.cards[s.refs.ours!]!)).toBe(false);
  modifyUnit(state, state.cards[s.refs.source!]!, state.cards[s.refs.unit!]!, {
    kind: 'modify',
    power: 2,
    hp: 1,
    abilities: { keywords: ['Sentinel'] },
    duration: 'phase',
  });
  expect(effectiveAbilities(state, state.cards[s.refs.unit!]!).keywords).toEqual([]);
  expect(unitStats(state, state.cards[s.refs.unit!]!)).toEqual({ power: 6, hp: 6 });
  move(state, state.cards[s.refs.source!]!, 'hand');
  expect(effectiveAbilities(state, state.cards[s.refs.unit!]!).keywords).toContain('Sentinel');
});

test('Galen blanks events in hand and discard but still charges their cost and records their play', () => {
  const p = fixture();
  p.players[1].hand = [{ card: 'open-fire', ref: 'event' }];
  p.players[0].ground = [{ card: ids.marine, ref: 'target' }];
  const s = scenario(p),
    state = name(play(s.state, s.refs.source!), 'open-fire');
  const cost = playCost(state, state.cards[s.refs.event!]!),
    done = play(state, s.refs.event!);
  expect(done.cards[s.refs.event!]!.zone).toBe('discard');
  expect(done.cards[s.refs.target!]!.damage).toBe(0);
  expect(done.players.bob!.resources.filter(id => done.cards[id]!.exhausted)).toHaveLength(cost);
  expect(done.execution.decision!.kind).toBe('action');
  expect(done.roundHistory.plays.at(-1)!.card.cardId).toBe('open-fire');
});

test('Galen removes printed Shield prevention without removing its token identity', () => {
  const p = fixture();
  p.players[1].ground = [{ card: ids.marine, ref: 'target' }];
  p.attachments = [{ card: 'shield', unit: 'target', ref: 'shield' }];
  const s = scenario(p),
    state = name(play(s.state, s.refs.source!), 'shield');
  const damage = effects(state, [
    {
      kind: 'select-unit',
      filter: { name: 'Battlefield Marine' },
      bind: 'unit',
      optional: false,
      effects: [{ kind: 'on-unit', target: 'unit', operation: { kind: 'damage', amount: 1 } }],
    },
  ]);
  const done = step(damage, i => i.kind === 'target' && i.card === s.refs.target);
  expect(done.cards[s.refs.target!]!.damage).toBe(1);
  expect(done.cards[s.refs.shield!]!.attachedTo).not.toBeNull();
});

test('Galen removes Piloting in hand and granted upgrade abilities while retaining attached statistics', () => {
  const pilot = 'chewbacca--faithful-first-mate';
  const p = fixture();
  p.players[1].hand = [{ card: pilot, ref: 'pilot' }];
  p.players[1].space = [{ card: 'tie-bomber', ref: 'host' }];
  p.attachments = [{ card: pilot, unit: 'host', ref: 'attached' }];
  const s = scenario(p),
    before = unitStats(s.state, s.state.cards[s.refs.host!]!),
    state = name(play(s.state, s.refs.source!), pilot);
  expect(
    cardPlayIntents(state, state.cards[s.refs.pilot!]!, 'bob').every(
      i => i.kind === 'play' && !i.piloting,
    ),
  ).toBe(true);
  expect(unitStats(state, state.cards[s.refs.host!]!)).toEqual(before);
  expect(effectiveAbilities(state, state.cards[s.refs.attached!]!).enemyAbilityImmunity).toEqual(
    [],
  );
});

test('Galen exempts a host made into a leader by Darksaber, but can blank Darksaber itself', () => {
  const dark = 'the-darksaber--icon-of-leadership',
    rex = 'captain-rex--into-the-firefight';
  const p = fixture();
  p.players[1].ground = [{ card: rex, ref: 'host' }];
  p.attachments = [{ card: dark, unit: 'host', ref: 'saber' }];
  const s = scenario(p),
    naming = play(s.state, s.refs.source!),
    exempt = name(naming, rex);
  expect(unitIsLeader(exempt, exempt.cards[s.refs.host!]!)).toBe(true);
  expect(namedAbilityLoss(exempt, exempt.cards[s.refs.host!]!)).toBe(false);
  const blank = name(naming, dark);
  expect(unitIsLeader(blank, blank.cards[s.refs.host!]!)).toBe(false);
  expect(effectiveAbilities(blank, blank.cards[s.refs.host!]!).providesAspects).toBe(false);
  expect(unitStats(blank, blank.cards[s.refs.host!]!)).toEqual({ power: 11, hp: 9 });
});

test('Galen blanks base actions, printed upgrade attachment restrictions and unique-host discounts', () => {
  const p = fixture();
  p.players[1].base = { card: 'canto-bight' };
  p.players[1].hand = [{ card: 'mastery', ref: 'mastery' }];
  p.players[1].space = [{ card: 'tie-bomber', ref: 'vehicle' }];
  const s = scenario(p),
    naming = play(s.state, s.refs.source!),
    base = name(naming, 'canto-bight');
  expect(effectiveAbilities(base, base.cards[base.players.bob!.base]!).actions).toEqual([]);
  const mastery = name(naming, 'mastery');
  expect(canAttach(mastery, mastery.cards[s.refs.mastery!]!, mastery.cards[s.refs.vehicle!]!)).toBe(
    true,
  );
  expect(
    playCost(
      mastery,
      mastery.cards[s.refs.mastery!]!,
      0,
      undefined,
      mastery.cards[mastery.players.bob!.leader]!,
    ),
  ).toBe(
    playCost(
      mastery,
      mastery.cards[s.refs.mastery!]!,
      0,
      undefined,
      mastery.cards[s.refs.vehicle!]!,
    ),
  );
});

test('catalog choice is preserved through the viewer command without admitting instance handles as names', () => {
  const s = scenario(fixture(ryder)),
    state = play(s.state, s.refs.source!);
  const projector = new Projector(state.gameId, { role: 'player', playerId: 'alice' }),
    view = projector.project(state);
  const command = {
    gameId: view.gameId,
    epoch: view.epoch,
    expectedRevision: view.revision,
    decisionId: view.decision!.id,
    optionId: view.decision!.options[0]!.id,
    namedCardId: 'no-glory--only-results',
  };
  const input = projector.command(state, viewCommandSchema.parse(command));
  expect(advance(state, input).state.namedEffects[0]!.name).toBe('No Glory, Only Results');
  expect(() =>
    advance(state, projector.command(state, { ...command, namedCardId: view.cards[0]!.id })),
  ).toThrow();
});

test('a blank Shield can still pay for the Mandalorian’s separate prevention ability', () => {
  const mando = 'the-mandalorian--devoted-rescuer';
  const p = fixture();
  p.players[1].ground = [
    { card: ids.marine, ref: 'target' },
    { card: mando, ref: 'mando' },
  ];
  p.attachments = [{ card: 'shield', unit: 'mando', ref: 'shield' }];
  const s = scenario(p),
    state = name(play(s.state, s.refs.source!), 'shield');
  const damage = effects(state, [
    {
      kind: 'select-unit',
      filter: { name: 'Battlefield Marine' },
      bind: 'unit',
      optional: false,
      effects: [{ kind: 'on-unit', target: 'unit', operation: { kind: 'damage', amount: 1 } }],
    },
  ]);
  const replacement = step(damage, i => i.kind === 'target' && i.card === s.refs.target);
  expect(replacement.execution.decision!.kind).toBe('replacement');
  const done = step(replacement, i => i.kind === 'target' && i.card === s.refs.shield);
  expect(done.cards[s.refs.target!]!.damage).toBe(0);
  expect(done.cards[s.refs.shield!]!.zone).toBe('set-aside');
});

test('Galen removes Plot from an opponent resource before leader deployment', () => {
  const p = fixture();
  p.players[1].resources!.push({ card: garindan, ref: 'plot' });
  const s = scenario(p),
    state = name(play(s.state, s.refs.source!), garindan);
  const deployed = step(state, i => i.kind === 'use-ability' && i.abilityId === 'deploy');
  expect(deployed.cards[s.refs.plot!]!.zone).toBe('resources');
  expect(deployed.execution.decision!.kind).toBe('action');
  expect(
    deployed.facts.some(f => f.type === 'shown' && f.cards.some(c => c.instanceId === s.refs.plot)),
  ).toBe(false);
});

test('named Hounds enter exhausted even with no opposing ground units', () => {
  const p = fixture();
  p.players[1].hand = [{ card: 'corellian-hounds', ref: 'hounds' }];
  const s = scenario(p),
    state = name(play(s.state, s.refs.source!), 'corellian-hounds');
  // A control change preserves Galen's affected opponent while making the
  // Hounds' ordinary condition true: their opponent has no ground units.
  changeControl(state, state.cards[s.refs.source!]!, 'bob');
  expect(play(state, s.refs.hounds!).cards[s.refs.hounds!]!.exhausted).toBe(true);
});

test('blank printed attachment text falls back to the general unit restriction', () => {
  const dark = 'the-darksaber--icon-of-leadership';
  const p = fixture();
  p.players[1].hand = [{ card: dark, ref: 'upgrade' }];
  p.players[1].space = [{ card: 'tie-bomber', ref: 'vehicle' }];
  const s = scenario(p);
  expect(canAttach(s.state, s.state.cards[s.refs.upgrade!]!, s.state.cards[s.refs.vehicle!]!)).toBe(
    false,
  );
  const state = name(play(s.state, s.refs.source!), dark);
  expect(canAttach(state, state.cards[s.refs.upgrade!]!, state.cards[s.refs.vehicle!]!)).toBe(true);
});
