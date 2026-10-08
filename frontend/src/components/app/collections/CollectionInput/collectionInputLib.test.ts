import { expect, test } from 'bun:test';
import { getFoilBasedOnVariantAndSet } from './collectionInputLib.ts';
import cards from '../../../../../../server/db/json/card-list.json';
import type { CardListVariants, CardVariant } from '../../../../../../lib/swu-resources/types.ts';
import { setInfo } from '../../../../../../lib/swu-resources/set-info.ts';

const variantRows = Object.values(cards).flatMap(card =>
  Object.values(card.variants).map(variant => ({
    variant,
    siblings: card.variants as CardListVariants,
  })),
);
const variants = variantRows.map(row => row.variant);

test('Storm Raider Weekly Play variants are selectable and get the appropriate foil default', () => {
  const weekly = Object.values(cards['storm-raider'].variants).find(
    variant => variant.variantName === 'Weekly Play',
  )! as CardVariant;
  const foil = Object.values(cards['storm-raider'].variants).find(
    variant => variant.variantName === 'Weekly Play Foil',
  )! as CardVariant;
  const siblings = cards['storm-raider'].variants as CardListVariants;
  expect(getFoilBasedOnVariantAndSet(weekly, false, siblings)).toBe(false);
  expect(getFoilBasedOnVariantAndSet(weekly, true, siblings)).toBe(false);
  expect(getFoilBasedOnVariantAndSet(foil, false, siblings)).toBe(true);
  expect(getFoilBasedOnVariantAndSet(foil, true, siblings)).toBe(true);
});

test('every catalog promo can calculate a foil default without expansion metadata', () => {
  const promos = variantRows.filter(({ variant }) => !setInfo[variant.set as CardVariant['set']]);
  expect(promos.length).toBeGreaterThan(0);
  for (const { variant, siblings } of promos) {
    expect(typeof getFoilBasedOnVariantAndSet(variant as CardVariant, false, siblings)).toBe(
      'boolean',
    );
    expect(typeof getFoilBasedOnVariantAndSet(variant as CardVariant, true, siblings)).toBe(
      'boolean',
    );
  }
});

test('paired OP Promo printings override a foil preference for their non-foil version', () => {
  const row = variantRows.find(
    ({ variant, siblings }) =>
      !setInfo[variant.set as CardVariant['set']] &&
      variant.variantName === 'OP Promo' &&
      Object.values(siblings).some(
        sibling => sibling?.set === variant.set && sibling?.variantName === 'OP Promo Foil',
      ),
  )!;
  expect(row).toBeDefined();
  expect(getFoilBasedOnVariantAndSet(row.variant as CardVariant, true, row.siblings)).toBe(false);
});

test('early expansions retain the chosen foil setting and modern expansions use separate printings', () => {
  const earlyStandard = variants.find(
    variant => variant.set === 'sor' && variant.variantName === 'Standard',
  )!;
  const earlyHyperspace = variants.find(
    variant => variant.set === 'shd' && variant.variantName === 'Hyperspace',
  )!;
  const standard = variants.find(
    variant => variant.set === 'jtl' && variant.variantName === 'Standard',
  )!;
  const foil = variants.find(
    variant => variant.set === 'jtl' && variant.variantName === 'Standard Foil',
  )!;
  const showcase = variants.find(
    variant => variant.set === 'jtl' && variant.variantName === 'Showcase',
  )!;
  for (const variant of [earlyStandard, earlyHyperspace]) {
    expect(getFoilBasedOnVariantAndSet(variant as CardVariant, false)).toBe(false);
    expect(getFoilBasedOnVariantAndSet(variant as CardVariant, true)).toBe(true);
  }
  expect(getFoilBasedOnVariantAndSet(standard as CardVariant, true)).toBe(false);
  expect(getFoilBasedOnVariantAndSet(foil as CardVariant, false)).toBe(true);
  expect(getFoilBasedOnVariantAndSet(showcase as CardVariant, false)).toBe(true);
});

test('an unknown promo set keeps the chosen foil preference unless the printing explicitly says foil', () => {
  const standard = variants.find(variant => variant.variantName === 'Standard')!;
  const promo = {
    ...standard,
    set: 'future-promo',
    variantName: 'Sector Qualifier',
  } as unknown as CardVariant;
  expect(getFoilBasedOnVariantAndSet(promo, false)).toBe(false);
  expect(getFoilBasedOnVariantAndSet(promo, true)).toBe(true);
  expect(
    getFoilBasedOnVariantAndSet({ ...promo, variantName: 'Sector Qualifier Foil' }, false),
  ).toBe(true);
  const counterpart = {
    ...promo,
    variantId: 'foil-printing',
    variantName: 'Sector Qualifier Foil',
  };
  expect(getFoilBasedOnVariantAndSet(promo, true, { promo, counterpart })).toBe(false);
  expect(
    getFoilBasedOnVariantAndSet(promo, true, {
      promo,
      counterpart: { ...counterpart, set: 'another-promo' as CardVariant['set'] },
    }),
  ).toBe(true);
});
