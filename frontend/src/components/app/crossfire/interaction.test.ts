import { expect, test } from 'bun:test';
import { PROTOCOL_VERSION, type GameView } from '../../../../../play/view/types.ts';
import { inspectionCards } from './inspection.ts';
import {
  activateCardAction,
  actionableCards,
  cardActions,
  currentInteraction,
  freshInteraction,
  pressCard,
  selectionValid,
  isBoardTargetChoice,
  type BoardOption,
  type BoardInteraction,
} from './interaction.ts';
const option = (
  id: string,
  kind: string,
  cards: string[],
  other: Partial<BoardOption> = {},
): BoardOption => ({
  id,
  kind,
  cards,
  playerId: null,
  piloting: null,
  exploit: null,
  smuggle: null,
  mode: null,
  delayed: null,
  tokenCardId: null,
  takeMulligan: null,
  action: null,
  ability: null,
  ...other,
});
function board(options: BoardOption[]): GameView {
  return {
    protocolVersion: PROTOCOL_VERSION,
    gameId: 'game',
    epoch: 'epoch',
    revision: 1,
    round: 1,
    phase: 'action',
    activePlayer: 'p1',
    initiative: { holder: 'p1', claimed: false },
    result: null,
    players: [
      { id: 'p1', handCount: 1, deckCount: 20 },
      { id: 'p2', handCount: 3, deckCount: 20 },
    ],
    cards: ['unit', 'base', 'enemy', 'hand', 'leader'].map((id, n) => ({
      id,
      face: {
        cardId: id,
        name: id,
        side: 'front',
        printedKind: 'unit',
        kind: 'unit',
        token: false,
        traits: [],
        leaderUnit: false,
        power: 2,
        hp: 4,
      },
      owner: n === 1 || n === 2 ? 'p2' : 'p1',
      controller: n === 1 || n === 2 ? 'p2' : 'p1',
      zone: 'ground',
      exhausted: false,
      damage: 0,
      deployedAs: null,
      capturedBy: null,
      attachedTo: null,
      abilityUses: {},
      limitedActions: [],
    })),
    privateDeckTop: null,
    scheduled: [],
    events: [],
    decision: {
      id: 'decision',
      kind: 'action',
      inspectedCards: [],
      source: null,
      effect: null,
      options,
      selection: null,
    },
  };
}
const selected = (result: ReturnType<typeof pressCard>): BoardInteraction => {
  if (result.kind !== 'interaction') throw new Error('Expected a local interaction');
  return result.interaction;
};
test('an attack requires source then exact legal target; selecting never advances the game', () => {
  const view = board([
    option('a', 'attack', ['unit', 'base']),
    option('b', 'attack', ['unit', 'enemy']),
  ]);
  const state = selected(pressCard(view, freshInteraction(view), 'unit', false));
  expect(actionableCards(view, state)).toEqual(['base', 'enemy']);
  expect(pressCard(view, state, 'enemy', false)).toEqual({
    kind: 'submit',
    optionId: 'b',
    selections: [],
  });
  expect(pressCard(view, state, 'hand', false)).toEqual({ kind: 'none' });
  expect(view.revision).toBe(1);
});
test('even an attack with a single legal target waits for the target click', () => {
  const view = board([option('a', 'attack', ['unit', 'base'])]);
  expect(pressCard(view, freshInteraction(view), 'unit', false).kind).toBe('interaction');
});
test('a card with several abilities opens a menu and keeps target variants together', () => {
  const view = board([
    option('a', 'attack', ['unit', 'base']),
    option('b', 'attack', ['unit', 'enemy']),
    option('c', 'use-ability', ['unit'], {
      action: { id: 'heal', limit: null, grantedBy: null, deploymentAvailable: false },
    }),
  ]);
  const state = selected(pressCard(view, freshInteraction(view), 'unit', false));
  const actions = cardActions(view.decision, 'unit');
  expect(actions).toHaveLength(2);
  expect(state.action).toBeNull();
  expect(activateCardAction(view, state, actions[1]!)).toEqual({
    kind: 'submit',
    optionId: 'c',
    selections: [],
  });
});
test('playing an upgrade selects its host and distinguishes normal play, Piloting and Smuggle', () => {
  const view = board([
    option('u', 'play', ['hand']),
    option('p1', 'play', ['hand', 'unit'], { piloting: 'pilot' }),
    option('p2', 'play', ['hand', 'leader'], { piloting: 'pilot' }),
    option('s', 'play', ['hand'], { smuggle: { cost: 2, grantedBy: null } }),
  ]);
  const actions = cardActions(view.decision, 'hand');
  expect(actions).toHaveLength(3);
  const state = selected(activateCardAction(view, freshInteraction(view), actions[1]!));
  expect(pressCard(view, state, 'leader', false)).toEqual({
    kind: 'submit',
    optionId: 'p2',
    selections: [],
  });
});
test('target and unique-copy decisions submit the supplied option on a card click', () => {
  for (const kind of ['target', 'keep-unique']) {
    const view = board([option('first', kind, ['unit']), option('second', kind, ['enemy'])]);
    expect(pressCard(view, freshInteraction(view), 'enemy', false)).toEqual({
      kind: 'submit',
      optionId: 'second',
      selections: [],
    });
  }
});
test('resource/Exploit selection toggles exact copies, enforces capacity and waits for confirmation', () => {
  const view = board([option('confirm', 'accept-effect', [])]);
  view.decision!.selection = { cards: ['unit', 'enemy', 'hand'], min: 1, max: 2 };
  let state = freshInteraction(view);
  for (const id of ['unit', 'enemy', 'hand']) state = selected(pressCard(view, state, id, false));
  expect(state.selections).toEqual(['unit', 'enemy']);
  expect(selectionValid(view.decision!, state.selections)).toBe(true);
  state = selected(pressCard(view, state, 'unit', false));
  expect(state.selections).toEqual(['enemy']);
});
test('allocation clicks preserve quantum, per-card and total bounds', () => {
  const view = board([]);
  view.decision!.selection = {
    cards: ['unit', 'base'],
    min: 4,
    max: 4,
    allocation: { limits: { unit: 2, base: 4 }, quantum: 2 },
  };
  let state = freshInteraction(view);
  for (const id of ['unit', 'unit', 'base', 'base'])
    state = selected(pressCard(view, state, id, false));
  expect(state.selections).toEqual(['unit', 'unit', 'base', 'base']);
  expect(selectionValid(view.decision!, state.selections)).toBe(true);
  expect(selectionValid(view.decision!, ['unit', 'unit', 'unit', 'base'])).toBe(false);
});
test('private inspected cards can be chosen without revealing anything beyond the supplied view', () => {
  const view = board([option('pick', 'target', ['private'])]);
  view.decision!.inspectedCards = [{ id: 'private', face: view.cards[0]!.face! }];
  expect(pressCard(view, freshInteraction(view), 'private', false)).toEqual({
    kind: 'submit',
    optionId: 'pick',
    selections: [],
  });
  expect(pressCard(view, freshInteraction(view), 'unknown', false)).toEqual({ kind: 'none' });
});
test('a new decision or epoch discards local targets and selections, while log-only renders preserve them', () => {
  const view = board([option('a', 'attack', ['unit', 'base'])]);
  const state = selected(pressCard(view, freshInteraction(view), 'unit', false));
  expect(currentInteraction({ ...view, revision: 2 }, state)).toBe(state);
  expect(currentInteraction({ ...view, epoch: 'new' }, state).source).toBeNull();
  view.decision!.id = 'next';
  expect(currentInteraction(view, state).source).toBeNull();
});
test('pending acknowledgments and spectator views cannot submit board actions', () => {
  const view = board([option('a', 'play', ['hand'])]);
  expect(pressCard(view, freshInteraction(view), 'hand', true)).toEqual({ kind: 'none' });
  view.decision = null;
  expect(pressCard(view, freshInteraction(view), 'hand', false).kind).toBe('none');
  expect(actionableCards(view, freshInteraction(view))).toEqual([]);
});
test('selection confirmation validates disclosure icons, budgets and forged handles', () => {
  const view = board([]);
  view.decision!.selection = {
    cards: ['unit', 'hand'],
    min: 0,
    max: 2,
    budget: { max: 3, costs: { unit: 2, hand: 2 } },
    disclose: { required: ['Command'], icons: { unit: ['Command'], hand: [] } },
  };
  expect(selectionValid(view.decision!, ['unit'])).toBe(true);
  expect(selectionValid(view.decision!, ['unit', 'hand'])).toBe(false);
  expect(selectionValid(view.decision!, ['hand'])).toBe(false);
  expect(selectionValid(view.decision!, ['forged'])).toBe(false);
});

test('an inspection can temporarily show a resource face without changing the board projection', () => {
  const view = board([]);
  const face = view.cards[0]!.face!;
  view.cards[0]!.face = null;
  view.cards[0]!.zone = 'resources';
  expect(pressCard(view, freshInteraction(view), 'unit', false)).toEqual({ kind: 'none' });
  view.decision!.inspectedCards = [{ id: 'unit', face }];
  expect(pressCard(view, freshInteraction(view), 'unit', false)).toEqual({ kind: 'none' });
  expect(inspectionCards(view, 'unit')[0]?.face).toBe(face);
  expect(view.cards[0]!.face).toBeNull();
  view.decision = null;
  expect(pressCard(view, freshInteraction(view), 'unit', false)).toEqual({ kind: 'none' });
  expect(inspectionCards(view, 'unit')).toEqual([]);
});

test('inspection navigates exact attachments and captives without including hidden or unrelated copies', () => {
  const view = board([]);
  view.cards[1]!.attachedTo = 'unit';
  view.cards[2]!.capturedBy = 'unit';
  view.cards[2]!.zone = 'captured';
  view.cards[3]!.face = view.cards[1]!.face; // Same name, different physical card.
  const fromUnit = inspectionCards(view, 'unit');
  expect(fromUnit.map(c => [c.id, c.relation])).toEqual([
    ['unit', 'Unit'],
    ['base', 'Upgrade'],
    ['enemy', 'Captured'],
  ]);
  expect(inspectionCards(view, 'base')).toEqual(fromUnit);
  expect(inspectionCards(view, 'enemy')).toEqual(fromUnit);
  view.cards[1]!.face = null;
  expect(inspectionCards(view, 'unit').map(c => c.id)).toEqual(['unit', 'enemy']);
  expect(inspectionCards(view, 'base')).toEqual([]);
  view.cards[2]!.capturedBy = null;
  expect(inspectionCards(view, 'enemy').map(c => c.id)).toEqual(['enemy']);
});

test('a leader uses its sole action directly while unavailable pure deployment is hidden', () => {
  const boost = option('boost', 'use-ability', ['leader'], {
    action: {
      id: 'boost-unit',
      limit: null,
      deploymentAvailable: false,
      deploymentOnly: false,
      grantedBy: null,
    },
  });
  const deploy = option('deploy', 'use-ability', ['leader'], {
    action: {
      id: 'deploy',
      limit: 'once-per-game',
      deploymentAvailable: false,
      deploymentOnly: true,
      grantedBy: null,
    },
  });
  const view = board([boost, deploy]);
  expect(cardActions(view.decision, 'leader')).toHaveLength(1);
  expect(pressCard(view, freshInteraction(view), 'leader', false)).toEqual({
    kind: 'submit',
    optionId: 'boost',
    selections: [],
  });
  deploy.action!.deploymentAvailable = true;
  expect(cardActions(view.decision, 'leader')).toHaveLength(2);
  expect(pressCard(view, freshInteraction(view), 'leader', false).kind).toBe('interaction');
});

test('grouped damage targets toggle locally and unrelated card clicks never inspect during selection', () => {
  const view = board([option('confirm', 'accept-effect', [])]);
  view.decision!.kind = 'effect';
  view.decision!.effect = 'damage-units';
  view.decision!.selection = { cards: ['unit', 'enemy'], min: 2, max: 2 };
  expect(isBoardTargetChoice(view)).toBe(true);
  const first = pressCard(view, freshInteraction(view), 'unit', false);
  expect(first.kind).toBe('interaction');
  if (first.kind !== 'interaction') throw new Error('Expected local choice');
  expect(first.interaction.selections).toEqual(['unit']);
  expect(selectionValid(view.decision!, first.interaction.selections)).toBe(false);
  const remove = pressCard(view, first.interaction, 'unit', false);
  expect(remove).toMatchObject({ kind: 'interaction', interaction: { selections: [] } });
  const both = pressCard(view, first.interaction, 'enemy', false);
  expect(both).toMatchObject({
    kind: 'interaction',
    interaction: { selections: ['unit', 'enemy'] },
  });
  expect(pressCard(view, first.interaction, 'hand', false).kind).toBe('none');
});

test('choices needing a private inspection or Credit token tray keep their dialog', () => {
  const view = board([option('confirm', 'accept-effect', [])]);
  view.decision!.kind = 'effect';
  view.decision!.selection = { cards: ['unit'], min: 1, max: 1 };
  const resource = view.cards[0]!;
  resource.zone = 'resources';
  resource.face!.cardId = 'credit';
  expect(isBoardTargetChoice(view)).toBe(false);
  resource.face!.cardId = 'unit';
  expect(isBoardTargetChoice(view)).toBe(true);
  view.decision!.inspectedCards = [{ id: resource.id, face: resource.face! }];
  resource.face = null;
  expect(isBoardTargetChoice(view)).toBe(false);
});

test('Plot upgrade targeting retains the selected resource payment variant', () => {
  const view = board([
    option('normal-a', 'play', ['hand', 'unit'], { plot: { cost: 2, useOtherResources: false } }),
    option('normal-b', 'play', ['hand', 'enemy'], { plot: { cost: 2, useOtherResources: false } }),
    option('other-a', 'play', ['hand', 'unit'], { plot: { cost: 2, useOtherResources: true } }),
    option('other-b', 'play', ['hand', 'enemy'], { plot: { cost: 2, useOtherResources: true } }),
  ]);
  view.decision!.kind = 'effect';
  view.decision!.effect = 'plot-play';
  const actions = cardActions(view.decision, 'hand');
  expect(actions).toHaveLength(2);
  const action = actions.find(a => a.option.plot?.useOtherResources)!;
  const started = activateCardAction(view, freshInteraction(view), action);
  if (started.kind !== 'interaction') throw new Error('Expected target selection');
  expect(pressCard(view, started.interaction, 'enemy', false)).toEqual({
    kind: 'submit',
    optionId: 'other-b',
    selections: [],
  });
});
