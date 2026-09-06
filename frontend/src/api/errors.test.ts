import { describe, expect, test } from 'bun:test';
import { createApiError } from './errors.ts';

describe('createApiError', () => {
  test('uses a string API message and preserves the status', async () => {
    const error = await createApiError(
      new Response(JSON.stringify({ message: 'Specific failure' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      }),
      'Fallback failure',
    );

    expect(error.message).toBe('Specific failure');
    expect(error.status).toBe(400);
  });

  test('does not stringify structured API errors as object text', async () => {
    const error = await createApiError(
      new Response(JSON.stringify({ error: { issues: [] } }), {
        status: 400,
        statusText: '',
        headers: { 'content-type': 'application/json' },
      }),
      'Fallback failure',
    );

    expect(error.message).toBe('Fallback failure');
  });

  test('also ignores a structured message field', async () => {
    const error = await createApiError(
      new Response(JSON.stringify({ message: { issues: [] } }), {
        status: 400,
        statusText: '',
        headers: { 'content-type': 'application/json' },
      }),
      'Fallback failure',
    );

    expect(error.message).toBe('Fallback failure');
  });
});
