import { expect, test } from 'bun:test';
import { APIError } from 'better-auth/api';
import { auth } from './auth.ts';
import { validateDisplayName } from './displayNamePolicy.ts';

test('both auth persistence hooks enforce display-name policy', async () => {
  for (const operation of ['create', 'update'] as const) {
    const before = auth.options.databaseHooks!.user![operation]!.before!;
    expect(before).toBe(validateDisplayName);
    try {
      await validateDisplayName({ displayName: 'f.u.c.k' });
      throw new Error('Expected validation to reject the name.');
    } catch (error) {
      expect(error).toBeInstanceOf(APIError);
      expect((error as APIError).status).toBe('BAD_REQUEST');
      expect((error as APIError).body?.code).toBe('PROFANITY_NOT_ALLOWED');
    }
  }
});

test('safe names and unrelated auth updates are unaffected', async () => {
  await expect(validateDisplayName({ displayName: 'Dooku Assassin' })).resolves.toBeUndefined();
  await expect(
    validateDisplayName({ name: 'fuck', displayName: 'A generated player' }),
  ).resolves.toBeUndefined();
  await expect(validateDisplayName({})).resolves.toBeUndefined();
});
