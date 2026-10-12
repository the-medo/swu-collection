import { describe, expect, test } from 'bun:test';
import type { Deck } from '../../db/schema/deck.ts';
import { canReadDeck, getDeckPermissions } from './getDeckPermissions.ts';

const privateDeck = { id: 'deck', userId: 'owner', public: 0, cardPoolId: null } as Deck;
const noDatabase = new Proxy(
  {},
  {
    get() {
      throw new Error('Unexpected database access');
    },
  },
);

describe('deck reference permissions', () => {
  test.each(['parent', 'sealed-version', 'open-version'] as const)(
    'owner can read private %s',
    async kind => {
      const permissions = await getDeckPermissions(privateDeck, 'owner', false, kind, noDatabase);
      expect(canReadDeck(privateDeck, permissions)).toBe(true);
      expect(permissions.canEditContent).toBe(kind === 'parent');
      expect(permissions.canSaveVersion).toBe(kind === 'parent');
      expect(permissions.canDelete).toBe(kind === 'parent');
    },
  );

  test.each([1, 2])(
    'anonymous users can read visibility %s without edit access',
    async visibility => {
      const parent = { ...privateDeck, public: visibility };
      const permissions = await getDeckPermissions(
        parent,
        null,
        false,
        'sealed-version',
        noDatabase,
      );
      expect(canReadDeck(parent, permissions)).toBe(true);
      expect(permissions.canEditContent).toBe(false);
      expect(permissions.canSaveVersion).toBe(false);
    },
  );

  test('limited decks retain metadata access but cannot use normal card writes or versions', async () => {
    const permissions = await getDeckPermissions(
      { ...privateDeck, cardPoolId: 'pool' },
      'owner',
      false,
      'parent',
      noDatabase,
    );
    expect(permissions.canEditMetadata).toBe(true);
    expect(permissions.canChangeVisibility).toBe(true);
    expect(permissions.canEditContent).toBe(false);
    expect(permissions.canSaveVersion).toBe(false);
  });
});
