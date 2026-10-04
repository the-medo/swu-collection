import { expect, test } from 'bun:test';
import { assertCardAvatarUpdate } from './avatarPolicy.ts';

test('self-service auth updates cannot bypass card artwork selection', () => {
  for (const image of [
    'https://example.com/custom.png',
    'data:image/png;base64,abc',
    null,
    '',
    undefined,
  ]) {
    expect(() => assertCardAvatarUpdate('/update-user', { image })).toThrow('Choose card artwork');
  }
});

test('display name and other profile fields remain editable', () => {
  expect(() =>
    assertCardAvatarUpdate('/update-user', {
      displayName: 'A player',
      country: 'HU',
      currency: 'EUR',
    }),
  ).not.toThrow();
  expect(() => assertCardAvatarUpdate('/update-user', undefined)).not.toThrow();
});

test('initial provider profile images are unaffected', () => {
  expect(() =>
    assertCardAvatarUpdate('/callback/google', { image: 'https://example.com/provider.png' }),
  ).not.toThrow();
});
