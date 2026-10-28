import { setArraySorted } from '../../../../../../lib/swu-resources/set-info.ts';
import { expect, test } from 'bun:test';
import { cardList } from '../../../../../../server/db/lists.ts';
import {
  indexCardPrintings,
  resolveCardGroupPrintings,
} from '../../../../../../shared/lib/cardGroupPrintings.ts';
import {
  getCardHomeSets,
  getGalleryVariantLabel,
  getSetPrintings,
  resolveSetGallerySelection,
  setGallerySearchSchema,
} from './cardHomeLib.ts';
import { SwuRarity, SwuSet } from '../../../../../../types/enums.ts';
import { hasCardSearchRequest } from '../AdvancedCardSearch/advancedSearchLib.ts';

const index = indexCardPrintings(cardList);
const printings = [...index.values()];

test('set galleries use the printing set when a logical card was reprinted', () => {
  const printing = printings.find(
    ({ card, variant }) => variant.variantName === 'Standard' && variant.set !== card.set,
  )!;
  const results = getSetPrintings(printings, printing.variant.set, 'all');
  expect(results.some(p => p.card.cardId === printing.card.cardId)).toBe(true);
  expect(results.every(p => p.variant.set === printing.variant.set)).toBe(true);
});

test('weekly galleries resolve promo set codes and older OP Promo names', () => {
  const sources = [
    [SwuSet.HMW, 'hmwp'],
    [SwuSet.ASH, 'ashp'],
    [SwuSet.LAW, 'lawp'],
    [SwuSet.SEC, 'secw'],
    [SwuSet.LOF, 'lofw'],
    [SwuSet.JTL, 'jtlw'],
    [SwuSet.TWI, 'twi'],
    [SwuSet.SHD, 'shd'],
    [SwuSet.SOR, 'sor'],
    [SwuSet.JTL, 'jtlp'],
    [SwuSet.LOF, 'lofp'],
    [SwuSet.SEC, 'secp'],
  ] as const;
  for (const [set, source] of sources) {
    const printing = printings.find(
      p => p.variant.set === source && ['Weekly Play', 'OP Promo'].includes(p.variant.variantName),
    )!;
    expect(printing).toBeDefined();
    const results = getSetPrintings(printings, set, 'weekly');
    expect(results.map(p => p.variant.variantId)).toContain(printing.variant.variantId);
    expect(results.every(p => !p.variant.variantName.includes('Foil'))).toBe(true);
  }
  const hmwFoils = getSetPrintings(printings, SwuSet.HMW, 'weekly', 'weekly-play-foil');
  expect(hmwFoils.length).toBeGreaterThan(0);
  expect(hmwFoils.every(p => p.variant.variantName === 'Weekly Play Foil')).toBe(true);
  expect(
    getCardHomeSets(cardList).find(set => set.code === SwuSet.HMW)?.counts.weekly,
  ).toBeGreaterThan(0);
});

test('foil choices handle shared early-set IDs and HMW foil-only Hyperspace printings', () => {
  const early = printings.find(
    p =>
      p.variant.set === SwuSet.SOR &&
      p.variant.variantName === 'Standard' &&
      p.variant.hasFoil &&
      p.variant.hasNonfoil,
  )!;
  expect(getGalleryVariantLabel(early.variant, 'standard-foil')).toBe('Standard Foil');
  expect(getGalleryVariantLabel(early.variant, 'standard')).toBe('Standard');
  for (const treatment of ['standard', 'standard-foil'] as const)
    expect(
      getSetPrintings(printings, SwuSet.SOR, 'all', treatment).map(p => p.variant.variantId),
    ).toContain(early.variant.variantId);
  const hmwNonfoil = getSetPrintings(printings, SwuSet.HMW, 'all', 'hyperspace');
  const hmwFoil = getSetPrintings(printings, SwuSet.HMW, 'all', 'hyperspace-foil');
  expect(hmwNonfoil.length).toBeGreaterThan(0);
  expect(hmwFoil.length).toBeGreaterThan(0);
  expect(getGalleryVariantLabel(hmwFoil[0].variant)).toBe('Hyperspace Foil');
  expect(hmwFoil.every(p => p.variant.hasFoil && !p.variant.hasNonfoil)).toBe(true);
  expect(
    hmwFoil.every(p => !hmwNonfoil.some(n => n.variant.variantId === p.variant.variantId)),
  ).toBe(true);
  expect(getSetPrintings(printings, SwuSet.LAW, 'all', 'standard-foil')).toEqual([]);
  expect(getSetPrintings(printings, SwuSet.SEC, 'all', 'standard-foil').length).toBeGreaterThan(0);
});

test('showcase shortcuts share the leaders selection and invalid combinations use category defaults', () => {
  expect(resolveSetGallerySelection('showcases')).toEqual({
    category: 'leaders',
    variant: 'showcase',
  });
  expect(getSetPrintings(printings, SwuSet.HMW, 'showcases')).toEqual(
    getSetPrintings(printings, SwuSet.HMW, 'leaders', 'showcase'),
  );
  expect(resolveSetGallerySelection('leaders', 'hyperspace')).toEqual({
    category: 'leaders',
    variant: 'hyperspace',
  });
  expect(resolveSetGallerySelection('prestige', 'hyperspace')).toEqual({
    category: 'prestige',
    variant: 'standard-prestige',
  });
  expect(setGallerySearchSchema.parse({ csCategory: 'invalid', csVariant: 'invalid' })).toEqual({
    csCategory: 'all',
    csVariant: undefined,
  });
});

test('special galleries include exact printings while all-cards and leaders avoid duplicate cards', () => {
  for (const set of Object.values(SwuSet)) {
    const all = getSetPrintings(printings, set, 'all');
    expect(new Set(all.map(p => p.card.cardId)).size).toBe(all.length);
    for (const p of all) {
      expect(p.variant.set).toBe(set);
      const standard = printings.find(
        other =>
          other.card.cardId === p.card.cardId &&
          other.variant.set === set &&
          other.variant.variantName === 'Standard',
      );
      if (standard) expect(p.variant.variantName).toBe('Standard');
    }
    expect(getSetPrintings(printings, set, 'leaders').every(p => p.card.type === 'Leader')).toBe(
      true,
    );
    expect(
      getSetPrintings(printings, set, 'showcases').every(p => p.variant.variantName === 'Showcase'),
    ).toBe(true);
    expect(
      getSetPrintings(printings, set, 'prestige').every(
        p => p.variant.variantName === 'Standard Prestige',
      ),
    ).toBe(true);
  }
});

test('prestige defaults to basic and each finish selects the requested exact printing', () => {
  const standard = printings.find(p => p.variant.variantName === 'Standard Prestige')!;
  const versions = printings.filter(p => p.card.cardId === standard.card.cardId);
  expect(versions.some(p => p.variant.variantName === 'Foil Prestige')).toBe(true);
  expect(versions.some(p => p.variant.variantName.startsWith('Serialized Prestige'))).toBe(true);
  expect(getSetPrintings(versions, standard.variant.set, 'prestige')).toEqual([standard]);
  for (const [treatment, name] of [
    ['foil-prestige', 'Foil Prestige'],
    ['serialized-prestige', 'Serialized Prestige'],
  ] as const) {
    const results = getSetPrintings(versions, standard.variant.set, 'prestige', treatment);
    expect(results.length).toBeGreaterThan(0);
    expect(results.every(p => p.variant.variantName.startsWith(name))).toBe(true);
  }
});

test('card home chooses newest available sets and group resolution keeps multiple variants in order', () => {
  const sets = getCardHomeSets(cardList);
  expect(sets[0].code).toBe(
    setArraySorted.find(code => getSetPrintings(printings, code, 'all').length > 0)!,
  );
  expect(sets[0].leaders).toEqual(getSetPrintings(printings, sets[0].code, 'leaders'));
  const card = printings.find(p => Object.keys(p.card.variants).length > 1)!.card;
  const ids = Object.keys(card.variants).slice(0, 2).reverse();
  expect(
    resolveCardGroupPrintings(index, [...ids, 'removed-version']).map(p => p.variant.variantId),
  ).toEqual(ids);
  expect(resolveCardGroupPrintings(index, ids).map(p => p.card.cardId)).toEqual([
    card.cardId,
    card.cardId,
  ]);
  expect(getCardHomeSets({})).toEqual([]);
});

test('fresh and layout-only visits show home; submitted searches and filter URLs show results', () => {
  expect(hasCardSearchRequest({})).toBe(false);
  expect(
    hasCardSearchRequest({ sort: 'name', resultsLayout: 'imageBig', uniqueness: 'both' }),
  ).toBe(false);
  expect(hasCardSearchRequest({ csAll: true })).toBe(true);
  expect(hasCardSearchRequest({ name: 'both' })).toBe(true);
  expect(hasCardSearchRequest({ sets: ['hmw'] })).toBe(true);
  expect(hasCardSearchRequest({ sets: [], variants: [] })).toBe(false);
  expect(hasCardSearchRequest({ cost: '0-0' })).toBe(true);
});

test('set tiles show up to three distinct cards from that set, with Hyperspace legendaries for main sets', () => {
  for (const set of getCardHomeSets(cardList)) {
    expect(set.featured.length).toBe(Math.min(3, set.counts.all));
    expect(new Set(set.featured.map(p => p.card.cardId)).size).toBe(set.featured.length);
    for (const { card, variant } of set.featured) {
      expect(variant.set).toBe(set.code);
      if ([SwuSet.IBH, SwuSet.TS26, SwuSet.IC27].includes(set.code)) {
        expect(variant.variantName).toBe('Standard');
        continue;
      }
      expect(card.rarity).toBe(SwuRarity.LEGENDARY);
      expect(variant.variantName).toBe('Hyperspace');
      expect(!variant.hasFoil || variant.hasNonfoil).toBe(true);
    }
  }
});

test('partially imported Icons galleries and artwork include only available standard printings', () => {
  const badFeeling = cardList['i-ve-got-a-bad-feeling']!;
  const jarJar = cardList['jar-jar-binks--bumbling-representative']!;
  const set = getCardHomeSets({
    [badFeeling.cardId]: badFeeling,
    [jarJar.cardId]: jarJar,
  }).find(set => set.code === SwuSet.IC27)!;
  expect(set.counts.all).toBe(2);
  expect(set.leaders).toEqual([]);
  expect(set.featured.map(p => p.card.cardId)).toEqual([
    'i-ve-got-a-bad-feeling',
    'jar-jar-binks--bumbling-representative',
  ]);
  const partialSet = getCardHomeSets({ [jarJar.cardId]: jarJar });
  expect(partialSet).toHaveLength(1);
  expect(partialSet[0].code).toBe(SwuSet.IC27);
  expect(partialSet[0].counts.all).toBe(1);
  expect(partialSet[0].featured.map(p => p.card.cardId)).toEqual([jarJar.cardId]);
});

test('Twin Suns features exclusive rares and Intro Battle features Hoth cards', () => {
  const sets = getCardHomeSets(cardList);
  const twinSuns = sets.find(set => set.code === SwuSet.TS26)!;
  const hoth = sets.find(set => set.code === SwuSet.IBH)!;
  for (const { card } of twinSuns.featured) {
    expect(card.rarity).toBe(SwuRarity.RARE);
    expect(Object.values(card.variants).every(variant => variant.set === SwuSet.TS26)).toBe(true);
  }
  expect(hoth.featured.map(p => p.card.cardId)).toEqual([
    'rogue-squadron-speeder',
    'blizzard-one--veers-at-the-helm',
    'rampaging-wampa',
  ]);
});

test('Homeworlds keeps the requested three Hyperspace legendaries', () => {
  const set = getCardHomeSets(cardList).find(set => set.code === SwuSet.HMW)!;
  const expected = [
    'nightbrother--maul-s-gauntlet',
    'sando-aqua-monster',
    'emperor-palpatine--consolidating-power',
  ];
  expect(set.featured.map(p => p.card.cardId)).toEqual(expected);
});
