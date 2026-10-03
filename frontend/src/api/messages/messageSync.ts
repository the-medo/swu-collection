import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import type {
  ConversationPage,
  MessageChange,
  MessagePage,
  MessageUpdate,
} from '../../../../shared/types/messages.ts';
import { messageKeys } from './queryKeys.ts';

type History = InfiniteData<MessagePage, number | null>;
type Conversations = InfiniteData<ConversationPage>;
type Dependencies = {
  current: () => boolean;
  fetchUpdate: (
    peerId: string,
    after: number | undefined,
    signal: AbortSignal,
  ) => Promise<MessageUpdate>;
  refresh: () => Promise<void>;
};
const newestSequence = (history?: History) =>
  history?.pages.reduce(
    (latest, page) => Math.max(latest, page.items[page.items.length - 1]?.sequence ?? 0),
    0,
  ) ?? 0;
const newestConversation = (
  a: { id: string; updatedAt: string },
  b: { id: string; updatedAt: string },
) =>
  a.updatedAt === b.updatedAt
    ? a.id === b.id
      ? 0
      : a.id < b.id
        ? 1
        : -1
    : a.updatedAt < b.updatedAt
      ? 1
      : -1;

/** Serialize account snapshots and coalesce duplicate socket/POST acknowledgements.
 * HTTP remains authoritative; only the affected conversation is transferred.
 */
export class MessageSync {
  private pending = new Map<string, MessageChange>();
  private applied = new Map<string, MessageChange>();
  private running: Promise<void> | undefined;
  private needsResync = false;
  private stopped = false;
  private abort = new AbortController();

  constructor(
    private readonly client: QueryClient,
    private readonly sessionId: string,
    private readonly dependencies: Dependencies,
  ) {}

  private current = () => !this.stopped && this.dependencies.current();

  changed(change: MessageChange) {
    if (!this.current()) return Promise.resolve();
    const previous = this.pending.get(change.peerId);
    this.pending.set(change.peerId, {
      ...change,
      lastSequence: Math.max(change.lastSequence, previous?.lastSequence ?? 0),
      readSequence: Math.max(change.readSequence, previous?.readSequence ?? 0),
    });
    if (this.pending.size > 32) {
      this.pending.clear();
      this.needsResync = true;
    }
    return this.schedule();
  }

  resync() {
    if (!this.current()) return Promise.resolve();
    this.needsResync = true;
    return this.schedule();
  }

  stop() {
    this.stopped = true;
    this.abort.abort();
    this.pending.clear();
    this.applied.clear();
  }

  private schedule(): Promise<void> {
    this.running ??= Promise.resolve()
      .then(() => this.drain())
      .finally(() => {
        this.running = undefined;
        if (this.current() && (this.pending.size || this.needsResync)) void this.schedule();
      });
    return this.running;
  }

  private async settleQueries(includePagination = true) {
    // Patches must not be overwritten by an older initial/refetch response.
    // In particular, never cancel an explicit request for older history.
    await Promise.all(
      this.client
        .getQueryCache()
        .findAll({ queryKey: messageKeys.account(this.sessionId) })
        .filter(
          query =>
            query.state.fetchStatus === 'fetching' &&
            (includePagination || !query.state.fetchMeta?.fetchMore),
        )
        .map(query => query.promise?.catch(() => undefined)),
    );
  }

  private history(peerId: string) {
    const query = this.client.getQueryCache().find({
      queryKey: messageKeys.history(this.sessionId, peerId),
      exact: true,
    });
    return query?.isActive() ? (query.state.data as History | undefined) : undefined;
  }

  private async drain() {
    while (this.current() && (this.needsResync || this.pending.size)) {
      if (this.needsResync) {
        this.needsResync = false;
        this.applied.clear();
        this.pending.clear();
        await this.dependencies.refresh();
        continue;
      }
      const [peerId, change] = this.pending.entries().next().value!;
      this.pending.delete(peerId);
      const applied = this.applied.get(peerId);
      if (
        applied?.conversationId === change.conversationId &&
        applied.lastSequence >= change.lastSequence &&
        applied.readSequence >= change.readSequence
      )
        continue;
      try {
        await this.settleQueries(false);
        let more = true;
        while (more && this.current()) {
          const history = this.history(peerId);
          const after = history ? newestSequence(history) : undefined;
          const update = await this.dependencies.fetchUpdate(peerId, after, this.abort.signal);
          await this.settleQueries(false);
          if (!this.current()) return;
          if (
            update.conversation.id !== change.conversationId ||
            update.conversation.peer.id !== peerId
          )
            throw new Error('Mismatched message update.');
          // Keep the badge live even while the reader is loading an older page.
          this.client.setQueryData<{ unreadCount: number }>(
            messageKeys.summary(this.sessionId),
            old => (old ? update.summary : old),
          );
          await this.settleQueries();
          if (!this.current()) return;
          this.patch(peerId, update, after);
          // A conversation can open while a metadata-only update is in flight.
          // Catch up its new history before deduplicating any queued event.
          const currentHistory = this.history(peerId);
          more =
            !!currentHistory && newestSequence(currentHistory) < update.conversation.lastSequence;
          if (
            more &&
            after !== undefined &&
            (!update.items.length || newestSequence(this.history(peerId)) <= (after ?? 0))
          )
            throw new Error('Message update did not advance.');
          if (!more) {
            this.applied.delete(peerId);
            this.applied.set(peerId, {
              conversationId: update.conversation.id,
              peerId,
              lastSequence: update.conversation.lastSequence,
              readSequence: update.conversation.readSequence,
            });
            // A tab only needs a bounded recent deduplication window.
            if (this.applied.size > 256) this.applied.delete(this.applied.keys().next().value!);
          }
        }
      } catch {
        if (!this.current()) return;
        // The existing queries own visible errors/retry, and recover any gap.
        this.applied.clear();
        await this.dependencies.refresh();
      }
    }
  }

  private patch(peerId: string, update: MessageUpdate, after?: number) {
    const historyKey = messageKeys.history(this.sessionId, peerId);
    const history = this.history(peerId);
    if (history && after !== undefined) {
      const latest = newestSequence(history);
      const fresh = update.items.filter(item => item.sequence > latest);
      if (latest < after || fresh.some((item, index) => item.sequence !== latest + index + 1))
        throw new Error('Message history has a gap.');
      this.client.setQueryData<History>(
        historyKey,
        old =>
          old && {
            ...old,
            pages: old.pages.map((page, index) => ({
              ...page,
              conversationId: update.conversation.id,
              peer: update.conversation.peer,
              readSequence: Math.max(page.readSequence, update.conversation.readSequence),
              items: index === 0 ? [...page.items, ...fresh] : page.items,
            })),
          },
      );
    }
    this.client.setQueryData<Conversations>(messageKeys.conversations(this.sessionId), old => {
      if (!old?.pages.length) return old;
      const previous = old.pages.flatMap(page => page.items);
      const existing = previous.find(row => row.id === update.conversation.id);
      const boundary = old.pages[old.pages.length - 1]?.nextCursor;
      if (!existing && boundary && newestConversation(update.conversation, boundary) >= 0)
        return old;
      if (
        existing &&
        (existing.lastSequence > update.conversation.lastSequence ||
          existing.readSequence > update.conversation.readSequence)
      )
        return old;
      const items = [
        ...previous.filter(row => row.id !== update.conversation.id),
        update.conversation,
      ].sort(newestConversation);
      let offset = 0;
      return {
        ...old,
        pages: old.pages.map((page, index) => {
          const count = page.items.length + (index === 0 && !existing ? 1 : 0);
          const next = { ...page, items: items.slice(offset, offset + count) };
          offset += count;
          // Keep the original older-page boundary: moving an updated row to the
          // front must not skip any conversations that haven't loaded yet.
          return next;
        }),
      };
    });
  }
}
