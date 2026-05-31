import { describe, expect, test } from 'bun:test';
import { SwuArena, SwuAspect, SwuRarity, SwuSet } from '../../../types/enums.ts';
import {
  createPreviewCardPayloadTemplate,
  normalizePreviewCardPayload,
} from './previewCardPayload.ts';
import {
  buildCardListUpdateSection,
  isCardListVersionStale,
  mergeCardLists,
} from './cardListProvider.ts';
import { buildPreviewVariantIdMap, replaceCardIdInCommaList } from './previewCardMigration.ts';
import type { CardDataWithVariants, CardListVariants } from '../../../lib/swu-resources/types.ts';

const basePayload = {
  cardId: '',
  updatedAt: '',
  title: 'Sample Unit',
  name: 'Sample Unit',
  hp: 3,
  power: 2,
  upgradeHp: null,
  upgradePower: null,
  text: null,
  rules: null,
  deployBox: null,
  epicAction: null,
  front: {
    horizontal: false,
  },
  back: null,
  aspects: [SwuAspect.COMMAND],
  type: 'Unit',
  cost: 2,
  traits: ['Trooper'],
  keywords: [],
  arenas: [SwuArena.GROUND],
  rarity: SwuRarity.COMMON,
  set: SwuSet.LAW,
  karabast_id: 'preview-sample-unit',
  variants: {
    'sample-unit-preview-standard': {
      variantId: 'sample-unit-preview-standard',
      swuId: 0,
      set: SwuSet.LAW,
      fullSetName: 'A Lawless Time',
      cardNo: 42,
      baseSet: true,
      hasNonfoil: true,
      hasFoil: false,
      variantName: 'Standard',
      artist: '',
      image: {
        front: 'preview/sample-unit-front.webp',
        back: null,
      },
      front: {
        horizontal: false,
      },
    },
  },
};

describe('preview card payload validation', () => {
  test('normalizes admin-friendly blanks into active preview card data', () => {
    const card = normalizePreviewCardPayload(basePayload);

    expect(card.cardId).toBe('sample-unit');
    expect(card.updatedAt.length).toBeGreaterThan(0);
    expect(card.preview).toBe(true);
    expect(card.previewStatus).toBe('active');
    expect(card.karabast_id).toBe('preview-sample-unit');
    expect(card.variants['sample-unit-preview-standard']?.preview).toBe(true);
  });

  test('rejects payloads without real variants', () => {
    expect(() =>
      normalizePreviewCardPayload({
        ...basePayload,
        variants: {},
      }),
    ).toThrow('Preview cards need at least one variant');
  });

  test('predefined admin template carries preview defaults and a standard variant', () => {
    const template = createPreviewCardPayloadTemplate();

    expect(template.preview).toBe(true);
    expect(template.previewStatus).toBe('active');
    expect(template.set).toBe(SwuSet.ASH);
    expect(template.arenas).toContain(SwuArena.GROUND);
    expect(template.variants['example-card-preview-standard']?.set).toBe(SwuSet.ASH);
    expect(template.variants['example-card-preview-standard']?.fullSetName).toBe(
      'Ashes of the Empire',
    );
    expect(Object.keys(template.variants)).toContain('example-card-preview-standard');
  });
});

describe('preview card list merge', () => {
  test('keeps official cards on cardId collision while preserving preview-only cards', () => {
    const previewCard = normalizePreviewCardPayload(basePayload);
    const officialCard = {
      ...previewCard,
      name: 'Official Sample Unit',
      preview: false,
    } as CardDataWithVariants<CardListVariants>;

    const merged = mergeCardLists(
      { 'sample-unit': officialCard },
      {
        'sample-unit': previewCard,
        'preview-only': {
          ...previewCard,
          cardId: 'preview-only',
          name: 'Preview Only',
        },
      },
    );

    expect(merged['sample-unit']?.name).toBe('Official Sample Unit');
    expect(merged['preview-only']?.name).toBe('Preview Only');
  });
});

describe('card list version comparison', () => {
  test('marks missing, invalid, and older client versions as stale', () => {
    const serverVersion = '2026-05-20T12:00:00.000Z';

    expect(isCardListVersionStale(undefined, serverVersion)).toBe(true);
    expect(isCardListVersionStale('not-a-date', serverVersion)).toBe(true);
    expect(isCardListVersionStale('2026-05-20T11:59:59.999Z', serverVersion)).toBe(true);
  });

  test('keeps equal and newer client versions current', () => {
    const serverVersion = '2026-05-20T12:00:00.000Z';

    expect(isCardListVersionStale(serverVersion, serverVersion)).toBe(false);
    expect(isCardListVersionStale('2026-05-20T12:00:00.001Z', serverVersion)).toBe(false);
  });
});

describe('card list update response sections', () => {
  test('includes cards only when a section is stale', () => {
    const cards = {
      'sample-unit': normalizePreviewCardPayload(basePayload),
    };
    const serverVersion = '2026-05-20T12:00:00.000Z';

    expect(buildCardListUpdateSection('2026-05-20T11:59:59.999Z', serverVersion, cards)).toEqual({
      needsUpdate: true,
      lastUpdated: serverVersion,
      cards,
    });

    expect(buildCardListUpdateSection(serverVersion, serverVersion, cards)).toEqual({
      needsUpdate: false,
      lastUpdated: serverVersion,
    });
  });
});

describe('preview card migration helpers', () => {
  test('maps preview variants to official variants by variant name', () => {
    const previewCard = normalizePreviewCardPayload(basePayload);
    const officialCard = {
      ...previewCard,
      preview: false,
      variants: {
        'sample-unit-standard': {
          ...previewCard.variants['sample-unit-preview-standard']!,
          variantId: 'sample-unit-standard',
          preview: false,
        },
      },
    } as CardDataWithVariants<CardListVariants>;

    expect(buildPreviewVariantIdMap(previewCard, officialCard)).toEqual({
      'sample-unit-preview-standard': 'sample-unit-standard',
    });
  });

  test('replaces comma-separated card ids exactly and deduplicates destination ids', () => {
    expect(replaceCardIdInCommaList('preview,other,official', 'preview', 'official')).toBe(
      'official,other',
    );
    expect(replaceCardIdInCommaList('preview-extra,preview', 'preview', 'official')).toBe(
      'preview-extra,official',
    );
  });
});
