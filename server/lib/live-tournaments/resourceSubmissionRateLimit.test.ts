import { expect, test } from 'bun:test';
import { createResourceSubmissionRateLimiter } from './resourceSubmissionRateLimit.ts';

test('bounds user bursts while allowing independent users and later submissions', () => {
  const check = createResourceSubmissionRateLimiter();
  for (let i = 0; i < 20; i++) expect(check('user', 0)).toBe(0);
  expect(check('user', 0)).toBe(600);
  expect(check('user', 599_500)).toBe(1);
  expect(check('other-user', 599_500)).toBe(0);
  expect(check('user', 600_000)).toBe(0);
});

test('bounds memory and recovers capacity after expired buckets are swept', () => {
  const check = createResourceSubmissionRateLimiter();
  for (let i = 0; i < 10_000; i++) check(`user-${i}`, 0);
  expect(check('new-user', 0)).toBe(60);
  expect(check('user-0', 0)).toBe(0);
  expect(check('new-user', 600_000)).toBe(0);
});
