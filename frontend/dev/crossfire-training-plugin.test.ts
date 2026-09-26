import { expect, test } from 'bun:test';
import { createServer } from 'node:http';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { Connect, ViteDevServer } from 'vite';
import { crossfireTrainingPlugin } from './crossfire-training-plugin.ts';

test('development endpoint is read-only, validates cursors and never exposes arbitrary files', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'crossfire-dashboard-http-'));
  let handler: Connect.NextHandleFunction | undefined;
  const plugin = crossfireTrainingPlugin(root);
  expect(plugin.apply).toBe('serve');
  const hook = plugin.configureServer;
  if (typeof hook !== 'function') throw new Error('Missing development middleware');
  await hook.call(
    {} as ThisParameterType<typeof hook>,
    {
      middlewares: {
        use: (value: Connect.NextHandleFunction) => {
          handler = value;
        },
      },
    } as unknown as ViteDevServer,
  );
  const server = createServer((req, res) =>
    handler!(req, res, () => {
      res.statusCode = 404;
      res.end();
    }),
  );
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing test listener');
  const base = `http://127.0.0.1:${address.port}`;
  try {
    const result = await fetch(`${base}/__crossfire-training/status`);
    expect(result.status).toBe(200);
    expect(result.headers.get('cache-control')).toBe('no-store');
    expect(result.headers.get('access-control-allow-origin')).toBeNull();
    expect(await result.json()).toMatchObject({ state: 'unavailable' });
    expect(
      (await fetch(`${base}/__crossfire-training/status`, { headers: { Origin: base } })).status,
    ).toBe(200);
    expect(
      (
        await fetch(`${base}/__crossfire-training/status`, {
          headers: { Origin: 'https://other.example' },
        })
      ).status,
    ).toBe(403);
    expect(
      (await fetch(`${base}/__crossfire-training/status`, { headers: { Origin: 'malformed' } }))
        .status,
    ).toBe(403);
    expect((await fetch(`${base}/__crossfire-training/status`, { method: 'POST' })).status).toBe(
      405,
    );
    expect((await fetch(`${base}/__crossfire-training/history?before=-1`)).status).toBe(400);
    expect((await fetch(`${base}/__crossfire-training/history?before=hello`)).status).toBe(400);
    expect((await fetch(`${base}/__crossfire-training/history?before=1&before=2`)).status).toBe(
      400,
    );
    expect((await fetch(`${base}/__crossfire-training/history?run=../../secret`)).status).toBe(400);
    expect((await fetch(`${base}/__crossfire-training/checkpoint-0.pt`)).status).toBe(404);
    expect(
      (await fetch(`${base}/__crossfire-training/status?run=specialists&run=legacy`)).status,
    ).toBe(400);
    expect((await fetch(`${base}/__crossfire-training/status?run=unknown`)).status).toBe(400);
    expect((await fetch(`${base}/__crossfire-training/status?before=1`)).status).toBe(400);
    const run = path.join(root, '.swubase/crossfire-ai/league-run-01');
    await mkdir(run, { recursive: true });
    await writeFile(
      path.join(run, 'status.json'),
      JSON.stringify({ status: 'stopped', games: 1200000 }),
    );
    const specialists = path.join(root, '.swubase/crossfire-ai/specialists-run-01');
    await mkdir(specialists, { recursive: true });
    await writeFile(
      path.join(specialists, 'status.json'),
      JSON.stringify({ status: 'ready', games: 0 }),
    );
    expect(
      await (await fetch(`${base}/__crossfire-training/status?run=specialists`)).json(),
    ).toMatchObject({ state: 'ready', games: 0 });
    expect(
      await (await fetch(`${base}/__crossfire-training/status?run=legacy`)).json(),
    ).toMatchObject({ state: 'stopped', games: 1200000 });
    expect(
      await (await fetch(`${base}/__crossfire-training/history?run=specialists&before=5`)).json(),
    ).toEqual({ batches: [], nextBefore: null });
    await writeFile(path.join(run, 'status.json'), '{bad private json');
    const unavailable = await fetch(`${base}/__crossfire-training/status`);
    expect(unavailable.status).toBe(503);
    const body = await unavailable.text();
    expect(body).not.toContain(root);
    expect(body).not.toContain('private json');
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
    await rm(root, { recursive: true, force: true });
  }
});
