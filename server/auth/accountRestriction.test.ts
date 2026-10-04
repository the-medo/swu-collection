import { expect, test } from 'bun:test';
import { hasActiveAccountRestriction } from './accountRestriction.ts';
import { applicationRoles } from './permissions.ts';
test('only active indefinite bans and unexpired suspensions restrict accounts', () => {
  const now = Date.now();
  expect(hasActiveAccountRestriction(null, now)).toBe(false);
  expect(hasActiveAccountRestriction({ banned: false }, now)).toBe(false);
  expect(hasActiveAccountRestriction({ banned: true, banExpires: null }, now)).toBe(true);
  expect(hasActiveAccountRestriction({ banned: true, banExpires: new Date(now + 1000) }, now)).toBe(
    true,
  );
  expect(hasActiveAccountRestriction({ banned: true, banExpires: new Date(now - 1000) }, now)).toBe(
    false,
  );
  expect(
    hasActiveAccountRestriction({ banned: true, banExpires: new Date(now).toISOString() }, now),
  ).toBe(false);
});
test('only admin roles have the legacy Better Auth ban permission', () => {
  for (const role of ['user', 'organizer', 'moderator', 'crossfire'] as const)
    expect(applicationRoles[role].authorize({ user: ['ban'] }).success).toBe(false);
  expect(applicationRoles.admin.authorize({ user: ['ban'] }).success).toBe(true);
});
