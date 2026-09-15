import type { VisibleEvent } from '../../../../../play/view/types.ts';
import type { ChatMessage } from '../../../../../play/view/chat.ts';
export type ActivityEntry =
  | { kind: 'event'; event: VisibleEvent }
  | { kind: 'chat'; message: ChatMessage };
/** Public-event anchors retain interleaving after a reconnect without disclosing
 * the number of private engine decisions. Legacy unanchored chat follows the log. */
export function mergeActivity(events: VisibleEvent[], chat: ChatMessage[]): ActivityEntry[] {
  return [
    ...events.map((event, index) => ({
      kind: 'event' as const,
      event,
      order: event.order ?? index + 1,
      index,
    })),
    ...chat.map(message => ({
      kind: 'chat' as const,
      message,
      order: message.afterEvent ?? Infinity,
      index: message.sequence,
    })),
  ].sort(
    (a, b) =>
      a.order - b.order || (a.kind === b.kind ? a.index - b.index : a.kind === 'event' ? -1 : 1),
  );
}
