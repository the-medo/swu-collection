import { expect, test } from 'bun:test';
import { QueryClient } from '@tanstack/react-query';
import { invalidateDeckDiscussion } from './discussionCache.ts';
import { deckDiscussionKeys } from './discussionKeys.ts';
import { discussionKeys } from '../discussions/queryKeys.ts';
import { applyDeletedDeckCaches } from './deckDeletionCache.ts';

test('comment counts refresh lists containing the deck without refreshing unrelated lists', async () => {
  const client = new QueryClient();
  const relevant = ['decks', 'all', { userId: 'owner' }];
  const unrelated = ['decks', 'all', { userId: 'other' }];
  client.setQueryData(relevant, { pages: [{ data: [{ deck: { id: 'deck' } }] }] });
  client.setQueryData(unrelated, { pages: [{ data: [{ deck: { id: 'other-deck' } }] }] });
  try {
    await invalidateDeckDiscussion(client, 'deck');
    expect(client.getQueryState(relevant)?.isInvalidated).toBe(true);
    expect(client.getQueryState(unrelated)?.isInvalidated).toBe(false);
    await invalidateDeckDiscussion(client, 'deck', true);
    expect(client.getQueryState(unrelated)?.isInvalidated).toBe(true);
  } finally {
    client.clear();
  }
});

test('comment mutations do not trigger a second metadata fetch through the deck binding', async () => {
  const client = new QueryClient();
  const binding = deckDiscussionKeys.discussion('deck', 'reader');
  const bindingId = deckDiscussionKeys.binding('deck', 'reader');
  const info = discussionKeys.info('discussion', 'reader');
  const own = discussionKeys.ownComments(
    { attachmentType: 'deck', attachmentId: 'deck' },
    'reader',
  );
  const article = deckDiscussionKeys.article('deck', 'reader');
  client.setQueryData(binding, { id: 'discussion', total: 2, canModerate: false });
  client.setQueryData(bindingId, 'discussion');
  client.setQueryData(info, { id: 'discussion', total: 2, canModerate: false });
  client.setQueryData(own, { pages: [] });
  client.setQueryData(article, { content: 'Cached guide' });
  try {
    await invalidateDeckDiscussion(client, 'deck');
    expect(client.getQueryState(binding)?.isInvalidated).toBe(false);
    expect(client.getQueryState(bindingId)?.isInvalidated).toBe(false);
    expect(client.getQueryState(info)?.isInvalidated).toBe(false);
    // Author-only comment caches are now owned by discussion mutations.
    expect(client.getQueryState(own)?.isInvalidated).toBe(false);
    expect(client.getQueryState(article)?.isInvalidated).toBe(true);
    await invalidateDeckDiscussion(client, 'deck', true);
    expect(client.getQueryState(binding)?.isInvalidated).toBe(false);
    expect(client.getQueryState(bindingId)?.isInvalidated).toBe(false);
    expect(client.getQueryState(info)?.isInvalidated).toBe(true);
  } finally {
    client.clear();
  }
});

test('deleting a deck clears discussion caches even when only its ID binding remains', () => {
  const client = new QueryClient();
  const binding = deckDiscussionKeys.binding('deck', 'reader');
  const comments = discussionKeys.comments('discussion', 'reader');
  const ownerComments = discussionKeys.comments('discussion', 'owner');
  const unrelatedComments = discussionKeys.comments('other-discussion', 'reader');
  const ownById = discussionKeys.ownComments({ discussionId: 'discussion' }, 'reader');
  const ownByAttachment = discussionKeys.ownComments(
    { attachmentType: 'deck', attachmentId: 'deck' },
    'reader',
  );
  const otherOwn = discussionKeys.ownComments({ discussionId: 'other-discussion' }, 'reader');
  client.setQueryData(binding, 'discussion');
  client.setQueryData(comments, { pages: [{ data: ['Reply'] }] });
  client.setQueryData(ownerComments, { pages: [{ data: ['Reply'] }] });
  client.setQueryData(unrelatedComments, { pages: [] });
  for (const key of [ownById, ownByAttachment, otherOwn]) client.setQueryData(key, { pages: [] });
  try {
    applyDeletedDeckCaches(client, ['deck'], []);
    expect(client.getQueryData(binding)).toBeUndefined();
    expect(client.getQueryData(comments)).toBeUndefined();
    expect(client.getQueryData(ownerComments)).toBeUndefined();
    expect(client.getQueryData<{ pages: unknown[] }>(unrelatedComments)).toEqual({ pages: [] });
    expect(client.getQueryData(ownById)).toBeUndefined();
    expect(client.getQueryData(ownByAttachment)).toBeUndefined();
    expect(client.getQueryData<{ pages: unknown[] }>(otherOwn)).toEqual({ pages: [] });
  } finally {
    client.clear();
  }
});

test('guide saves refresh metadata without invalidating loaded comment pages or threads', async () => {
  const client = new QueryClient();
  const binding = deckDiscussionKeys.discussion('deck', 'owner');
  const info = discussionKeys.info('discussion', 'owner');
  const roots = discussionKeys.comments('discussion', 'owner');
  const replies = discussionKeys.comments('discussion', 'owner', 'parent');
  const thread = discussionKeys.thread('discussion', 'owner', 'reply');
  client.setQueryData(binding, { id: 'discussion', total: 3, canModerate: true });
  client.setQueryData(info, { id: 'discussion', total: 3, canModerate: true });
  client.setQueryData(roots, { pages: [{ data: ['parent'] }] });
  client.setQueryData(replies, { pages: [{ data: ['reply'] }] });
  client.setQueryData(thread, { path: ['parent', 'reply'] });
  try {
    await invalidateDeckDiscussion(client, 'deck', true);
    expect(client.getQueryState(binding)?.isInvalidated).toBe(false);
    expect(client.getQueryState(info)?.isInvalidated).toBe(true);
    expect(client.getQueryState(roots)?.isInvalidated).toBe(false);
    expect(client.getQueryState(replies)?.isInvalidated).toBe(false);
    expect(client.getQueryState(thread)?.isInvalidated).toBe(false);
  } finally {
    client.clear();
  }
});
