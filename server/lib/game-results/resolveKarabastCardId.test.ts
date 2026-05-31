import { describe, expect, test } from 'bun:test';
import type { CardList } from '../../../lib/swu-resources/types.ts';
import { cardsByUid } from '../../db/lists.ts';
import type { IntegrationGameData } from '../../db/schema/integration.ts';
import {
  addLegacyKarabastLobbyMatchLookupKeys,
  getKarabastLobbyMatchIdentities,
} from './resolveKarabastLobbyMatchIds.ts';
import {
  buildKarabastPreviewIdMap,
  resolveKarabastCardIdWithMap,
  type KarabastCardIdResolver,
} from './resolveKarabastCardId.ts';
import { transformKarabastGameDataToGameResults } from './transformKarabastGameDataToGameResults.ts';

function captureWarnings<T>(fn: () => T): { result: T; warnings: string[] } {
  const originalWarn = console.warn;
  const warnings: string[] = [];
  console.warn = (...args: unknown[]) => {
    warnings.push(args.map(String).join(' '));
  };

  try {
    return {
      result: fn(),
      warnings,
    };
  } finally {
    console.warn = originalWarn;
  }
}

const createPreviewCards = (cards: Record<string, unknown>): CardList => cards as CardList;

describe('Karabast preview card ID resolver', () => {
  test('builds a trimmed preview mapping and ignores blank mapping values', () => {
    const map = buildKarabastPreviewIdMap(
      createPreviewCards({
        'preview-leader': {
          cardId: ' preview-leader ',
          karabast_id_to_swubase_id: ' karabast-preview-leader ',
        },
        'preview-without-mapping': {
          cardId: 'preview-without-mapping',
          karabast_id_to_swubase_id: '   ',
        },
      }),
    );

    expect(map.get('karabast-preview-leader')).toBe('preview-leader');
    expect([...map.values()]).not.toContain('preview-without-mapping');
  });

  test('warns for duplicate preview mappings and uses the lowest SWUBase cardId', () => {
    const { result: map, warnings } = captureWarnings(() =>
      buildKarabastPreviewIdMap(
        createPreviewCards({
          'z-preview': {
            cardId: 'z-preview',
            karabast_id_to_swubase_id: 'duplicate-karabast-id',
          },
          'a-preview': {
            cardId: 'a-preview',
            karabast_id_to_swubase_id: 'duplicate-karabast-id',
          },
        }),
      ),
    );

    expect(map.get('duplicate-karabast-id')).toBe('a-preview');
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('duplicate-karabast-id');
    expect(warnings[0]).toContain('a-preview, z-preview');
  });

  test('warns and skips preview mappings with blank cardIds', () => {
    const { result: map, warnings } = captureWarnings(() =>
      buildKarabastPreviewIdMap(
        createPreviewCards({
          'blank-card-id': {
            cardId: '   ',
            karabast_id_to_swubase_id: 'karabast-preview',
          },
        }),
      ),
    );

    expect(map.has('karabast-preview')).toBe(false);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('empty or whitespace-only cardId');
  });

  test('prefers official cardUid matches over preview mappings', () => {
    const officialEntry = Object.entries(cardsByUid).find(([, card]) => card?.cardId);
    if (!officialEntry?.[1]) {
      throw new Error('Expected at least one official card UID fixture');
    }

    const [officialUid, officialCard] = officialEntry;
    const map = new Map([[officialUid, 'preview-card']]);

    expect(resolveKarabastCardIdWithMap(officialUid, map)).toBe(officialCard.cardId);
  });

  test('resolves preview mappings, applies base special names, and trims fallback IDs', () => {
    const map = new Map([
      ['karabast-preview-leader', 'preview-leader'],
      ['karabast-preview-base', 'capital-city'],
    ]);

    expect(resolveKarabastCardIdWithMap(' karabast-preview-leader ', map)).toBe('preview-leader');
    // capital-city is a basic Vigilance base in baseSpecialNames.
    expect(resolveKarabastCardIdWithMap('karabast-preview-base', map, true)).toBe('Vigilance');
    expect(resolveKarabastCardIdWithMap(' raw-karabast-id ', map)).toBe('raw-karabast-id');
    expect(resolveKarabastCardIdWithMap('   ', map)).toBeNull();
    expect(resolveKarabastCardIdWithMap(null, map)).toBeNull();
  });
});

describe('Karabast game-result transformation', () => {
  test('uses the injected resolver for leaders, bases, opponents, and card metrics', async () => {
    const integrationData = {
      id: 'integration-game-id',
      integrationId: 1,
      gameId: 'game-id',
      lobbyId: 'lobby-id',
      userId1: 'user-1',
      userId2: 'user-2',
      createdAt: new Date().toISOString(),
      data: {
        format: 'premier',
        sequenceNumber: 1,
        roundNumber: 3,
        startedAt: '2026-01-21T16:28:42.574Z',
        finishedAt: '2026-01-21T16:29:20.605Z',
        players: [
          {
            data: {
              leader: 'p1-leader',
              base: 'p1-base',
              // No deck ID keeps normalizeKarabastDeckId() at null and skips the DB deck lookup.
              deck: { id: undefined },
              isWinner: true,
            },
            cardMetrics: {
              'preview-metric-card': { drawn: 1 },
              '': { drawn: 2 },
            },
          },
          {
            data: {
              leader: 'p2-leader',
              base: 'p2-base',
              deck: { id: undefined },
              isWinner: false,
            },
            cardMetrics: {},
          },
        ],
      },
    } as unknown as IntegrationGameData;

    const resolver: KarabastCardIdResolver = (uid, useSpecialBaseKey = false) => {
      if (!uid) return null;
      return `${useSpecialBaseKey ? 'base' : 'card'}:${uid}`;
    };

    const results = await transformKarabastGameDataToGameResults(
      integrationData,
      { 0: 'match-1', 1: 'match-1' },
      resolver,
    );

    expect(results[0]?.leaderCardId).toBe('card:p1-leader');
    expect(results[0]?.baseCardKey).toBe('base:p1-base');
    expect(results[0]?.opponentLeaderCardId).toBe('card:p2-leader');
    expect(results[0]?.opponentBaseCardKey).toBe('base:p2-base');
    expect(results[0]?.cardMetrics).toEqual({
      'card:preview-metric-card': { drawn: 1 },
    });

    expect(results[1]?.leaderCardId).toBe('card:p2-leader');
    expect(results[1]?.baseCardKey).toBe('base:p2-base');
    expect(results[1]?.opponentLeaderCardId).toBe('card:p1-leader');
    expect(results[1]?.opponentBaseCardKey).toBe('base:p1-base');
  });
});

describe('Karabast lobby match identities', () => {
  test('uses the injected resolver and carries legacy lookup-key aliases', () => {
    const integrationData = {
      id: 'integration-game-id',
      integrationId: 1,
      gameId: 'game-id',
      lobbyId: 'lobby-id',
      userId1: 'user-1',
      userId2: 'user-2',
      createdAt: new Date().toISOString(),
      data: {
        players: [
          {
            data: {
              leader: 'p1-leader',
              base: 'p1-base',
              deck: { id: undefined },
              isWinner: true,
            },
          },
          {
            data: {
              leader: 'p2-preview-leader',
              base: 'p2-preview-base',
              deck: { id: undefined },
              isWinner: false,
            },
          },
        ],
      },
    } as unknown as IntegrationGameData;

    const canonicalResolver: KarabastCardIdResolver = (uid, useSpecialBaseKey = false) =>
      uid ? `${useSpecialBaseKey ? 'base' : 'card'}:${uid}` : null;
    const legacyResolver: KarabastCardIdResolver = uid => uid ?? null;

    const canonicalIdentities = getKarabastLobbyMatchIdentities(
      integrationData,
      canonicalResolver,
    );
    const legacyIdentities = getKarabastLobbyMatchIdentities(integrationData, legacyResolver);
    const identities = addLegacyKarabastLobbyMatchLookupKeys(
      canonicalIdentities,
      legacyIdentities,
    );

    expect(identities[0]?.opponentLeaderCardId).toBe('card:p2-preview-leader');
    expect(identities[0]?.opponentBaseCardKey).toBe('base:p2-preview-base');
    expect(identities[0]?.lookupKeys).toContain(canonicalIdentities[0]?.lookupKey);
    expect(identities[0]?.lookupKeys).toContain(legacyIdentities[0]?.lookupKey);
  });

  test('does not add legacy aliases when lookup keys match or legacy identity is missing', () => {
    const canonicalIdentities = [
      {
        playerIndex: 0,
        userId: 'user-1',
        lobbyId: 'lobby-id',
        deckId: null,
        opponentLeaderCardId: 'leader',
        opponentBaseCardKey: 'base',
        lookupKey: 'same-key',
        lookupKeys: ['same-key'],
      },
      {
        playerIndex: 1,
        userId: 'user-2',
        lobbyId: 'lobby-id',
        deckId: null,
        opponentLeaderCardId: 'other-leader',
        opponentBaseCardKey: 'other-base',
        lookupKey: 'canonical-only-key',
        lookupKeys: ['canonical-only-key'],
      },
    ];
    const legacyIdentities = [
      {
        ...canonicalIdentities[0],
        lookupKeys: [canonicalIdentities[0]!.lookupKey],
      },
    ];

    const identities = addLegacyKarabastLobbyMatchLookupKeys(
      canonicalIdentities,
      legacyIdentities,
    );

    expect(identities[0]?.lookupKeys).toEqual(['same-key']);
    expect(identities[1]?.lookupKeys).toEqual(['canonical-only-key']);
  });
});
