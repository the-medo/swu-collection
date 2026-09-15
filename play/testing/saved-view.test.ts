import { expect, test } from 'bun:test';
import { Projector } from '../projection/projector.ts';
import { parseSavedView } from '../view/saved-view.ts';
import { PROTOCOL_VERSION } from '../view/version.ts';
import { position } from './helpers.ts';
import { scenario } from './scenario.ts';

test('saved protocol-36 reports render through the optional presentation upgrade, with full validation', () => {
  const { state } = scenario(position());
  const current = new Projector(
    state.gameId,
    { role: 'spectator' },
    'saved-view-test-key-at-least-32-characters',
  ).project(state);
  const legacy = JSON.parse(JSON.stringify(current));
  legacy.protocolVersion = 36;
  for (const card of legacy.cards) if (card.face) delete card.face.sentinel;
  for (const event of legacy.events) delete event.order;
  const parsed = parseSavedView(legacy);
  expect(parsed.success).toBe(true);
  if (!parsed.success) throw parsed.error;
  expect(parsed.data.protocolVersion).toBe(PROTOCOL_VERSION);
  expect(parsed.data.cards).toEqual(legacy.cards);
  expect(parseSavedView({ ...legacy, protocolVersion: 35 }).success).toBe(false);
  expect(parseSavedView({ ...legacy, cards: [{ id: 'invalid' }] }).success).toBe(false);
  expect(parseSavedView(null).success).toBe(false);
  expect(parseSavedView({ ...legacy, protocolVersion: 37 }).success).toBe(true);
  expect(parseSavedView({ ...legacy, protocolVersion: 38 }).success).toBe(true);
  expect(parseSavedView(current).success).toBe(true);
});
