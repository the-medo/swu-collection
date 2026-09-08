import { describe, expect, test } from 'bun:test';
import { userSettingsUpdateSchema } from './userSettings.ts';

describe('user settings updates', () => {
  test('preserves omitted settings across consecutive development-sharing updates', () => {
    const storedSettings = {
      deckPrices: true,
      share_development_data: false,
      share_development_data_matches: false,
    };

    Object.assign(storedSettings, userSettingsUpdateSchema.parse({ share_development_data: true }));
    Object.assign(
      storedSettings,
      userSettingsUpdateSchema.parse({ share_development_data_matches: true }),
    );

    expect(storedSettings).toEqual({
      deckPrices: true,
      share_development_data: true,
      share_development_data_matches: true,
    });
  });

  test('parses supplied values without materializing defaults for omitted keys', () => {
    expect(
      userSettingsUpdateSchema.parse({
        deckPrices: 'true',
        deckImage_exportWidth: '2400',
        homepageMode: 'live',
        priceSourceTypeCollection: null,
      }),
    ).toEqual({
      deckPrices: true,
      deckImage_exportWidth: 2400,
      homepageMode: 'live',
      priceSourceTypeCollection: null,
    });
  });

  test('rejects unknown keys and invalid values', () => {
    expect(() => userSettingsUpdateSchema.parse({ unknownSetting: true })).toThrow();
    expect(() => userSettingsUpdateSchema.parse({ deckPrices: 'yes' })).toThrow();
  });
});
