import releaseBaseline from './fixtures/replay-compatibility/1.0.0.json';
import { expect, test } from 'bun:test';
import baseline from './fixtures/replay-compatibility/development-baseline.json';
import {
  bundledCatalog,
  CardCatalog,
  registerCatalog,
  versionsFor,
  cardDefinition,
  assertCompatibleVersions,
} from '../cards/catalog.ts';
import { supportsEngine } from '../engine/release.ts';
import { createGame, advance } from '../engine/advance.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { stateDigest } from '../storage/integrity.ts';
import { verifyHistory } from '../history/records.ts';
import type { History } from '../history/records.ts';
import { config } from './helpers.ts';

test('minor compatibility is directional and never crosses majors', () => {
  expect(supportsEngine('1.0.0', '1.2.0')).toBe(true);
  expect(supportsEngine('1.1.3', '1.2.0')).toBe(true);
  expect(supportsEngine('1.2.0', '1.1.9')).toBe(false);
  expect(supportsEngine('1.0.0', '2.0.0')).toBe(false);
  expect(supportsEngine('1.0.1', '1.0.0')).toBe(false);
  expect(supportsEngine('1.0.nope')).toBe(false);
});
for (const fixture of [...baseline.cases, ...releaseBaseline.cases])
  test(`pre-refactor replay: ${fixture.name}`, () => {
    const state = decodeState(fixture.checkpoint);
    const next = advance(state, fixture.input);
    expect(stateDigest(encodeState(next.state))).toBe(fixture.stateHash);
    expect<unknown>(next.facts).toEqual(fixture.facts);
    expect(next.state.versions).toEqual(state.versions);
  });
test('pre-refactor journal and undo preserve every recorded hash', () => {
  const history = baseline.history as History;
  expect(stateDigest(encodeState(verifyHistory(history).state))).toBe(history.stateHash);
  const corrupt = structuredClone(history);
  corrupt.journal[0]!.stateHash = '0'.repeat(64);
  expect(() => verifyHistory(corrupt)).toThrow('integrity');
});
test('two games use different immutable definitions without changing each other', () => {
  const data = structuredClone(bundledCatalog.data);
  data.version = '1.0.987';
  const marine = data.cards.find(c => c.cardId === 'battlefield-marine')!;
  if (marine.kind !== 'unit') throw new Error('Fixture card');
  marine.power = 9;
  const updated = registerCatalog(new CardCatalog(data));
  const oldGame = createGame(config());
  const newGame = createGame({ ...config(), versions: versionsFor(updated) });
  expect(cardDefinition(oldGame, marine.cardId)).toMatchObject({ power: 3 });
  expect(cardDefinition(newGame, marine.cardId)).toMatchObject({ power: 9 });
  expect(cardDefinition(decodeState(encodeState(oldGame)), marine.cardId)).toMatchObject({
    power: 3,
  });
  expect(cardDefinition(decodeState(encodeState(newGame)), marine.cardId)).toMatchObject({
    power: 9,
  });
  marine.power = 99;
  expect(cardDefinition(newGame, marine.cardId)).toMatchObject({ power: 9 });
  expect(() => registerCatalog(new CardCatalog(data))).toThrow('different contents');
  expect(() => assertCompatibleVersions({ ...newGame.versions, cards: 'missing' })).toThrow();
});

test('download validation covers every card property and nested effect', async () => {
  const { validateCatalog } = await import('../cards/validate.ts');
  expect(validateCatalog(bundledCatalog.data, bundledCatalog.hash).pin).toBe(bundledCatalog.pin);
  const modified = () => JSON.parse(JSON.stringify(bundledCatalog.data));
  const unknown = modified();
  unknown.cards[0].unsupportedPassive = true;
  expect(() => validateCatalog(unknown)).toThrow('Invalid card definition');
  const effect = modified();
  const event = effect.cards.find((c: { kind: string }) => c.kind === 'event');
  event.effects = [{ kind: 'execute-code', code: 'bad' }];
  expect(() => validateCatalog(effect)).toThrow('Invalid card definition');
  const future = modified();
  future.version = '1.1.0';
  future.requiredEngine = '1.1.0';
  expect(() => validateCatalog(future)).toThrow('requires');
  const duplicate = modified();
  duplicate.cards.push(duplicate.cards[0]);
  expect(() => validateCatalog(duplicate)).toThrow('Duplicate');
  expect(() => validateCatalog(bundledCatalog.data, '0'.repeat(64))).toThrow('checksum');
});

test('release 1.0.0 journal remains replay-compatible', () => {
  const history = releaseBaseline.history as History;
  expect(stateDigest(encodeState(verifyHistory(history).state))).toBe(history.stateHash);
});

test('adding official catalog identities does not invalidate a frozen deck; tampering still fails', async () => {
  const { prepareDeckSnapshot, decodeDeckSnapshot } = await import('../admission/decks.ts');
  const { versions } = await import('../engine/model.ts');
  const player = config().players[0];
  const catalog = {
    [player.base]: { type: 'Base' },
    [player.leader]: { type: 'Leader' },
    ...Object.fromEntries(player.deck.map(c => [c.cardId, { type: 'Unit' }])),
  };
  const result = prepareDeckSnapshot(
    {
      source: { deckId: '11111111-1111-4111-8111-111111111111', format: 1, kind: 'normal' },
      leader: player.leader,
      leader2: null,
      base: player.base,
      mainboard: player.deck,
      sideboard: [],
      reserve: [],
    },
    catalog,
    versions.format,
  );
  if (!result.ok) throw new Error('Fixture deck');
  expect(
    decodeDeckSnapshot(result.snapshot, { ...catalog, newlyImportedCard: { type: 'Unit' } }),
  ).toEqual(result.snapshot);
  expect(() =>
    decodeDeckSnapshot({ ...result.snapshot, catalogIdentityHash: 'f'.repeat(64) }, catalog),
  ).toThrow('corrupted');
});
