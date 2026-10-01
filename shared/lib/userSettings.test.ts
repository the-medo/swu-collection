import { describe, expect, test } from 'bun:test';
import {
  featureSettingsSchema,
  sidebarSettingsSchema,
  userSettingsSchema,
  userSettingsUpdateSchema,
} from './userSettings.ts';

test('attachment feature defaults on and a serialized toggle preserves unrelated preferences', () => {
  expect(featureSettingsSchema.parse({})).toEqual({ use_tournament_attachments: true });
  expect(featureSettingsSchema.parse({ use_tournament_attachments: 'false' })).toEqual({
    use_tournament_attachments: false,
  });
  expect(userSettingsUpdateSchema.parse({ use_tournament_attachments: false })).toEqual({
    use_tournament_attachments: false,
  });
  expect(userSettingsUpdateSchema.safeParse({ use_tournament_attachments: 'yes' }).success).toBe(
    false,
  );
});

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

test('sidebar preferences default and round-trip through text storage', () => {
  expect(sidebarSettingsSchema.parse({})).toEqual({
    left_sidebar_collections_and_lists: true,
    left_sidebar_my_tournaments: true,
    left_sidebar_my_tournaments_days_before: 3,
    left_sidebar_my_tournaments_days_after: 30,
  });
  const update = {
    left_sidebar_collections_and_lists: false,
    left_sidebar_my_tournaments: false,
    left_sidebar_my_tournaments_days_before: 0,
    left_sidebar_my_tournaments_days_after: 90,
  };
  const serialized = Object.fromEntries(
    Object.entries(update).map(([key, value]) => [key, String(value)]),
  );
  expect(sidebarSettingsSchema.parse(serialized)).toEqual(update);
  expect(userSettingsUpdateSchema.parse(serialized)).toEqual(update);
  const stored = { ...userSettingsSchema.parse({}), deckPrices: true, calendarWeekStartsOn: 6 };
  Object.assign(stored, userSettingsUpdateSchema.parse({ left_sidebar_my_tournaments: false }));
  expect(stored.deckPrices).toBe(true);
  expect(stored.calendarWeekStartsOn).toBe(6);
  expect(stored.left_sidebar_my_tournaments_days_before).toBe(3);
  expect(stored.left_sidebar_my_tournaments_days_after).toBe(30);
  expect(stored.left_sidebar_collections_and_lists).toBe(true);
  Object.assign(
    stored,
    userSettingsUpdateSchema.parse({ left_sidebar_collections_and_lists: false }),
  );
  expect(stored.left_sidebar_collections_and_lists).toBe(false);
  expect(stored.left_sidebar_my_tournaments).toBe(false);
  expect(stored.left_sidebar_my_tournaments_days_after).toBe(30);
  expect(userSettingsUpdateSchema.parse({ left_sidebar_my_tournaments_days_before: 0 })).toEqual({
    left_sidebar_my_tournaments_days_before: 0,
  });
});

test('sidebar day counts reject malformed, negative and fractional values', () => {
  for (const key of [
    'left_sidebar_my_tournaments_days_before',
    'left_sidebar_my_tournaments_days_after',
  ]) {
    for (const value of [null, true, false, -1, 1.5, '', ' ', '3days', '1.5', 3651, Infinity]) {
      expect(userSettingsUpdateSchema.safeParse({ [key]: value }).success).toBe(false);
    }
  }
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
