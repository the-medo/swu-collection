import { expect, test } from 'bun:test';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { Connect, ViteDevServer } from 'vite';
import { crossfireTrainingPlugin } from './crossfire-training-plugin.ts';
import { TrainingReader } from './crossfire-training-reader.ts';
import { trainingRuns } from './crossfire-training-runs.ts';
import { trainingDecks } from '../../shared/types/crossfire-training.ts';

test('deck preparation validates origin, token, archetypes, deck revision and forwards only authenticated cookie context', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'crossfire-add-deck-'));
  const deckId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const hash = 'c'.repeat(64);
  const calls: { kind: string; input: unknown }[] = [];
  const plugin = crossfireTrainingPlugin(root, async (_root, kind, input) => {
    calls.push({ kind, input });
    return kind === 'inspect'
      ? {
          ok: true,
          inspection: {
            ready: true,
            contentHash: hash,
            name: 'New deck',
            leaderName: 'New leader',
          },
          snapshot: { contentHash: hash },
        }
      : {
          ok: true,
          run: 'specialists-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          revision: 'd'.repeat(64),
        };
  });
  let handler: Connect.NextHandleFunction;
  const hook = plugin.configureServer;
  if (typeof hook !== 'function') throw new Error('Missing middleware');
  await hook.call(
    {} as ThisParameterType<typeof hook>,
    {
      middlewares: {
        use: (h: Connect.NextHandleFunction) => {
          handler = h;
        },
      },
    } as ViteDevServer,
  );
  const server = createServer((req, res) =>
    handler(req, res, () => {
      res.statusCode = 404;
      res.end();
    }),
  );
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No listener');
  const base = `http://127.0.0.1:${address.port}`;
  try {
    const runs = await (await fetch(`${base}/__crossfire-training/runs`)).json();
    const headers = {
      Origin: base,
      'Content-Type': 'application/json',
      'X-Crossfire-Training-Token': runs.mutationToken,
      Cookie: 'test-cookie',
    };
    const post = (endpoint: string, data: unknown, h = headers) =>
      fetch(`${base}/__crossfire-training/decks/${endpoint}`, {
        method: 'POST',
        headers: h,
        body: JSON.stringify(data),
      });
    expect(
      (await post('inspect', { deckId }, { ...headers, Origin: 'https://other.example' })).status,
    ).toBe(403);
    expect(
      (await post('inspect', { deckId }, { ...headers, 'X-Crossfire-Training-Token': 'wrong' }))
        .status,
    ).toBe(403);
    expect((await post('inspect', { deckId, userId: 'someone-else' })).status).toBe(400);
    expect((await post('inspect', { deckId: '../../etc/passwd' })).status).toBe(400);
    expect(calls.length).toBe(0);
    expect((await post('inspect', { deckId })).status).toBe(200);
    expect(calls[0]).toEqual({ kind: 'inspect', input: { deckId, cookie: 'test-cookie' } });
    const add = {
      deckId,
      requestId: deckId,
      revision: runs.revision,
      contentHash: hash,
      archetypes: ['ramp', 'control'],
    };
    expect((await post('add', { ...add, archetypes: [] })).status).toBe(400);
    expect((await post('add', { ...add, archetypes: ['invented'] })).status).toBe(400);
    expect((await post('add', { ...add, archetypes: ['ramp', 'ramp'] })).status).toBe(400);
    expect((await post('add', { ...add, contentHash: 'b'.repeat(64) })).status).toBe(409);
    expect(calls.filter(c => c.kind === 'add')).toHaveLength(0);
    expect((await post('add', add)).status).toBe(201);
    expect(calls.at(-1)?.input).toMatchObject({
      ...add,
      name: 'New deck',
      leaderName: 'New leader',
    });
    expect(calls.at(-1)?.input).not.toHaveProperty('cookie');
    // A committed request must stay retryable even if its source deck changes
    // or becomes inaccessible before the browser receives the original reply.
    const artifacts = path.join(root, '.swubase/crossfire-ai');
    await mkdir(artifacts, { recursive: true });
    const id = `specialists-${add.requestId}`;
    const requestHash = createHash('sha256')
      .update(
        JSON.stringify({
          archetypes: add.archetypes,
          contentHash: add.contentHash,
          deckId: add.deckId,
          revision: add.revision,
        }),
      )
      .digest('hex');
    await writeFile(
      path.join(artifacts, 'training-runs.json'),
      JSON.stringify({
        version: 1,
        activeRun: id,
        runs: [{ id, label: 'New deck', requestHash }],
      }),
    );
    calls.length = 0;
    const retry = await post('add', add);
    expect(retry.status).toBe(200);
    expect(await retry.json()).toMatchObject({
      run: id,
      revision: (await trainingRuns(root)).revision,
    });
    expect((await post('add', { ...add, archetypes: ['aggro'] })).status).toBe(409);
    expect(calls).toHaveLength(0);
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
    await rm(root, { recursive: true, force: true });
  }
});

test('expanded history resolves deck indices using that run and registry permits only published runs', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'crossfire-run-roster-'));
  const id = 'specialists-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const artifacts = path.join(root, '.swubase/crossfire-ai');
  const run = path.join(artifacts, id);
  try {
    await mkdir(path.join(run, 'batches'), { recursive: true });
    const put = (name: string, data: unknown) =>
      writeFile(path.join(run, name), JSON.stringify(data));
    const decks = [
      ...trainingDecks.map(d => ({ key: d.key, label: d.name })),
      { key: 'dooku', label: 'Dooku control' },
    ];
    const counts = { completed: 1000, winsA: 400, winsB: 600, draws: 0, cutoffs: 0 };
    const batch = {
      ...counts,
      block: 0,
      cycle: 1,
      deckKeys: ['greef', 'dooku'],
      mirror: false,
      startedAtUtc: '2026-09-24T00:00:00Z',
      finishedAtUtc: '2026-09-24T00:10:00Z',
      evaluation: {
        complete: true,
        byDeckIndex: { 6: { completed: 20, wins: 13, losses: 7, draws: 0, cutoffs: 0 } },
      },
    };
    await put('latest-model.json', {
      games: 1000,
      updates: 4,
      parameters: 400000,
      sha256: 'b'.repeat(64),
      contract: { decks },
    });
    await put('status.json', { status: 'stopped', games: 1000, lastCompletedBatch: { block: 0 } });
    await put('batches/00000000.json', batch);
    const reader = new TrainingReader(run);
    expect((await reader.status()).decks?.at(-1)).toMatchObject({
      key: 'dooku',
      name: 'Dooku control',
    });
    expect((await reader.history()).batches[0]?.evaluation.dooku?.wins).toBe(13);
    await writeFile(
      path.join(artifacts, 'training-runs.json'),
      JSON.stringify({
        version: 1,
        activeRun: id,
        runs: [{ id, label: '7 decks · Dooku', requestHash: 'a'.repeat(64) }],
      }),
    );
    expect((await trainingRuns(root)).activeRun).toBe(id);
    await writeFile(
      path.join(artifacts, 'training-runs.json'),
      JSON.stringify({ version: 1, activeRun: '../secret', runs: [] }),
    );
    await expect(trainingRuns(root)).rejects.toThrow();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
