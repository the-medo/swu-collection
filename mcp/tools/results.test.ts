import { expect, spyOn, test } from 'bun:test';
import { z } from 'zod';
import { CreatorError } from '../../server/lib/creators/errors.ts';
import { MeleeConnectionError } from '../../server/lib/melee/profile.ts';
import { UserFileError } from '../../server/lib/user-files/errors.ts';
import { ProfanityError } from '../../server/lib/moderation/content.ts';
import { ToolFailure, toolException, toolFailure, toolSuccess } from './results.ts';

test('domain errors distinguish access, missing resources, conflicts and retryable failures', () => {
  for (const [error, code, status, retryable] of [
    [new CreatorError('Sign in.', 401), 'unauthenticated', 401, false],
    [new CreatorError('Access denied.', 403), 'forbidden', 403, false],
    [new CreatorError('Unavailable article.', 404), 'not_found', 404, false],
    [new CreatorError('Stale revision.', 409), 'conflict', 409, false],
    [new MeleeConnectionError('Refresh cooldown.', 429), 'rate_limited', 429, true],
    [new MeleeConnectionError('Upstream unavailable.', 502), 'unavailable', 502, true],
    [new CreatorError('Catalog unavailable.', 503), 'unavailable', 503, true],
    [new UserFileError('Quota exceeded.', 413), 'too_large', 413, false],
    [new UserFileError('Upload timed out.', 408), 'timeout', 408, true],
    [new ToolFailure('Timed out.', 504), 'timeout', 504, true],
    [new ProfanityError('title', 'Title'), 'invalid_request', 400, false],
  ] as const) {
    const result = toolException(error);
    expect(result).toMatchObject({
      isError: true,
      structuredContent: { code, status, message: error.message, retryable },
    });
    expect(result.content).toEqual([{ type: 'text', text: error.message }]);
  }
  expect(toolFailure('Rate limit reached.', 429, 60).structuredContent).toEqual({
    code: 'rate_limited',
    status: 429,
    message: 'Rate limit reached.',
    retryable: true,
    retryAfterSeconds: 60,
  });
});

test('unexpected failures never expose exception contents in responses or logs', () => {
  const log = spyOn(console, 'error').mockImplementation(() => {});
  try {
    const result = toolException(new Error('SQL insert body=PRIVATE_ARTICLE token=SECRET'));
    expect(result).toMatchObject({
      isError: true,
      structuredContent: { code: 'unavailable', status: 503, retryable: true },
    });
    expect(JSON.stringify(result)).not.toContain('PRIVATE_ARTICLE');
    expect(JSON.stringify(result)).not.toContain('SECRET');
    expect(log).toHaveBeenCalledWith('[mcp] Tool execution failed.');
    expect(log).toHaveBeenCalledTimes(1);
  } finally {
    log.mockRestore();
  }
});

test('validation issues are bounded and successful output is serialized once with a byte limit', () => {
  const parsed = z
    .object({ values: z.array(z.number()) })
    .safeParse({ values: Array(20).fill('secret input') });
  if (parsed.success) throw new Error('Expected invalid input');
  const result = toolException(parsed.error);
  expect(result.structuredContent).toMatchObject({
    code: 'validation_error',
    status: 400,
    retryable: false,
  });
  expect(result.structuredContent.issues).toHaveLength(10);
  expect(JSON.stringify(result)).not.toContain('secret input');
  let calls = 0;
  const data = {
    toJSON() {
      calls++;
      return { body: 'valid' };
    },
  };
  expect(toolSuccess(data).content[0]!.text).toBe('{"body":"valid"}');
  expect(calls).toBe(1);
  try {
    toolSuccess({ body: 'é'.repeat(350_000) });
    throw new Error('Expected byte limit');
  } catch (error) {
    expect(toolException(error).structuredContent).toMatchObject({
      code: 'too_large',
      status: 413,
      retryable: false,
    });
  }
});
