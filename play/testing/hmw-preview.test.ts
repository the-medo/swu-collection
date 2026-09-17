import { expect, test } from 'bun:test';
import type { CardEffect } from '../cards/definition.ts';
import { supportedCards } from '../cards/registry.ts';
import { advance, settle } from '../engine/advance.ts';
import { attachedUpgrades, unitStats } from '../engine/attachments.ts';
import { cardTraits } from '../engine/attributes.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import type { GameState, Intent } from '../engine/model.ts';
import { reference } from '../engine/state.ts';
import { effectFrames } from '../engine/triggers.ts';
import { scenario } from './scenario.ts';
import { choose, ids, position } from './helpers.ts';

const resources = () => Array.from({ length: 10 }, () => ({ card: ids.marine }));
const step = (
  state: GameState,
  intent: Intent['kind'] | ((intent: Intent) => boolean),
  selections: string[] = [],
) => advance(state, choose(state, intent, selections)).state;

function effects(state: GameState, list: CardEffect[], actor = 'alice') {
  const next = structuredClone(state);
  next.execution.decision = null;
  next.execution.frames = [
    ...effectFrames(actor, next.cards[next.players[actor]!.leader]!, list),
    { kind: 'flush-triggers' },
    { kind: 'action' },
  ];
  settle(next);
  return next;
}

test('the pinned HMW catalog registers every non-reprint card plus its rules tokens', async () => {
  const catalog = (await Bun.file(
    new URL('../cards/hmw/catalog.json', import.meta.url),
  ).json()) as {
    cardId: string;
  }[];
  const registered = new Set(supportedCards.map(card => card.cardId));
  expect(catalog).toHaveLength(268);
  for (const card of catalog) expect(registered.has(card.cardId)).toBe(true);
  expect(registered.has('beast')).toBe(true);
  expect(registered.has('weakness')).toBe(true);
});

test('Fortify attaches Alliance Shield Generator to a base and prevents a five-damage hit', () => {
  const input = position('hmw-fortify');
  input.players[0].hand = [{ card: 'alliance-shield-generator', ref: 'generator' }];
  input.players[0].resources = resources();
  const game = scenario(input);
  const base = game.state.players.alice!.base;
  let state = step(
    game.state,
    intent =>
      intent.kind === 'play' && intent.card === game.refs.generator && intent.target === base,
  );
  const generator = state.cards[game.refs.generator!]!;
  expect(generator.zone).toBe('base');
  expect(generator.attachedTo?.instanceId).toBe(state.players.alice!.base);

  state = effects(state, [{ kind: 'damage-bases', amount: 5, targets: 'enemy' }], 'bob');
  expect(state.cards[state.players.alice!.base]!.damage).toBe(0);
  expect(state.cards[generator.instanceId]!.zone).toBe('discard');
  expect(state.players.alice!.hand).toHaveLength(1);
});

test('Homeworlds Beast and Weakness tokens use their printed rules statistics', () => {
  const input = position('hmw-rules-tokens');
  input.players[0].ground = [{ card: ids.marine, ref: 'unit' }];
  const game = scenario(input);
  const before = unitStats(game.state, game.state.cards[game.refs.unit!]!);
  // Bind the target exactly as a resolved card effect would.
  const state = structuredClone(game.state);
  state.execution.decision = null;
  state.execution.frames = [
    ...effectFrames(
      'alice',
      state.cards[state.players.alice!.leader]!,
      [
        {
          kind: 'on-unit',
          target: 'chosen',
          operation: { kind: 'give-token', token: 'weakness', count: 1 },
        },
        { kind: 'create-unit', cardId: 'beast', count: 1 },
      ],
      { bindings: { chosen: reference(state.cards[game.refs.unit!]!) } },
    ),
    { kind: 'flush-triggers' },
    { kind: 'action' },
  ];
  settle(state);

  const unit = state.cards[game.refs.unit!]!;
  expect(attachedUpgrades(state, unit).map(card => card.cardId)).toContain('weakness');
  expect(unitStats(state, unit)).toEqual({ power: before.power - 1, hp: before.hp - 1 });
  const beast = state.ground.map(id => state.cards[id]!).find(card => card.cardId === 'beast')!;
  expect(unitStats(state, beast)).toEqual({ power: 3, hp: 3 });
  expect(cardTraits(state, beast)).toContain('Creature');
});

test('phase trait loss follows current control rather than printed ownership', () => {
  const input = position('hmw-trait-control');
  input.players[0].ground = [{ card: ids.marine, ref: 'enemyControlled', controller: 'bob' }];
  input.players[1].ground = [{ card: ids.marine, ref: 'friendlyControlled', controller: 'alice' }];
  const game = scenario(input);
  game.state.traitLosses = [
    {
      source: reference(game.state.cards[game.state.players.alice!.leader]!),
      playerId: 'alice',
      trait: 'Trooper',
      round: game.state.round,
      phase: 'action',
    },
  ];
  expect(cardTraits(game.state, game.state.cards[game.refs.enemyControlled!]!)).not.toContain(
    'Trooper',
  );
  expect(cardTraits(game.state, game.state.cards[game.refs.friendlyControlled!]!)).toContain(
    'Trooper',
  );
});

test('Bacta Tank defeats itself as its printed action cost', () => {
  const input = position('hmw-bacta');
  input.players[0].hand = [{ card: 'bacta-tank', ref: 'tank' }];
  input.players[0].resources = resources();
  input.players[0].discard = [{ card: ids.marine, ref: 'patient' }];
  const game = scenario(input);
  let state = step(
    game.state,
    intent =>
      intent.kind === 'play' &&
      intent.card === game.refs.tank &&
      intent.target === game.state.players.alice!.base,
  );
  state = step(state, 'pass');
  state = step(
    state,
    intent =>
      intent.kind === 'use-ability' &&
      intent.card === game.refs.tank &&
      intent.abilityId === 'recover-unit',
  );
  expect(state.cards[game.refs.tank!]!.zone).toBe('discard');
  state = step(state, 'accept-effect', [game.refs.patient!]);
  expect(state.players.alice!.deck[0]).toBe(game.refs.patient);
});

test('Heavy Ion Cannon grants its base an action usable only once in the phase', () => {
  const input = position('hmw-ion-cannon');
  input.players[0].hand = [{ card: 'heavy-ion-cannon', ref: 'cannon' }];
  input.players[0].resources = resources();
  input.players[1].ground = [{ card: ids.marine, ref: 'target' }];
  const game = scenario(input);
  const base = game.state.players.alice!.base;
  let state = step(
    game.state,
    intent => intent.kind === 'play' && intent.card === game.refs.cannon && intent.target === base,
  );
  state = step(state, 'pass');
  const discard = state.players.alice!.hand[0]!;
  state = step(
    state,
    intent =>
      intent.kind === 'use-ability' &&
      intent.card === base &&
      intent.abilityId.endsWith('-ion-shot'),
  );
  state = step(state, 'accept-effect', [discard]);
  state = step(state, intent => intent.kind === 'target' && intent.card === game.refs.target);
  expect(state.cards[game.refs.target!]!.damage).toBe(2);
  state = step(state, 'pass');
  expect(
    state.execution.decision!.options.some(
      option =>
        option.intent.kind === 'use-ability' && option.intent.abilityId.endsWith('-ion-shot'),
    ),
  ).toBe(false);
});

test('Greater Sarlacc is offered when defeating ready resources makes it affordable', () => {
  const input = position('hmw-greater-sarlacc');
  input.players[0].leader = { card: 'han-solo--audacious-smuggler' };
  input.players[0].hand = [{ card: 'greater-sarlacc', ref: 'sarlacc' }];
  input.players[0].credits = ['credit'];
  input.players[0].resources = Array.from({ length: 4 }, (_, index) => ({
    card: ids.marine,
    ref: `resource-${index}`,
  }));
  const game = scenario(input);
  let state = step(
    game.state,
    intent => intent.kind === 'play' && intent.card === game.refs.sarlacc,
  );
  state = decodeState(encodeState(state));
  expect(state.execution.decision!.selection?.min).toBe(2);
  state = step(state, 'accept-effect', [game.refs['resource-0']!, game.refs['resource-1']!]);
  state = decodeState(encodeState(state));
  expect(state.execution.decision!.selection?.min).toBe(1);
  state = step(state, 'accept-effect', [game.refs.credit!]);
  expect(state.cards[game.refs.sarlacc!]!.zone).toBe('ground');
  expect(state.players.alice!.resources).toHaveLength(2);
  expect(state.players.alice!.resources.every(id => state.cards[id]!.exhausted)).toBe(true);
});

test("Boga's granted discard play preserves its discount through Greater Sarlacc's payment", () => {
  const input = position('hmw-boga-sarlacc');
  input.players[0].leader = { card: 'han-solo--audacious-smuggler' };
  input.players[0].ground = [{ card: 'boga--loyal-varactyl', ref: 'boga' }];
  input.players[0].discard = [{ card: 'greater-sarlacc', ref: 'sarlacc' }];
  input.players[0].resources = Array.from({ length: 6 }, (_, index) => ({
    card: ids.marine,
    ref: `resource-${index}`,
  }));
  const game = scenario(input);
  let state = structuredClone(game.state);
  state.grantedPlays.push({
    scope: 'bound-card',
    recipient: 'self',
    free: false,
    discount: 1,
    ignoreAspectPenalties: false,
    source: structuredClone(state.cards[game.refs.boga!]!),
    target: reference(state.cards[game.refs.sarlacc!]!),
    playerId: 'alice',
    round: state.round,
    phase: 'action',
  });
  state.execution.decision = null;
  settle(state);
  state = decodeState(encodeState(state));

  state = step(state, intent => intent.kind === 'play' && intent.card === game.refs.sarlacc);
  state = decodeState(encodeState(state));
  expect(state.execution.decision!.selection?.min).toBe(1);
  state = step(state, 'accept-effect', [game.refs['resource-0']!]);
  expect(state.cards[game.refs.sarlacc!]!).toMatchObject({ zone: 'ground', controller: 'alice' });
  expect(state.grantedPlays).toEqual([]);
  expect(state.players.alice!.resources).toHaveLength(5);
  expect(state.players.alice!.resources.every(id => state.cards[id]!.exhausted)).toBe(true);
});

test('The Marauder damages the selected friendly units before paying its reduced cost', () => {
  const input = position('hmw-marauder');
  input.players[0].hand = [{ card: 'the-marauder--a-new-home', ref: 'marauder' }];
  input.players[0].resources = Array.from({ length: 5 }, () => ({ card: ids.marine }));
  input.players[0].ground = [
    { card: ids.marine, ref: 'first' },
    { card: ids.marine, ref: 'second' },
  ];
  const game = scenario(input);
  let state = step(
    game.state,
    intent => intent.kind === 'play' && intent.card === game.refs.marauder,
  );
  expect(state.execution.decision!.selection?.min).toBe(2);
  state = step(state, 'accept-effect', [game.refs.first!, game.refs.second!]);
  expect(state.cards[game.refs.first!]!.damage).toBe(1);
  expect(state.cards[game.refs.second!]!.damage).toBe(1);
  expect(state.cards[game.refs.marauder!]!.zone).toBe('space');
});

test("Vernestra gains the selected discarded units' When Played abilities for the phase", () => {
  const input = position('hmw-vernestra');
  input.players[0].leader = { card: 'han-solo--audacious-smuggler' };
  input.players[0].hand = [
    { card: 'vernestra-rwoh--we-should-handle-this-ourselves', ref: 'vernestra' },
  ];
  input.players[0].resources = Array.from({ length: 6 }, () => ({ card: ids.marine }));
  input.players[0].discard = [{ card: 'j-type-nubian-starship', ref: 'nubian' }];
  const game = scenario(input);
  let state = step(
    game.state,
    intent => intent.kind === 'play' && intent.card === game.refs.vernestra,
  );
  state = step(state, 'accept-effect', [game.refs.nubian!]);
  expect(state.cards[game.refs.vernestra!]!.zone).toBe('ground');
  expect(state.players.alice!.deck.at(-1)).toBe(game.refs.nubian);
  expect(state.players.alice!.hand).toHaveLength(1);
});
