import { expect, test } from 'bun:test';
import { mergeActivity } from './activity.ts';
import type { VisibleEvent } from '../../../../../play/view/types.ts';
import type { ChatMessage } from '../../../../../play/view/chat.ts';
const event = (id: string, order: number) => ({ id, order }) as VisibleEvent;
const chat = (id: string, sequence: number, afterEvent: number | null) =>
  ({ id, sequence, afterEvent }) as ChatMessage;
test('game events and chat retain chronological grouping after independent reloads', () => {
  const events = [event('play', 1), event('private-detail', 1), event('attack', 2)];
  const messages = [chat('before-game', 1, 0), chat('response', 2, 1), chat('after-attack', 3, 2)];
  const ids = () =>
    mergeActivity(events, messages).map(e => (e.kind === 'event' ? e.event.id : e.message.id));
  expect(ids()).toEqual([
    'before-game',
    'play',
    'private-detail',
    'response',
    'attack',
    'after-attack',
  ]);
  expect(
    mergeActivity(JSON.parse(JSON.stringify(events)), JSON.parse(JSON.stringify(messages))),
  ).toEqual(mergeActivity(events, messages));
  expect(mergeActivity(events, [chat('legacy', 4, null)]).at(-1)?.kind).toBe('chat');
});
