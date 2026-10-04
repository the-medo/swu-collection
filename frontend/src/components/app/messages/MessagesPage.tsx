import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { getRouteApi, Link } from '@tanstack/react-router';
import { useForm } from '@tanstack/react-form';
import { ArrowDown, ArrowLeft, Loader2, Mail, Send } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { formatDistanceToNow } from 'date-fns';
import {
  useConversations,
  useMessageHistory,
  useReadMessages,
  useSendMessage,
} from '@/api/messages/useMessages.ts';
import { useSession } from '@/lib/auth-client.ts';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Textarea } from '@/components/ui/textarea.tsx';
import { cn } from '@/lib/utils.ts';
import { MessageBody } from './MessageBody.tsx';
import { ReportUserButton } from '@/components/app/users/ReportUserButton.tsx';
import { messageMaxLength, type MessagePeer } from '../../../../../shared/types/messages.ts';

const route = getRouteApi('/_authenticated/messages');
type Draft = { body: string; clientMessageId: string };
const emptyDraft = (): Draft => ({ body: '', clientMessageId: crypto.randomUUID() });

export function MessagesPage() {
  const session = useSession().data;
  return <Messenger key={session?.session.id} userId={session?.user.id ?? ''} />;
}
function PeerAvatar({ peer, className }: { peer: MessagePeer; className?: string }) {
  return (
    <Avatar className={cn('h-9 w-9 shrink-0 rounded-lg', className)}>
      <AvatarImage src={peer.image ?? undefined} alt="" />
      <AvatarFallback className="rounded-lg">{peer.displayName?.[0] ?? '?'}</AvatarFallback>
    </Avatar>
  );
}
function Messenger({ userId }: { userId: string }) {
  const { with: peerId } = route.useSearch();
  const query = useConversations();
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const conversations = [
    ...new Map(
      query.data?.pages.flatMap(page => page.items).map(item => [item.id, item]) ?? [],
    ).values(),
  ];
  const draft = peerId ? drafts[peerId] : undefined;
  return (
    <>
      <Helmet title="Messages | SWUBase" />
      <div className="flex h-full min-h-0 flex-col">
        <h2 className="sr-only">Messages</h2>
        <div className="grid min-h-0 flex-1 overflow-hidden rounded-lg border md:grid-cols-[18rem_minmax(0,1fr)]">
          <aside
            aria-label="Conversations"
            className={cn('min-h-0 overflow-y-auto md:border-r', peerId && 'hidden md:block')}
          >
            <h3 className="border-b px-4 py-3 text-sm font-semibold">Conversations</h3>
            {query.isPending && (
              <p role="status" className="p-4 text-sm text-muted-foreground">
                Loading conversations…
              </p>
            )}
            {query.error && (
              <div role="alert" className="p-4 text-sm text-destructive">
                {query.error.message}
                <Button
                  variant="link"
                  size="sm"
                  disabled={query.isFetching}
                  onClick={() =>
                    void (query.isFetchNextPageError ? query.fetchNextPage() : query.refetch())
                  }
                >
                  Retry
                </Button>
              </div>
            )}
            {query.isSuccess && !conversations.length && (
              <p className="p-4 text-sm text-muted-foreground">
                No conversations yet. Start one from a player’s profile.
              </p>
            )}
            <ul>
              {conversations.map(conversation => (
                <li key={conversation.id}>
                  <Link
                    to="/messages"
                    search={{ with: conversation.peer.id }}
                    resetScroll={false}
                    aria-current={conversation.peer.id === peerId ? 'page' : undefined}
                    className={cn(
                      'flex min-w-0 gap-3 border-b p-4 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                      conversation.peer.id === peerId && 'bg-accent',
                    )}
                  >
                    <PeerAvatar peer={conversation.peer} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold">
                          {conversation.peer.displayName}
                        </span>
                        {!!conversation.unreadCount && (
                          <span
                            className="ml-auto rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground"
                            aria-label={`${conversation.unreadCount} unread messages`}
                          >
                            {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                          </span>
                        )}
                      </div>
                      <p
                        className={cn(
                          'truncate text-sm text-muted-foreground',
                          conversation.unreadCount > 0 && 'font-medium text-foreground',
                        )}
                      >
                        {conversation.lastMessage.senderId === userId ? 'You: ' : ''}
                        {conversation.lastMessage.body}
                      </p>
                      <time
                        dateTime={conversation.updatedAt}
                        title={new Date(conversation.updatedAt).toLocaleString()}
                        className="mt-1 block text-xs text-muted-foreground"
                      >
                        {formatDistanceToNow(new Date(conversation.updatedAt), { addSuffix: true })}
                      </time>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            {query.hasNextPage && (
              <div className="p-3">
                <Button
                  className="w-full"
                  variant="ghost"
                  disabled={query.isFetching}
                  onClick={() => void query.fetchNextPage()}
                >
                  {query.isFetchingNextPage ? 'Loading…' : 'More conversations'}
                </Button>
              </div>
            )}
          </aside>
          {peerId ? (
            <Conversation
              key={peerId}
              userId={userId}
              peerId={peerId}
              draft={draft}
              onDraft={next => setDrafts(previous => ({ ...previous, [peerId]: next }))}
            />
          ) : (
            <div className="hidden items-center justify-center p-8 text-center text-muted-foreground md:flex">
              <div>
                <Mail className="mx-auto mb-3 h-10 w-10" aria-hidden="true" />
                <p>Select a conversation to read and send messages.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
function Conversation({
  userId,
  peerId,
  draft,
  onDraft,
}: {
  userId: string;
  peerId: string;
  draft?: Draft;
  onDraft: (draft: Draft) => void;
}) {
  const currentUser = useSession().data?.user;
  const query = useMessageHistory(peerId);
  const read = useReadMessages();
  const { mutate: markRead, isPending: isMarkingRead, isError: hasReadError } = read;
  const scroll = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);
  const [atBottom, setAtBottom] = useState(true);
  const [active, setActive] = useState(
    () => document.visibilityState === 'visible' && document.hasFocus(),
  );
  const [readRetry, setReadRetry] = useState(0);
  const attemptedRead = useRef(0);
  const lastRendered = useRef<number | undefined>(undefined);
  const olderAnchor = useRef<{ id: string; top: number; firstSequence: number } | null>(null);
  const data = query.data?.pages[0];
  const items = useMemo(
    () =>
      [
        ...new Map(
          query.data?.pages.flatMap(page => page.items).map(item => [item.id, item]) ?? [],
        ).values(),
      ].sort((a, b) => a.sequence - b.sequence),
    [query.data],
  );
  const firstSequence = items[0]?.sequence;
  const lastSequence = items[items.length - 1]?.sequence;
  const incomingSequence = items.reduce(
    (latest, item) => (item.senderId !== userId ? item.sequence : latest),
    0,
  );
  const jumpToLatest = () => {
    olderAnchor.current = null;
    atBottomRef.current = true;
    setAtBottom(true);
    if (scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight;
  };
  useEffect(() => {
    const update = () => setActive(document.visibilityState === 'visible' && document.hasFocus());
    window.addEventListener('focus', update);
    window.addEventListener('blur', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      window.removeEventListener('focus', update);
      window.removeEventListener('blur', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);
  useLayoutEffect(() => {
    const element = scroll.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      if (atBottomRef.current) element.scrollTop = element.scrollHeight;
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useLayoutEffect(() => {
    const element = scroll.current;
    if (!element || !lastSequence) return;
    if (olderAnchor.current && firstSequence! < olderAnchor.current.firstSequence) {
      const anchor = element.querySelector<HTMLElement>(
        `[data-message-id="${olderAnchor.current.id}"]`,
      );
      if (anchor) element.scrollTop += anchor.getBoundingClientRect().top - olderAnchor.current.top;
      olderAnchor.current = null;
    } else if (atBottomRef.current || lastRendered.current === undefined) {
      element.scrollTop = element.scrollHeight;
    }
    lastRendered.current = lastSequence;
  }, [firstSequence, lastSequence, items.length]);
  useEffect(() => {
    if (
      !active ||
      !atBottom ||
      !data?.conversationId ||
      !incomingSequence ||
      isMarkingRead ||
      hasReadError ||
      incomingSequence <= Math.max(attemptedRead.current, data.readSequence)
    )
      return;
    attemptedRead.current = incomingSequence;
    markRead({ conversationId: data.conversationId, throughSequence: incomingSequence });
  }, [
    active,
    atBottom,
    data?.conversationId,
    data?.readSequence,
    incomingSequence,
    isMarkingRead,
    hasReadError,
    markRead,
    readRetry,
  ]);
  const loadOlder = async () => {
    const element = scroll.current;
    if (element && firstSequence) {
      const top = element.getBoundingClientRect().top;
      const anchor = [...element.querySelectorAll<HTMLElement>('[data-message-id]')].find(
        item => item.getBoundingClientRect().bottom > top,
      );
      if (anchor)
        olderAnchor.current = {
          id: anchor.dataset.messageId!,
          top: anchor.getBoundingClientRect().top,
          firstSequence,
        };
    }
    try {
      const result = await query.fetchNextPage({ cancelRefetch: false });
      const loadedOlder = result.data?.pages.some(page =>
        page.items.some(item => item.sequence < (firstSequence ?? 0)),
      );
      if (!loadedOlder) olderAnchor.current = null;
    } catch {
      olderAnchor.current = null;
    }
  };
  return (
    <section aria-label="Conversation" className="flex min-h-0 min-w-0 flex-col">
      <div className="flex shrink-0 items-center gap-3 border-b p-3">
        <Button
          asChild
          variant="ghost"
          size="iconMedium"
          className="md:hidden"
          title="All conversations"
        >
          <Link to="/messages" search={{ with: undefined }} aria-label="All conversations">
            <ArrowLeft aria-hidden="true" />
          </Link>
        </Button>
        {data ? (
          <Link
            to="/users/$userId"
            params={{ userId: peerId }}
            className="flex min-w-0 items-center gap-3 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <PeerAvatar peer={data.peer} />
            <span className="truncate font-semibold">{data.peer.displayName}</span>
          </Link>
        ) : (
          <span className="text-sm text-muted-foreground">Conversation</span>
        )}
        {data && (
          <div className="ml-auto">
            <ReportUserButton
              userId={peerId}
              displayName={data.peer.displayName}
              source="conversation"
            />
          </div>
        )}
      </div>
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div
          ref={scroll}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4"
          onScroll={() => {
            const element = scroll.current;
            if (!element) return;
            const bottom = element.scrollHeight - element.scrollTop - element.clientHeight < 48;
            atBottomRef.current = bottom;
            setAtBottom(bottom);
          }}
        >
          {query.isPending && (
            <p role="status" className="p-4 text-center text-sm text-muted-foreground">
              Loading messages…
            </p>
          )}
          {query.hasNextPage && (
            <div className="mb-4 text-center">
              <Button size="sm" variant="ghost" disabled={query.isFetching} onClick={loadOlder}>
                {query.isFetchingNextPage ? 'Loading…' : 'Older messages'}
              </Button>
            </div>
          )}
          {data && !items.length && (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Start your conversation with {data.peer.displayName}.
            </p>
          )}
          <ol aria-label="Messages" className="flex min-h-full flex-col justify-end gap-1.5">
            {items.map((item, index) => {
              const previous = items[index - 1];
              const startsGroup = !previous || previous.senderId !== item.senderId;
              const createdAt = new Date(item.createdAt);
              const showTime =
                startsGroup ||
                Math.floor(createdAt.getTime() / 60_000) !==
                  Math.floor(new Date(previous.createdAt).getTime() / 60_000);
              const mine = item.senderId === userId;
              const sender: MessagePeer = mine
                ? {
                    id: userId,
                    displayName: currentUser?.displayName ?? 'You',
                    image: currentUser?.image ?? null,
                  }
                : data!.peer;
              return (
                <li
                  key={item.id}
                  data-message-id={item.id}
                  className={cn('flex items-start gap-2', mine && 'flex-row-reverse')}
                >
                  <div className="flex w-11 shrink-0 flex-col items-center gap-1">
                    {startsGroup && (
                      <Link
                        to="/users/$userId"
                        params={{ userId: sender.id }}
                        aria-label={mine ? 'Your profile' : `${sender.displayName}'s profile`}
                        tabIndex={-1}
                        className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <PeerAvatar peer={sender} className="h-7 w-7" />
                      </Link>
                    )}
                    {showTime && (
                      <time
                        dateTime={item.createdAt}
                        title={createdAt.toLocaleString()}
                        aria-label={createdAt.toLocaleString()}
                        className="whitespace-nowrap text-center text-[10px] leading-3 tabular-nums text-muted-foreground"
                      >
                        {createdAt.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </time>
                    )}
                  </div>
                  <div
                    className={cn(
                      'min-w-0 max-w-[calc(100%_-_3.25rem)] rounded-xl px-3 py-2 text-foreground sm:max-w-[75%]',
                      mine ? 'bg-muted' : 'bg-muted/50',
                    )}
                  >
                    <span className="sr-only">{mine ? 'You' : data?.peer.displayName}: </span>
                    <p className="whitespace-pre-wrap text-sm [overflow-wrap:anywhere]">
                      <MessageBody body={item.body} />
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
        {!atBottom && (
          <Button
            className="absolute bottom-3 left-1/2 -translate-x-1/2 shadow-sm"
            variant="secondary"
            size="sm"
            onClick={jumpToLatest}
          >
            <ArrowDown aria-hidden="true" /> Latest messages
          </Button>
        )}
      </div>
      {query.error && (
        <div role="alert" className="shrink-0 px-3 text-xs text-destructive">
          {query.error.message}
          <Button
            variant="link"
            size="sm"
            disabled={query.isFetching}
            onClick={() => void (query.isFetchNextPageError ? loadOlder() : query.refetch())}
          >
            Retry
          </Button>
        </div>
      )}
      {read.error && (
        <div role="alert" className="px-3 text-xs text-destructive">
          {read.error.message}
          <Button
            variant="link"
            size="sm"
            onClick={() => {
              attemptedRead.current = 0;
              read.reset();
              setReadRetry(value => value + 1);
            }}
          >
            Retry
          </Button>
        </div>
      )}
      {data && (
        <MessageComposer peerId={peerId} draft={draft} onDraft={onDraft} onSent={jumpToLatest} />
      )}
    </section>
  );
}
function MessageComposer({
  peerId,
  draft,
  onDraft,
  onSent,
}: {
  peerId: string;
  draft?: Draft;
  onDraft: (draft: Draft) => void;
  onSent: () => void;
}) {
  const send = useSendMessage();
  const submission = useRef(draft ?? emptyDraft());
  const form = useForm({
    defaultValues: { body: draft?.body ?? '' },
    onSubmit: async ({ value }) => {
      if (!value.body.trim() || send.isPending) return;
      try {
        await send.mutateAsync({
          peerId,
          body: value.body,
          clientMessageId: submission.current.clientMessageId,
        });
        form.reset({ body: '' });
        submission.current = emptyDraft();
        onDraft(submission.current);
        onSent();
      } catch {
        /* Keep the draft and retry ID; the mutation renders a recoverable error. */
      }
    },
  });
  return (
    <form
      className="shrink-0 space-y-2 border-t p-3 pb-12 md:pb-3"
      onSubmit={event => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      {send.error && (
        <p role="alert" className="text-sm text-destructive">
          {send.error.message}
        </p>
      )}
      <form.Field name="body">
        {field => (
          <>
            <label htmlFor="message-body" className="sr-only">
              Message
            </label>
            <Textarea
              id="message-body"
              placeholder="Write a message…"
              rows={3}
              maxLength={messageMaxLength}
              className="max-h-40 min-h-20 resize-y"
              value={field.state.value}
              readOnly={send.isPending}
              aria-busy={send.isPending}
              onBlur={field.handleBlur}
              onChange={event => {
                field.handleChange(event.target.value);
                submission.current = {
                  body: event.target.value,
                  clientMessageId: crypto.randomUUID(),
                };
                onDraft(submission.current);
                send.reset();
              }}
              onKeyDown={event => {
                if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  void form.handleSubmit();
                }
              }}
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                Enter to send · Shift+Enter for a new line
              </span>
              <Button
                type="submit"
                size="sm"
                disabled={send.isPending || !field.state.value.trim()}
              >
                {send.isPending ? (
                  <Loader2 className="animate-spin" aria-hidden="true" />
                ) : (
                  <Send aria-hidden="true" />
                )}{' '}
                Send
              </Button>
            </div>
          </>
        )}
      </form.Field>
    </form>
  );
}
