import { describe, expect, test } from 'bun:test';
import { SwuAspect, SwuSet } from '../../../types/enums.ts';
import {
  assertSafeRemoteUrl,
  buildImportedPreviewCard,
  createKarabastInternalCardId,
  extractSourceVariables,
  stripPairedFormattingTags,
  zPreviewCardImportDefinition,
} from './previewCardImport.ts';

const definition = zPreviewCardImportDefinition.parse({
  sourceUrlTemplate: 'https://cards.example/card/{expansionAbbreviation}/{cardNumber}',
  request: { url: 'https://cards.example/api/card', method: 'POST' },
  mappings: {
    aspects: { 1: 'Aggression', 3: 'Cunning', 6: 'Villainy' },
  },
  template: {
    cardId: { $template: '{cardName}, {title}', $transforms: ['cardId'] },
    title: { $source: 'cardName' },
    subtitle: { $source: 'title' },
    name: { $template: '{cardName}, {title}' },
    hp: { $source: 'hitPoints' },
    power: { $source: 'power' },
    upgradeHp: { $source: 'hitPointBonus' },
    upgradePower: { $source: 'powerBonus' },
    text: { $source: 'frontAbilityText', $transforms: ['stripPairedTags'] },
    deployBox: { $source: 'backAbilityText', $transforms: ['stripPairedTags'] },
    aspects: { $source: 'aspects', $map: 'aspects' },
    type: { $source: 'cardTypeDescription' },
    cost: { $source: 'cost' },
    traits: { $source: 'traits' },
    arenas: { $source: 'arenaDescription', $array: true },
    rarity: { $value: 'Common' },
    set: { $variable: 'expansionAbbreviation', $transforms: ['lowercase'] },
    variants: {
      '{cardId}-preview-standard': {
        variantId: { $template: '{cardId}-preview-standard' },
        swuId: { $value: 0 },
        set: { $variable: 'expansionAbbreviation', $transforms: ['lowercase'] },
        cardNo: { $variable: 'cardNumber', $transforms: ['integer'] },
        baseSet: { $value: true },
        hasNonfoil: { $value: true },
        hasFoil: { $value: false },
        variantName: { $value: 'Standard' },
        artist: { $source: 'artistName' },
        preview: { $value: true },
        front: { horizontal: { $value: false } },
      },
    },
  },
});

describe('preview card external import', () => {
  test('extracts named variables from a source URL template', () => {
    expect(
      extractSourceVariables(definition.sourceUrlTemplate, 'https://cards.example/card/HMW/215'),
    ).toEqual({ expansionAbbreviation: 'HMW', cardNumber: '215' });
  });

  test('removes only paired formatting tags', () => {
    expect(stripPairedFormattingTags('{p}{b}Action [{T}]:{/b} Do a thing.{/p}')).toBe(
      'Action [{T}]: Do a thing.',
    );
  });

  test('builds Karabast IDs using the backend card-name convention', () => {
    expect(createKarabastInternalCardId('Bossk', 'Cruel Hunter')).toBe(
      'bossk#cruel-hunter-id',
    );
    expect(createKarabastInternalCardId('L3-37', "We're Programmed To Learn")).toBe(
      'l337#were-programmed-to-learn-id',
    );
    expect(createKarabastInternalCardId('Chirrut Îmwe')).toBe('chirrut-imwe-id');
  });

  test('rejects local and private remote destinations', async () => {
    await expect(assertSafeRemoteUrl('http://cards.example/api')).rejects.toThrow('HTTPS');
    await expect(assertSafeRemoteUrl('https://127.0.0.1/api')).rejects.toThrow('Private');
    await expect(assertSafeRemoteUrl('https://[::ffff:127.0.0.1]/api')).rejects.toThrow('Private');
  });

  test('maps response data into a validated preview payload', () => {
    const result = buildImportedPreviewCard(definition, 'https://cards.example/card/HMW/15', {
      cardName: 'Bossk',
      title: 'Cruel Hunter',
      hitPoints: 5,
      power: 4,
      hitPointBonus: null,
      powerBonus: null,
      frontAbilityText: '{p}{b}Action [{T}]:{/b} Heal 1 damage.{/p}',
      backAbilityText: '{p}{b}On Attack:{/b} Deal 2 damage.{/p}',
      aspects: [3, 6],
      cardTypeDescription: 'Leader',
      cost: 5,
      traits: ['Underworld', 'Bounty Hunter'],
      arenaDescription: 'Ground',
      artistName: 'Kyle Petchock',
    });

    expect(result.payload.cardId).toBe('bossk--cruel-hunter');
    expect(result.payload.text).toBe('Action [{T}]: Heal 1 damage.');
    expect(result.payload.aspects).toEqual([SwuAspect.CUNNING, SwuAspect.VILLAINY]);
    expect(result.payload.set).toBe(SwuSet.HMW);
    expect(result.payload.karabast_id).toBe('HMW_015');
    expect(result.payload.karabast_id_to_swubase_id).toBe('bossk#cruel-hunter-id');
    expect(result.payload.variants['bossk--cruel-hunter-preview-standard']).toMatchObject({
      fullSetName: 'Homeworlds',
      cardNo: 15,
      artist: 'Kyle Petchock',
    });
  });

  test('preserves Karabast IDs explicitly supplied by a definition', () => {
    const result = buildImportedPreviewCard(
      {
        ...definition,
        template: {
          ...definition.template,
          karabast_id: { $value: 'CUSTOM_001' },
          karabast_id_to_swubase_id: { $value: 'custom-internal-id' },
        },
      },
      'https://cards.example/card/HMW/215',
      {
        cardName: 'Bossk',
        title: 'Cruel Hunter',
        hitPoints: 5,
        power: 4,
        hitPointBonus: null,
        powerBonus: null,
        frontAbilityText: '',
        backAbilityText: '',
        aspects: [3, 6],
        cardTypeDescription: 'Leader',
        cost: 5,
        traits: [],
        arenaDescription: 'Ground',
        artistName: '',
      },
    );

    expect(result.payload.karabast_id).toBe('CUSTOM_001');
    expect(result.payload.karabast_id_to_swubase_id).toBe('custom-internal-id');
  });
});
