import { expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { decodeArchive, encodeArchive } from '../history/archive.ts';
import { verifyHistory } from '../history/records.ts';
import { historyFixture } from './history-fixture.ts';

function completed() {
  const game = historyFixture();
  game.choose('pass');
  game.undo(0);
  game.choose('take-initiative');
  game.finish();
  return game;
}

test('compressed history keeps abandoned branches, exact receipts and only the initial snapshot', async () => {
  const game = completed();
  const archive = await encodeArchive(game.history);
  const read = await decodeArchive(archive);
  expect(verifyHistory(read).state).toEqual(game.state);
  expect(read.journal.map(e => e.commandId)).toEqual([
    'command-1',
    'undo-2',
    'command-3',
    'command-4',
  ]);
  expect(read.journal[1]!.timeline?.parent).toBe(0);
  expect(read.journal[2]!.timeline?.branch).toBe(2);
  expect(read.checkpoint.checkpoint).toBe(game.history.checkpoint.checkpoint);
  expect(archive.payload.length).toBeLessThan(archive.rawBytes);
});

test('compatible legacy command rows acquire action metadata through verified replay', async () => {
  const game = historyFixture();
  game.choose('pass');
  game.finish();
  for (const entry of game.history.journal) delete entry.timeline;
  const history = await decodeArchive(await encodeArchive(game.history));
  expect(history.journal[0]!.timeline?.action?.start).toBe(0);
  expect(verifyHistory(history).state).toEqual(game.state);
});

test('archive validation rejects changed approvals, action indexes, receipts, hashes and unfinished games', async () => {
  const game = completed();
  for (const change of [
    (h: typeof game.history) => {
      h.journal[1]!.control!.approvedBy = 'alice';
    },
    (h: typeof game.history) => {
      h.journal[1]!.control!.nextId++;
    },
    (h: typeof game.history) => {
      h.journal[2]!.timeline!.branch = 0;
    },
    (h: typeof game.history) => {
      h.journal[3]!.stateHash = '0'.repeat(64);
    },
    (h: typeof game.history) => {
      h.journal[3]!.commandId = h.journal[0]!.commandId;
      h.journal[3]!.actorId = h.journal[0]!.actorId;
    },
  ]) {
    const corrupt = structuredClone(game.history);
    change(corrupt);
    await expect(encodeArchive(corrupt)).rejects.toThrow();
  }
  await expect(encodeArchive(historyFixture().history)).rejects.toThrow('completed game');
});

test('truncated, corrupt, oversized and incompatible envelopes cannot decompress into a history', async () => {
  const archive = await encodeArchive(completed().history);
  await expect(
    decodeArchive({ ...archive, payload: archive.payload.subarray(0, 10) }),
  ).rejects.toThrow();
  await expect(decodeArchive({ ...archive, rawBytes: 65 * 1024 * 1024 })).rejects.toThrow();
  const huge = gzipSync(Buffer.alloc(65 * 1024 * 1024));
  await expect(
    decodeArchive({
      ...archive,
      payload: huge,
      payloadHash: createHash('sha256').update(huge).digest('hex'),
    }),
  ).rejects.toThrow();
  await expect(decodeArchive({ ...archive, format: 2 as 1 })).rejects.toThrow();
});
