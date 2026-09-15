import { Projector } from '../projection/projector.ts';
import { gunzipSync } from 'node:zlib';
import { deliverCrossfireReports } from '../../server/lib/discord/crossfireReports.ts';
import { CrossfireChat } from '../../server/lib/crossfire/chat.ts';
import { CrossfirePractice } from '../../server/lib/crossfire/practice.ts';
import { CrossfireBookmarks } from '../../server/lib/crossfire/bookmarks.ts';
import { afterAll, expect, test } from 'bun:test';
import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import { CrossfireConnections } from '../../server/lib/crossfire/connections.ts';
import { CrossfireUndo } from '../../server/lib/crossfire/undo.ts';
import { PostgresGameStore } from '../storage/postgres.ts';
import { DurableGame } from '../host/durable-game.ts';
import { ReplayService } from '../history/replay-service.ts';
import { encodeArchive } from '../history/archive.ts';
import { verifyHistory } from '../history/records.ts';
import { scenario } from '../testing/scenario.ts';
import { choose, ids } from '../testing/helpers.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
const url = process.env.CROSSFIRE_TEST_DATABASE_URL;
if (!url || new URL(url).hostname !== '127.0.0.1' || !new URL(url).pathname.startsWith('/swubase_'))
  throw new Error('Local worktree DB required');
const sql = postgres(url, { max: 4 }),
  store = new PostgresGameStore(sql),
  undo = new CrossfireUndo(sql);
const origin = 'http://localhost:5174',
  connections = new CrossfireConnections(sql, origin),
  replays = new ReplayService(url);
const users: string[] = [],
  games: string[] = [];
afterAll(async () => {
  await replays.stop();
  await sql`DELETE FROM play.games WHERE id = ANY(${games})`;
  await sql`DELETE FROM session WHERE user_id = ANY(${users})`;
  await sql`DELETE FROM "user" WHERE id = ANY(${users})`;
  await sql.end();
});
async function fixture() {
  const gameId = `undo-${randomUUID()}`,
    lobbyId = randomUUID();
  games.push(gameId);
  const principals = [0, 1].map(n => ({ userId: `${gameId}-${n}`, sessionId: randomUUID() }));
  for (const p of principals) {
    users.push(p.userId);
    await sql`INSERT INTO "user" (id,name,email,email_verified,created_at,updated_at,display_name,currency, role) VALUES (${p.userId},'Undo fixture',${p.userId + '@invalid.local'},false,now(),now(),${p.userId},'USD', 'crossfire')`;
    await sql`INSERT INTO session (id,token,expires_at,user_id,created_at,updated_at) VALUES (${p.sessionId},${randomUUID()},now()+interval '1 hour',${p.userId},now(),now())`;
  }
  const initial = scenario({
    gameId,
    activePlayer: 'p1',
    initiative: { holder: 'p1' },
    players: [
      {
        id: 'p1',
        base: { card: ids.base },
        leader: { card: ids.leader },
        hand: [{ card: 'kelleran-beq--the-sabered-hand' }],
        resources: Array.from({ length: 12 }, () => ({ card: ids.marine })),
        deck: [
          { card: 'desert-sharpshooter', ref: 'found' },
          ...Array.from({ length: 12 }, () => ({ card: ids.marine })),
        ],
      },
      {
        id: 'p2',
        base: { card: ids.base },
        leader: { card: ids.leader },
        ground: [{ card: ids.marine, ref: 'target' }],
      },
    ],
    attachments: [{ card: 'experience', unit: 'target' }],
  });
  await store.create(encodeState(initial.state));
  await sql`INSERT INTO play.lobbies (id,creator_user_id,game_id,status,versions) VALUES (${lobbyId},${principals[0]!.userId},${gameId},'started',${sql.json(initial.state.versions)})`;
  for (const [i, p] of principals.entries())
    await sql`INSERT INTO play.participants (lobby_id,seat,user_id,session_id,deck_snapshot) VALUES (${lobbyId},${i ? 'p2' : 'p1'},${p.userId},${p.sessionId},'{}')`;
  const grants = [];
  for (const p of principals) {
    const ticket = await connections.issue(p, lobbyId, 'player', origin);
    grants.push(await connections.redeem(ticket.ticket, gameId, origin));
  }
  const lease = (await store.claim(gameId, 'undo-tests', 60_000))!;
  const host = await DurableGame.restore(
    store,
    lease,
    { checkpointEvery: 20, leaseMs: 60_000 },
    () => 0,
  );
  const submit = async (kind: Parameters<typeof choose>[1], selections: string[] = []) => {
    const input = choose(host.state, kind, selections);
    await host.submit(host.state.execution.decision!.playerId, randomUUID(), input);
    replays.committed(gameId);
  };
  return { gameId, grants, principals, host, initial, submit, lease };
}
test('approved undo restores Kelleran, its free unit and nested damage; branches survive compaction and recovery', async () => {
  const f = await fixture();
  await f.submit('play');
  await f.submit('search', [f.initial.refs.found!]);
  await f.submit('play');
  expect(f.host.state.execution.decision?.kind).toBe('effect');
  await f.submit(i => i.kind === 'target' && i.card === f.initial.refs.target);
  expect(f.host.state.cards[f.initial.refs.target!]!.damage).toBe(2);
  const prepared = await replays.prepareUndo(f.gameId, 'p1'),
    id = randomUUID();
  await undo.request(f.grants[0]!, id, prepared);
  await undo.request(f.grants[0]!, id, prepared); // retry does not extend timeout
  const pending = await undo.pending(f.gameId);
  expect(pending?.id).toBe(id);
  await expect(f.submit('pass')).rejects.toThrow('undo-pending');
  expect(f.host.paused).toBe(false);
  const before = f.host.state;
  const bookmarks = new CrossfireBookmarks(sql),
    bookmarkId = randomUUID();
  const bookmark = await bookmarks.create(
    f.grants[0]!,
    bookmarkId,
    'Before undo',
    prepared.head.meta,
  );
  await bookmarks.create(f.grants[0]!, bookmarkId, 'Before undo', prepared.head.meta);
  expect(await bookmarks.list(f.principals[1]!)).toEqual([]);
  await expect(bookmarks.rename(f.principals[1]!, bookmarkId, 'Not mine')).rejects.toThrow(
    'unavailable',
  );
  await bookmarks.remove(f.principals[1]!, bookmarkId);
  expect(await bookmarks.list(f.principals[0]!)).toHaveLength(1);
  const accepted = await f.host.restoreAction(prepared, 'p1', 'p2', id, {
    check: async () => {
      await connections.revalidate(f.grants[1]!);
      return true;
    },
    commit: tx => undo.approve(tx, f.grants[1]!, id, prepared),
  });
  replays.committed(f.gameId);
  expect(accepted.state.cards).toEqual(f.initial.state.cards);
  expect(accepted.state.players).toEqual(f.initial.state.players);
  expect(accepted.state.execution).toEqual(f.initial.state.execution);
  expect(accepted.state.revision).toBe(before.revision + 1);
  expect(accepted.state.nextId).toBeGreaterThanOrEqual(before.nextId);
  expect(await undo.pending(f.gameId)).toBeNull();
  expect((await undo.get(f.grants[1]!, id)).status).toBe('accepted');
  const recovered = await DurableGame.restore(store, f.lease, {
    checkpointEvery: 20,
    leaseMs: 60_000,
  });
  expect(recovered.state).toEqual(accepted.state);
  await f.submit('pass'); // another legal action after restoring
  await f.host.submit('p2', randomUUID(), {
    type: 'concede',
    gameId: f.gameId,
    playerId: 'p2',
    expectedRevision: f.host.state.revision,
  });
  const history = await store.readHistory(f.gameId);
  expect(verifyHistory(history).state).toEqual(f.host.state);
  await store.publishArchive(f.gameId, await encodeArchive(history));
  replays.committed(f.gameId);
  const replay = await replays.seek(f.gameId, { kind: 'end' });
  expect(replay.meta.branches).toHaveLength(2);
  const abandoned = await replays.seek(f.gameId, {
    kind: 'branch',
    branch: replay.meta.branches[0]!.id,
  });
  expect(abandoned.state.cards[f.initial.refs.target!]!.damage).toBe(2);
  const freshReplay = new ReplayService(url!);
  try {
    const opened = await freshReplay.seek(f.gameId, {
      kind: 'position',
      position: bookmark.position,
      branch: bookmark.branch,
    });
    expect(opened.state).toEqual(before);
  } finally {
    await freshReplay.stop();
  }
  await bookmarks.rename(f.principals[0]!, bookmarkId, 'Nested damage');
  expect((await bookmarks.list(f.principals[0]!))[0]?.label).toBe('Nested damage');
  await bookmarks.remove(f.principals[0]!, bookmarkId);
  expect(await bookmarks.list(f.principals[0]!)).toEqual([]);

  expect((await store.findReceipt(f.gameId, 'p1', `undo:${id}`))?.sequence).toBe(5);
});
test('denial, cancellation, expiry and stale requests leave state unchanged; approval requires the other seat', async () => {
  const f = await fixture();
  await f.submit('play');
  const prepared = await replays.prepareUndo(f.gameId, 'p1');
  const before = f.host.state;
  for (const kind of ['decline', 'cancel', 'expire'] as const) {
    const id = randomUUID();
    await undo.request(f.grants[0]!, id, prepared);
    await expect(undo.dismiss(f.grants[0]!, id, 'decline')).rejects.toThrow('not-authorized');
    if (kind === 'expire')
      await sql`UPDATE play.undo_requests SET expires_at = now()-interval '1 second' WHERE id = ${id}`;
    else await undo.dismiss(f.grants[kind === 'cancel' ? 0 : 1]!, id, kind);
    expect(await undo.pending(f.gameId)).toBeNull();
    expect(f.host.state).toEqual(before);
  }
  await f.submit('search', []);
  await expect(undo.request(f.grants[0]!, randomUUID(), prepared)).rejects.toThrow('stale-state');
});

test('practice requires both original players and a sealed source; forks pending Kelleran choices independently', async () => {
  const f = await fixture(),
    bookmarks = new CrossfireBookmarks(sql),
    practice = new CrossfirePractice(sql);
  await f.submit('play');
  await f.submit('search', [f.initial.refs.found!]);
  const target = f.host.state;
  const saved = await replays.seek(f.gameId, { kind: 'end' }),
    bookmarkId = randomUUID(),
    requestId = randomUUID();
  await bookmarks.create(f.grants[0]!, bookmarkId, 'Kelleran choice', saved.meta);
  await expect(practice.request(f.principals[0]!, bookmarkId, requestId)).rejects.toThrow(
    'unavailable',
  );
  await f.host.submit('p2', randomUUID(), {
    type: 'concede',
    gameId: f.gameId,
    playerId: 'p2',
    expectedRevision: f.host.state.revision,
  });
  await store.publishArchive(f.gameId, await encodeArchive(await store.readHistory(f.gameId)));
  replays.committed(f.gameId);
  const source = await store.readHistory(f.gameId);
  await expect(practice.request(f.principals[1]!, bookmarkId, requestId)).rejects.toThrow(
    'unavailable',
  );
  await practice.request(f.principals[0]!, bookmarkId, requestId);
  await practice.request(f.principals[0]!, bookmarkId, requestId);
  const invitations = await practice.list(f.principals[1]!);
  expect(invitations).toHaveLength(1);
  expect(invitations[0]?.mine).toBe(false);
  const grants = [];
  for (const p of f.principals) {
    const ticket = await connections.issue(p, f.grants[0]!.lobbyId, 'player', origin, 'replay');
    grants.push(await connections.redeem(ticket.ticket, f.gameId, origin));
  }
  await expect(practice.prepare(grants[0]!, requestId)).rejects.toThrow('unavailable');
  for (const mode of ['cancel', 'expire']) {
    const expired = randomUUID();
    await practice.request(f.principals[0]!, bookmarkId, expired);
    if (mode === 'cancel') await practice.decline(f.principals[0]!, expired);
    else
      await sql`UPDATE play.practice_requests SET expires_at = now()-interval '1 second' WHERE id = ${expired}`;
    await expect(practice.prepare(grants[1]!, expired)).rejects.toThrow('unavailable');
  }
  const terminal = await replays.seek(f.gameId, { kind: 'end' }),
    terminalId = randomUUID();
  await bookmarks.create(grants[0]!, terminalId, 'Game over', terminal.meta);
  expect((await bookmarks.list(f.principals[0]!)).find(b => b.id === terminalId)?.canPractice).toBe(
    false,
  );
  await expect(practice.request(f.principals[0]!, terminalId, randomUUID())).rejects.toThrow(
    'unavailable',
  );

  const prepared = await practice.prepare(grants[1]!, requestId);
  games.push(prepared.gameId);
  const candidate = await replays.practice(
    f.gameId,
    prepared.position,
    prepared.branch,
    prepared.gameId,
  );
  const results = await Promise.all([
    practice.accept(grants[1]!, requestId, candidate.checkpoint, candidate.sourceHash),
    practice.accept(grants[1]!, requestId, candidate.checkpoint, candidate.sourceHash),
  ]);
  expect(new Set(results).size).toBe(1);
  expect((await practice.prepare(grants[1]!, requestId)).accepted).toBe(true);
  const stored = await store.load(prepared.gameId);
  expect(stored.sequence).toBe(0);
  const initial = decodeState(stored.checkpoint.checkpoint);
  expect(initial.players).toEqual(target.players);
  expect(initial.cards).toEqual(target.cards);
  expect(initial.execution).toEqual(target.execution);
  expect(initial.gameId).toBe(prepared.gameId);
  expect(initial.disclosure).toEqual({ handsToPlayers: false, handsToSpectators: false });
  expect((await store.readHistory(f.gameId)).stateHash).toBe(source.stateHash);
  for (const p of f.principals) {
    const ticket = await connections.issue(p, prepared.lobbyId, 'player', origin);
    expect((await connections.redeem(ticket.ticket, prepared.gameId, origin)).purpose).toBe('live');
  }
  await sql`DELETE FROM play.games WHERE id = ${f.gameId}`; // fork owns its complete initial checkpoint
  const lease = (await store.claim(prepared.gameId, 'practice-test', 60_000))!;
  const host = await DurableGame.restore(store, lease, { checkpointEvery: 20, leaseMs: 60_000 });
  await host.submit('p1', randomUUID(), choose(host.state, 'play'));
  expect(host.state.cards[f.initial.refs.found!]!.zone).toBe('ground');
  expect(host.state.execution.decision?.kind).toBe('effect');
});

test('problem reports atomically bookmark the committed position without exposing it to another account', async () => {
  const f = await fixture(),
    bookmarks = new CrossfireBookmarks(sql);
  const position = await replays.seek(f.gameId, { kind: 'end' }),
    id = randomUUID();
  const saved = await bookmarks.create(
    f.grants[0]!,
    id,
    'Target choice',
    position.meta,
    'Expected a different damage target.',
    {
      state: position.state,
      view: new Projector(f.gameId, { role: 'player', playerId: 'p1' }).project(position.state),
      seat: 'p1',
    },
  );
  await bookmarks.create(
    f.grants[0]!,
    id,
    'Target choice',
    position.meta,
    'Expected a different damage target.',
    {
      state: position.state,
      view: new Projector(f.gameId, { role: 'player', playerId: 'p1' }).project(position.state),
      seat: 'p1',
    },
  );
  expect((await bookmarks.reports(f.principals[0]!)).find(r => r.id === id)?.position).toBe(
    saved.position,
  );
  expect((await bookmarks.reports(f.principals[1]!)).some(r => r.id === id)).toBe(false);
  await expect(bookmarks.resolveReport(f.principals[1]!, id)).rejects.toThrow('unavailable');
  await expect(
    bookmarks.create(
      f.grants[0]!,
      id,
      'Target choice',
      position.meta,
      'A changed retry must be rejected.',
      {
        state: position.state,
        view: new Projector(f.gameId, { role: 'player', playerId: 'p1' }).project(position.state),
        seat: 'p1',
      },
    ),
  ).rejects.toThrow('conflict');
  await bookmarks.remove(f.principals[0]!, id);
  expect((await bookmarks.reports(f.principals[0]!)).find(r => r.id === id)?.position).toBe(
    saved.position,
  );
  await bookmarks.resolveReport(f.principals[0]!, id);
  expect((await bookmarks.reports(f.principals[0]!)).find(r => r.id === id)?.status).toBe(
    'resolved',
  );
  expect((await store.load(f.gameId)).sequence).toBe(0);
  const [stored] =
    await sql`SELECT checkpoint,checkpoint_hash,snapshot FROM play.problem_reports WHERE id=${id}`;
  expect(decodeState(gunzipSync(stored!.checkpoint).toString())).toEqual(position.state);
  expect(stored!.checkpoint_hash).toMatch(/^[a-f0-9]{64}$/);
  const detail = await bookmarks.report(f.principals[0]!, id);
  expect(detail.snapshot?.view).toEqual(stored!.snapshot.view);
  expect(JSON.stringify(detail)).not.toContain('desert-sharpshooter'); // Undrawn private deck card.
  expect(JSON.stringify(detail)).not.toContain('checkpoint');
  await expect(bookmarks.report(f.principals[1]!, id)).rejects.toThrow('unavailable');
  expect((await bookmarks.report(f.principals[1]!, id, true)).snapshot).toEqual(detail.snapshot);
  expect(
    (await sql`SELECT count(*)::int AS n FROM play.report_notifications WHERE report_id=${id}`)[0]!
      .n,
  ).toBe(1);
});

test('report notification queue survives failures, crash leases, duplicate and concurrent delivery without public state', async () => {
  const f = await fixture(),
    bookmarks = new CrossfireBookmarks(sql);
  const position = await replays.seek(f.gameId, { kind: 'end' }),
    id = randomUUID();
  const capture = {
    state: position.state,
    view: new Projector(f.gameId, { role: 'player', playerId: 'p1' }).project(position.state),
    seat: 'p1',
  };
  await expect(
    bookmarks.create(f.grants[0]!, id, 'Bug', position.meta, 'Note without a snapshot'),
  ).rejects.toThrow('conflict');
  expect((await sql`SELECT id FROM play.bookmarks WHERE id=${id}`).length).toBe(0);
  await bookmarks.create(
    f.grants[0]!,
    id,
    'Bug',
    position.meta,
    '@everyone please inspect the reported position',
    capture,
  );
  const config = {
    enabled: true,
    botToken: 'synthetic-token',
    channelId: '123456789012345678',
    appBaseUrl: 'http://localhost:5174',
    apiBaseUrl: 'http://discord.invalid',
  };
  let requests: { url: string; payload: any }[] = [];
  const fetchFn = (async (url: string, init: RequestInit) => {
    requests.push({ url, payload: JSON.parse(String(init.body)) });
    return Response.json({
      id: 'synthetic-thread',
      type: 11,
      parent_id: config.channelId,
      message: { id: 'synthetic-message', channel_id: 'synthetic-thread' },
    });
  }) as unknown as typeof fetch;
  const options = { reportId: id, config, fetchFn };
  expect(
    (await deliverCrossfireReports(sql, { ...options, config: { ...config, enabled: false } }))
      .status,
  ).toBe('skipped');
  const dry = await deliverCrossfireReports(sql, { ...options, dryRun: true });
  expect(dry.status).toBe('dry-run');
  expect(requests).toHaveLength(0);
  expect(
    (await sql`SELECT attempts FROM play.report_notifications WHERE report_id=${id}`)[0]!.attempts,
  ).toBe(0);
  const failFetch = (async () =>
    Response.json({ retry_after: 120 }, { status: 429 })) as unknown as typeof fetch;
  expect((await deliverCrossfireReports(sql, { ...options, fetchFn: failFetch })).failed).toBe(1);
  expect(
    (
      await sql`SELECT next_attempt_at > now()+interval '110 seconds' AS delayed,last_error FROM play.report_notifications WHERE report_id=${id}`
    )[0],
  ).toMatchObject({ delayed: true, last_error: 'discord-429' });
  await deliverCrossfireReports(sql, options);
  expect(requests).toHaveLength(0);
  await sql`UPDATE play.report_notifications SET status='sending',lease_id=${randomUUID()},lease_until=now()-interval '1 second' WHERE report_id=${id}`;
  const delivered = await Promise.all([
    deliverCrossfireReports(sql, options),
    deliverCrossfireReports(sql, options),
  ]);
  expect(delivered.reduce((n, r) => n + r.sent, 0)).toBe(1);
  expect(requests).toHaveLength(1);
  expect(requests[0]!.url).toBe(`http://discord.invalid/channels/${config.channelId}/threads`);
  expect(requests[0]!.payload.name).toBe('Bug');
  expect(requests[0]!.payload.message.allowed_mentions.parse).toEqual([]);
  expect(requests[0]!.payload.message.embeds[0].url).toBe(
    `http://localhost:5174/crossfire/reports/${id}`,
  );
  expect(JSON.stringify(requests)).not.toContain('kelleran-beq');
  await deliverCrossfireReports(sql, options);
  expect(requests).toHaveLength(1);
  await bookmarks.remove(f.principals[0]!, id);
  expect((await bookmarks.report(f.principals[0]!, id)).snapshot).not.toBeNull();
  // Normal game/account deletion also removes the private snapshot and outbox.
  await store.release(f.lease);
  await sql`DELETE FROM play.games WHERE id=${f.gameId}`;
  expect(
    (await sql`SELECT report_id FROM play.report_notifications WHERE report_id=${id}`).length,
  ).toBe(0);
});

test('chat races retain unique ordering, retries bypass rate limits, and storage/catch-up stay bounded', async () => {
  const f = await fixture(),
    chat = new CrossfireChat(sql);
  const sent = await Promise.all(
    Array.from({ length: 5 }, (_, i) => chat.send(f.grants[0]!, randomUUID(), `Message ${i}`)),
  );
  expect(sent.map(m => m.sequence).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);
  expect(await chat.send(f.grants[0]!, sent[0]!.id, sent[0]!.text)).toEqual(sent[0]!);
  await expect(chat.send(f.grants[0]!, sent[0]!.id, 'Changed body')).rejects.toThrow('conflict');
  await expect(chat.send(f.grants[0]!, randomUUID(), 'Sixth')).rejects.toThrow('rate-limited');
  await sql`UPDATE play.chat_messages SET created_at=now()-interval '1 minute' WHERE game_id=${f.gameId}`;
  await sql`INSERT INTO play.chat_messages(game_id,sequence,id,seat,text,created_at) SELECT ${f.gameId},n,gen_random_uuid()::text,'p2','Synthetic bounded history',now()-interval '1 minute' FROM generate_series(6,500) AS n`;
  const recent = await chat.list(f.grants[1]!);
  expect(recent).toHaveLength(100);
  expect(recent[0]!.sequence).toBe(401);
  await expect(chat.send(f.grants[0]!, randomUUID(), 'Full')).rejects.toThrow('chat-full');
  expect((await store.load(f.gameId)).sequence).toBe(0);
});
