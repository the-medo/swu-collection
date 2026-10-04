import { expect, test } from 'bun:test';
import { readUserFileBody } from './body.ts';
import { maxUserFileBytes } from '../../../types/UserFile.ts';

test('reads multipart bodies without trusting Content-Length', async () => {
  const request = new Request('http://localhost/upload', { method: 'POST', body: 'image bytes' });
  expect(new TextDecoder().decode(await readUserFileBody(request))).toBe('image bytes');
  let cancelled = false;
  const oversized = new Request('http://localhost/upload', {
    method: 'POST',
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(maxUserFileBytes + 65537));
      },
      cancel() {
        cancelled = true;
      },
    }),
  });
  await expect(readUserFileBody(oversized)).rejects.toMatchObject({ status: 413 });
  expect(cancelled).toBe(true);
});

test('cancels stalled clients at the deadline and can read subsequent uploads', async () => {
  let cancelled = false;
  const stalled = new Request('http://localhost/upload', {
    method: 'POST',
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array([1]));
      },
      cancel() {
        cancelled = true;
      },
    }),
  });
  await expect(readUserFileBody(stalled, 10)).rejects.toMatchObject({ status: 408 });
  expect(cancelled).toBe(true);
  expect(
    await readUserFileBody(new Request('http://localhost/upload', { method: 'POST', body: 'OK' })),
  ).toHaveLength(2);
});
