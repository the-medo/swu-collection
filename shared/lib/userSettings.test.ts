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

test('calendar week start accepts all seven days and serialized values, while preserving other settings', () => {
  for (let day = 0; day < 7; day++) {
    expect(userSettingsUpdateSchema.parse({ calendarWeekStartsOn: day })).toEqual({
      calendarWeekStartsOn: day,
    });
    expect(userSettingsUpdateSchema.parse({ calendarWeekStartsOn: String(day) })).toEqual({
      calendarWeekStartsOn: day,
    });
  }
  for (const invalid of [null, true, false, -1, 7, 1.5, 'Monday', '', '01'])
    expect(userSettingsUpdateSchema.safeParse({ calendarWeekStartsOn: invalid }).success).toBe(
      false,
    );
  expect(userSettingsUpdateSchema.parse({ deckPrices: true })).toEqual({ deckPrices: true });
});
