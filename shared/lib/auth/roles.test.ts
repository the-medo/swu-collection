import { expect, test } from 'bun:test';
import { hasCrossfireAccess, userRoles, withCrossfireAccess } from './roles.ts';
import { applicationRoles } from '../../../server/auth/permissions.ts';

test('Crossfire access is independent of existing administrative roles', () => {
  for (const role of [
    undefined,
    null,
    '',
    'user',
    'admin',
    'moderator',
    'organizer',
    'admin,moderator',
    'crossfire-admin',
  ])
    expect(hasCrossfireAccess(role)).toBe(false);
  for (const role of ['crossfire', 'user,crossfire', 'admin,crossfire', 'moderator, crossfire'])
    expect(hasCrossfireAccess(role)).toBe(true);
  expect(userRoles(' admin, crossfire,admin,, ')).toEqual(['admin', 'crossfire']);
  expect(applicationRoles.crossfire.authorize({ crossfire: ['access'] }).success).toBe(true);
  expect(applicationRoles.crossfire.authorize({ user: ['set-role'] }).success).toBe(false);
  expect(applicationRoles.crossfire.authorize({ user: ['ban'] }).success).toBe(false);
  expect(applicationRoles.admin.authorize({ crossfire: ['access'] }).success).toBe(false);
  expect(applicationRoles.admin.authorize({ user: ['set-role'] }).success).toBe(true);
  expect(applicationRoles.moderator.authorize({ user: ['ban'] }).success).toBe(true);
});

test('membership changes preserve other roles and are idempotent', () => {
  expect(withCrossfireAccess(null, true)).toBe('user,crossfire');
  expect(withCrossfireAccess('admin,moderator,future-role', true)).toBe(
    'admin,moderator,future-role,crossfire',
  );
  expect(withCrossfireAccess('admin,crossfire', true)).toBe('admin,crossfire');
  expect(withCrossfireAccess('admin,crossfire,moderator', false)).toBe('admin,moderator');
  expect(withCrossfireAccess('moderator', false)).toBe('moderator');
  expect(withCrossfireAccess('crossfire', false)).toBe('user');
});
