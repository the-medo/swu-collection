import { afterEach, expect, mock, spyOn, test } from 'bun:test';
import { db } from '../../db';
import { deck as deckTable } from '../../db/schema/deck.ts';
import { deckImportSource } from '../../db/schema/deck_import_source.ts';
import { importDeckForUser, refreshImportedDeckForUser } from './importDeck.ts';
import * as deckInformation from './updateDeckInformation.ts';
import * as cardListProvider from '../cards/cardListProvider.ts';
import { getDeckBuilderForSource } from './deckBuilders.ts';
import { formatData } from '../../../types/Format.ts';

afterEach(() => mock.restore());

test.each([
  { name: 'My custom title', description: 'My matchup notes' },
  { name: '', description: null },
])('refresh preserves local title, description, and format: %j', async localText => {
  const storedDeck = { id: 'my-deck', public: 0, format: 6, ...localText };
  const setDeck = mock((values: Record<string, unknown>) => {
    Object.assign(storedDeck, values);
    return { where: () => ({ returning: async () => [storedDeck] }) };
  });
  const setSource = mock(() => ({ where: async () => undefined }));
  const insertCards = mock(async () => undefined);
  const deleteCards = mock(async () => undefined);
  const tx = {
    update: (table: unknown) => {
      expect([deckTable, deckImportSource]).toContain(table);
      return { set: table === deckTable ? setDeck : setSource };
    },
    delete: () => ({ where: deleteCards }),
    insert: () => ({ values: insertCards }),
  };
  type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
  spyOn(db, 'transaction').mockImplementation(async action => action(tx as unknown as Transaction));
  const updateInformation = spyOn(deckInformation, 'updateDeckInformation').mockResolvedValue();

  const result = await refreshImportedDeckForUser({
    deckId: 'my-deck',
    userId: 'owner',
    parsedDeck: {
      name: 'Changed upstream title',
      leaderCardId1: 'new-leader',
      leaderCardId2: undefined,
      baseCardId: 'new-base',
      cards: [{ cardId: 'new-card', board: 1, quantity: 3, note: '' }],
      errors: ['Unknown main-deck card: UNKNOWN_001.'],
    },
  });

  expect(result.deck).toMatchObject({ ...localText, public: 0, format: 6 });
  expect(setDeck).toHaveBeenCalledTimes(1);
  const updates = setDeck.mock.calls[0][0];
  expect(updates).not.toHaveProperty('name');
  expect(updates).not.toHaveProperty('description');
  expect(updates).not.toHaveProperty('format');
  expect(updates).toMatchObject({
    leaderCardId1: 'new-leader',
    baseCardId: 'new-base',
    updatedAt: expect.any(Date),
  });
  expect(deleteCards).toHaveBeenCalledTimes(1);
  expect(insertCards).toHaveBeenCalledWith([
    { deckId: 'my-deck', cardId: 'new-card', board: 1, quantity: 3, note: '' },
  ]);
  expect(setSource).toHaveBeenCalledWith({ refreshedAt: expect.any(Date) });
  expect(updateInformation).toHaveBeenCalledWith('my-deck');
  expect(result.errors).toEqual(['Unknown main-deck card: UNKNOWN_001.']);
});

test.each(formatData.map(format => format.id))(
  'new imports persist the user-selected format %i without inferring it from leaders',
  async format => {
    const insertDeck = mock((values: Record<string, unknown>) => ({
      returning: async () => [{ id: 'new-deck', ...values }],
    }));
    const insertSource = mock(async () => undefined);
    const tx = {
      insert: (table: unknown) => ({
        values: table === deckTable ? insertDeck : insertSource,
      }),
    };
    type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
    spyOn(db, 'transaction').mockImplementation(async action =>
      action(tx as unknown as Transaction),
    );
    spyOn(cardListProvider, 'getMergedCardList').mockResolvedValue({});
    spyOn(deckInformation, 'updateDeckInformation').mockResolvedValue();

    const result = await importDeckForUser({
      userId: 'owner',
      builder: getDeckBuilderForSource('swudb'),
      deckId: 'source-deck',
      format,
      sourceDeck: {
        metadata: { name: 'Imported title', author: '' },
        leader: { id: 'HMW_002', count: 1 },
        secondleader: { id: 'SOR_001', count: 1 },
        base: { id: 'LAW_019', count: 1 },
        deck: [],
        sideboard: [],
      },
    });

    expect(result.deck.format).toBe(format);
    expect(insertDeck).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Imported title', format }),
    );
    expect(insertSource).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'swudb', sourceDeckId: 'source-deck' }),
    );
  },
);
