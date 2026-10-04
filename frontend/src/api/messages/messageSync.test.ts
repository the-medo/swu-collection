import { expect, test } from 'bun:test';
import {
  InfiniteQueryObserver,
  QueryClient,
  QueryObserver,
  type InfiniteData,
} from '@tanstack/react-query';
import type {
  ConversationPage,
  ConversationSummary,
  DirectMessage,
  MessageChange,
  MessagePage,
  MessageUpdate,
} from '../../../../shared/types/messages.ts';
import { MessageSync } from './messageSync.ts';
import { messageKeys } from './queryKeys.ts';

const session = 'test-session';
const peer = { id: 'peer', displayName: 'Peer', image: null };
const message = (sequence: number): DirectMessage => ({
  id: `message-${sequence}`,
  sequence,
  senderId: peer.id,
  clientMessageId: `retry-${sequence}`,
  body: `Message ${sequence}`,
  createdAt: '2026-01-01T12:00:00Z',
});
const row = (lastSequence = 2, readSequence = 0): ConversationSummary => ({
  id: 'conversation',
  peer,
  lastSequence,
  readSequence,
  unreadCount: lastSequence - readSequence,
  lastMessage: { senderId: peer.id, body: `Message ${lastSequence}` },
  updatedAt: '2026-01-01T12:00:00.000000Z',
});
const change = (lastSequence = 3, readSequence = 0): MessageChange => ({
  conversationId: 'conversation',
  peerId: peer.id,
  lastSequence,
  readSequence,
});
const update = (sequences: number[], lastSequence = 3, readSequence = 0): MessageUpdate => ({
  summary: { unreadCount: lastSequence - readSequence },
  conversation: row(lastSequence, readSequence),
  items: sequences.map(message),
  hasMore: false,
});
type History = InfiniteData<MessagePage, number | null>;
const history = (sequences = [1, 2]): History => ({
  pages: [
    {
      conversationId: 'conversation',
      peer,
      readSequence: 0,
      items: sequences.map(message),
      nextBefore: null,
    },
  ],
  pageParams: [null],
});
function harness(fetchUpdate: ConstructorParameters<typeof MessageSync>[2]['fetchUpdate']) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity, gcTime: Infinity } },
  });
  const historyKey = messageKeys.history(session, peer.id);
  client.setQueryData(historyKey, history());
  client.setQueryData(messageKeys.summary(session), { unreadCount: 2 });
  client.setQueryData(messageKeys.conversations(session), {
    pages: [{ items: [row()], nextCursor: null }],
    pageParams: [null],
  });
  const observer = new QueryObserver(client, {
    queryKey: historyKey,
    queryFn: async () => history(),
  });
  const unsubscribe = observer.subscribe(() => {});
  let refreshes = 0,
    current = true;
  const sync = new MessageSync(client, session, {
    fetchUpdate,
    current: () => current,
    refresh: async () => {
      refreshes++;
    },
  });
  return {
    client,
    sync,
    historyKey,
    unsubscribe,
    refreshes: () => refreshes,
    logout: () => {
      current = false;
      sync.stop();
      client.clear();
    },
    close: () => {
      unsubscribe();
      sync.stop();
      client.clear();
    },
    sequences: () =>
      client.getQueryData<History>(historyKey)?.pages.flatMap(p => p.items.map(m => m.sequence)),
  };
}

test('one delta updates history, conversation and badge; duplicate notifications/POST replies do not refetch', async () => {
  const requests: (number | undefined)[] = [];
  const h = harness(async (_peer, after) => {
    requests.push(after);
    return requests.length === 1 ? update([3]) : update([], 3, 3);
  });
  try {
    await Promise.all([h.sync.changed(change()), h.sync.changed(change())]);
    await h.sync.changed(change());
    expect(requests).toEqual([2]);
    expect(h.sequences()).toEqual([1, 2, 3]);
    expect(h.client.getQueryData<{ unreadCount: number }>(messageKeys.summary(session))).toEqual({
      unreadCount: 3,
    });
    expect(
      h.client.getQueryData<InfiniteData<ConversationPage>>(messageKeys.conversations(session))
        ?.pages[0].items[0].lastSequence,
    ).toBe(3);
    await h.sync.changed(change(3, 3));
    await h.sync.changed(change(3, 3));
    expect(requests).toEqual([2, 3]);
    expect(h.sequences()).toEqual([1, 2, 3]);
    expect(h.client.getQueryData<History>(h.historyKey)?.pages[0].readSequence).toBe(3);
    expect(h.client.getQueryData<{ unreadCount: number }>(messageKeys.summary(session))).toEqual({
      unreadCount: 0,
    });
    expect(h.refreshes()).toBe(0);
  } finally {
    h.close();
  }
});

test('an unrelated conversation updates its row and badge without downloading its history', async () => {
  const requests: [string, number | undefined][] = [];
  const h = harness(async (id, after) => {
    requests.push([id, after]);
    return {
      ...update([], 1),
      conversation: {
        ...row(1),
        id: 'other-conversation',
        peer: { ...peer, id },
        updatedAt: '2026-01-02T12:00:00.000000Z',
      },
      summary: { unreadCount: 3 },
    };
  });
  try {
    await h.sync.changed({
      ...change(1),
      conversationId: 'other-conversation',
      peerId: 'other-peer',
    });
    expect(requests).toEqual([['other-peer', undefined]]);
    expect(h.sequences()).toEqual([1, 2]);
    const list = h.client.getQueryData<InfiniteData<ConversationPage>>(
      messageKeys.conversations(session),
    )!;
    expect(list.pages[0].items.map(row => row.id)).toEqual(['other-conversation', 'conversation']);
    expect(h.client.getQueryData<{ unreadCount: number }>(messageKeys.summary(session))).toEqual({
      unreadCount: 3,
    });
    expect(h.client.getQueryData(messageKeys.history(session, 'other-peer'))).toBeUndefined();
  } finally {
    h.close();
  }
});

test('delta waits for an existing history response, then keeps its pages and cursor', async () => {
  const requests: (number | undefined)[] = [];
  const h = harness(async (_peer, after) => {
    requests.push(after);
    return update([5], 5);
  });
  try {
    h.client.setQueryData(h.historyKey, history([3, 4]));
    const older = Promise.withResolvers<History>();
    const fetching = h.client.fetchQuery({
      queryKey: h.historyKey,
      staleTime: 0,
      queryFn: () => older.promise,
    });
    const syncing = h.sync.changed(change(5));
    await Promise.resolve();
    await Promise.resolve();
    expect(requests).toEqual([]);
    const loaded = {
      pages: [history([3, 4]).pages[0], history([1, 2]).pages[0]],
      pageParams: [null, 3],
    };
    older.resolve(loaded);
    await fetching;
    await syncing;
    expect(requests).toEqual([4]);
    expect(h.sequences()).toEqual([3, 4, 5, 1, 2]);
    expect(h.client.getQueryData<History>(h.historyKey)?.pageParams).toEqual([null, 3]);
    expect(h.refreshes()).toBe(0);
  } finally {
    h.close();
  }
});

test('the badge updates during older-page pagination without cancelling the page or losing messages', async () => {
  const received = Promise.withResolvers<void>();
  const older = Promise.withResolvers<MessagePage>();
  const h = harness(async () => {
    received.resolve();
    return update([5], 5);
  });
  h.unsubscribe();
  const initial = history([3, 4]);
  initial.pages[0].nextBefore = 3;
  h.client.setQueryData(h.historyKey, initial);
  const observer = new InfiniteQueryObserver(h.client, {
    queryKey: h.historyKey,
    initialPageParam: null as number | null,
    queryFn: () => older.promise,
    getNextPageParam: page => page.nextBefore,
  });
  const unsubscribe = observer.subscribe(() => {});
  try {
    const paging = observer.fetchNextPage();
    const syncing = h.sync.changed(change(5));
    await received.promise;
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(h.client.getQueryData<{ unreadCount: number }>(messageKeys.summary(session))).toEqual({
      unreadCount: 5,
    });
    expect(h.sequences()).toEqual([3, 4]);
    expect(observer.getCurrentResult().isFetchingNextPage).toBe(true);
    older.resolve(history([1, 2]).pages[0]);
    await paging;
    await syncing;
    expect(h.sequences()).toEqual([3, 4, 5, 1, 2]);
    expect(h.refreshes()).toBe(0);
  } finally {
    unsubscribe();
    h.close();
  }
});

test('bursts catch up in bounded deltas and coalesce events received during a request', async () => {
  const first = Promise.withResolvers<MessageUpdate>();
  const requests: (number | undefined)[] = [];
  const h = harness(async (_peer, after) => {
    requests.push(after);
    return requests.length === 1 ? first.promise : update([5, 6], 6);
  });
  try {
    const syncing = h.sync.changed(change(3));
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    void h.sync.changed(change(5));
    void h.sync.changed(change(6));
    first.resolve({ ...update([3, 4], 6), hasMore: true });
    await syncing;
    expect(requests).toEqual([2, 4]);
    expect(h.sequences()).toEqual([1, 2, 3, 4, 5, 6]);
    expect(h.refreshes()).toBe(0);
  } finally {
    h.close();
  }
});

test('moving a conversation to the front preserves the older list cursor and has no duplicates', async () => {
  const h = harness(async () => update([3]));
  try {
    const cursor = { updatedAt: '2025-01-01T00:00:00.000000Z', id: 'older-boundary' };
    h.client.setQueryData(messageKeys.conversations(session), {
      pages: [
        {
          items: [
            {
              ...row(),
              id: 'other',
              peer: { ...peer, id: 'other' },
              updatedAt: '2025-12-01T00:00:00.000000Z',
            },
          ],
          nextCursor: cursor,
        },
        { items: [row()], nextCursor: cursor },
      ],
      pageParams: [null, cursor],
    });
    await h.sync.changed(change());
    const list = h.client.getQueryData<InfiniteData<ConversationPage>>(
      messageKeys.conversations(session),
    )!;
    expect(list.pages.flatMap(page => page.items.map(row => row.id))).toEqual([
      'conversation',
      'other',
    ]);
    expect(list.pages[1].nextCursor).toEqual(cursor);
  } finally {
    h.close();
  }
});

test('a sequence gap or failed delta uses the authoritative recovery path', async () => {
  let fails = false;
  const h = harness(async () => {
    if (fails) throw new Error('Network outage');
    return update([4], 4);
  });
  try {
    await h.sync.changed(change(4));
    expect(h.sequences()).toEqual([1, 2]);
    expect(h.refreshes()).toBe(1);
    fails = true;
    await h.sync.changed(change(5));
    expect(h.refreshes()).toBe(2);
    await h.sync.resync();
    expect(h.refreshes()).toBe(3);
  } finally {
    h.close();
  }
});

test('opening a chat during a metadata-only request still fetches messages missed by its first load', async () => {
  const first = Promise.withResolvers<MessageUpdate>();
  const started = Promise.withResolvers<void>();
  const requests: (number | undefined)[] = [];
  const h = harness(async (_peer, after) => {
    requests.push(after);
    if (requests.length === 1) {
      started.resolve();
      return first.promise;
    }
    return update([3]);
  });
  h.unsubscribe();
  let unsubscribe = () => {};
  try {
    const syncing = h.sync.changed(change());
    await started.promise;
    const observer = new QueryObserver(h.client, {
      queryKey: h.historyKey,
      queryFn: async () => history(),
    });
    unsubscribe = observer.subscribe(() => {});
    first.resolve(update([]));
    await syncing;
    expect(requests).toEqual([undefined, 2]);
    expect(h.sequences()).toEqual([1, 2, 3]);
    expect(h.refreshes()).toBe(0);
  } finally {
    unsubscribe();
    h.close();
  }
});

test('a read in another tab for an unloaded older conversation does not insert it into the loaded prefix', async () => {
  const h = harness(async () => ({
    ...update([], 2, 2),
    conversation: {
      ...row(2, 2),
      id: 'old-conversation',
      peer: { ...peer, id: 'old-peer' },
      updatedAt: '2025-01-01T00:00:00.000000Z',
    },
  }));
  try {
    const before = {
      pages: [{ items: [row()], nextCursor: { updatedAt: row().updatedAt, id: row().id } }],
      pageParams: [null],
    };
    h.client.setQueryData(messageKeys.conversations(session), before);
    await h.sync.changed({
      ...change(2, 2),
      conversationId: 'old-conversation',
      peerId: 'old-peer',
    });
    expect(
      h.client.getQueryData<InfiniteData<ConversationPage>>(messageKeys.conversations(session)),
    ).toEqual(before);
    expect(h.client.getQueryData<{ unreadCount: number }>(messageKeys.summary(session))).toEqual({
      unreadCount: 0,
    });
  } finally {
    h.close();
  }
});

test('logging out during a delta cannot recreate private query data', async () => {
  const pending = Promise.withResolvers<MessageUpdate>();
  let signal: AbortSignal | undefined;
  const h = harness(async (_peer, _after, abort) => {
    signal = abort;
    return pending.promise;
  });
  try {
    const syncing = h.sync.changed(change());
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(signal).toBeDefined();
    h.logout();
    pending.resolve(update([3]));
    await syncing;
    expect(signal!.aborted).toBe(true);
    expect(h.client.getQueryCache().getAll()).toHaveLength(0);
    expect(h.refreshes()).toBe(0);
  } finally {
    h.close();
  }
});
