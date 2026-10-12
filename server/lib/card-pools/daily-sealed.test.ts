import { describe, expect, test } from 'bun:test';
import { getDailySealedDate, dailySealedDateSchema } from '../../../shared/types/dailySealed.ts';
import { resolveDailySealedSet } from './daily-sealed.ts';
import { SwuSet } from '../../../types/enums.ts';
import { applicationConfigurationPatchSchema } from '../../../shared/lib/application-configuration/applicationConfiguration.ts';
import { userSettingsSchema, userSettingsUpdateSchema } from '../../../shared/lib/userSettings.ts';

describe('daily sealed date and set selection', () => {
  test('uses the same UTC day for visitors and the cron across timezone boundaries', () => {
    expect(getDailySealedDate(new Date('2026-10-10T01:30:00+02:00'))).toBe('2026-10-09');
    expect(getDailySealedDate(new Date('2026-10-10T00:30:00Z'))).toBe('2026-10-10');
    expect(dailySealedDateSchema.safeParse('2026-02-30').success).toBe(false);
    expect(dailySealedDateSchema.safeParse('2026-10-10T00:00:00Z').success).toBe(false);
  });

  test('selects the newest supported released set on the challenge date', () => {
    expect(resolveDailySealedSet('2026-10-01')).toBe(SwuSet.ASH);
    expect(resolveDailySealedSet('2026-10-02')).toBe(SwuSet.HMW);
    expect(resolveDailySealedSet('2026-10-10', ' HMW ')).toBe(SwuSet.HMW);
    expect(resolveDailySealedSet('2026-10-10', 'law')).toBe(SwuSet.LAW);
    expect(() => resolveDailySealedSet('2026-10-01', 'hmw')).toThrow('has not been released');
    expect(() => resolveDailySealedSet('2026-10-10', 'sor')).toThrow('not supported');
    expect(() => resolveDailySealedSet('2026-10-10', 'invalid')).toThrow();
    expect(() => resolveDailySealedSet('2020-01-01')).toThrow('No supported released set');
  });
});

test('Today works in application and serialized user preferences without resetting unrelated settings', () => {
  expect(applicationConfigurationPatchSchema.parse({ homepageMode: 'today' })).toEqual({
    homepageMode: 'today',
  });
  const original = { ...userSettingsSchema.parse({}), deckPrices: true, calendarWeekStartsOn: 6 };
  const updated = { ...original, ...userSettingsUpdateSchema.parse({ homepageMode: 'today' }) };
  expect(updated).toEqual({ ...original, homepageMode: 'today' });
  expect(userSettingsSchema.parse(updated).homepageMode).toBe('today');
});
