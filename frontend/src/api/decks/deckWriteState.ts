import type { QueryClient } from '@tanstack/react-query';
import type { DeckData } from '../../../../types/Deck.ts';
import type { DeckCardResponse } from './useGetDeckCards.ts';
import type { DeckCard } from '../../../../types/ZDeckCard.ts';
import { deckKeys } from './queryKeys.ts';

type DeckMutation = {
  options: { mutationKey?: readonly unknown[] };
  state: { variables: unknown };
};

export function isDeckWrite(mutation: DeckMutation, deckId: string) {
  const [kind, keyId] = mutation.options.mutationKey ?? [];
  const variables = mutation.state.variables;
  const variableId =
    typeof variables === 'string'
      ? variables
      : variables && typeof variables === 'object' && 'deckId' in variables
        ? variables.deckId
        : undefined;
  return kind === 'deck-write' && (keyId ?? variableId) === deckId;
}

export async function refreshDeckAfterWrite(
  client: QueryClient,
  deckId: string,
  viewerId?: string,
) {
  // Scoped card mutations run in order; refresh after the last queued write.
  const queuedWrites = client.getMutationCache().findAll({
    status: 'pending',
    predicate: mutation => isDeckWrite(mutation, deckId) && mutation.state.isPaused,
  });
  if (queuedWrites.length) return;
  await refreshDeckForSave(client, deckId, viewerId);
}

export async function refreshDeckForSave(client: QueryClient, deckId: string, viewerId?: string) {
  // Read metadata before cards: a later server edit leaves an older timestamp,
  // which the save endpoint rejects instead of sealing unseen changes.
  await client.invalidateQueries({ queryKey: deckKeys.detail(deckId, viewerId), exact: true });
  await Promise.all([
    client.invalidateQueries({ queryKey: deckKeys.cards(deckId, viewerId), exact: true }),
    client.invalidateQueries({ queryKey: ['deck-versions', deckId] }),
    client.invalidateQueries({ queryKey: ['deck-version-diff', deckId] }),
  ]);
}

export function assertDeckReadyToSave(
  client: QueryClient,
  deckId: string,
  viewerId: string | undefined,
  expectedUpdatedAt: string,
) {
  if (client.isMutating({ predicate: mutation => isDeckWrite(mutation, deckId) }))
    throw new Error('Wait for your deck edits to finish before saving a version.');
  const detail = client.getQueryState<DeckData>(deckKeys.detail(deckId, viewerId));
  const cards = client.getQueryState(deckKeys.cards(deckId, viewerId));
  if (
    !detail?.data ||
    detail.status !== 'success' ||
    detail.isInvalidated ||
    detail.fetchStatus !== 'idle' ||
    !cards?.data ||
    cards.status !== 'success' ||
    cards.isInvalidated ||
    cards.fetchStatus !== 'idle'
  )
    throw new Error('Wait for the deck to finish loading before saving a version.');
  if (detail.data.deck.updatedAt !== expectedUpdatedAt)
    throw new Error('The deck changed. Review the latest changes before saving again.');
}

export async function updateDeckCardOptimistically<T>(
  client: QueryClient,
  deckId: string,
  viewerId: string | undefined,
  update: { id: { cardId: string; board: number }; data: { quantity?: number; note?: string } },
  persist: () => Promise<T>,
): Promise<T> {
  const key = deckKeys.cards(deckId, viewerId);
  await client.cancelQueries({ queryKey: key, exact: true });
  const previous = client.getQueryData<DeckCardResponse>(key);
  client.setQueryData<DeckCardResponse>(key, current => {
    if (!current) return current;
    const index = current.data.findIndex(
      card => card.cardId === update.id.cardId && card.board === update.id.board,
    );
    const cards = [...current.data];
    if (index >= 0) {
      if (update.data.quantity === 0) cards.splice(index, 1);
      else cards[index] = { ...cards[index], ...update.data };
    } else if ((update.data.quantity ?? 0) > 0) {
      cards.push({ deckId, ...update.id, note: '', ...update.data } as DeckCard);
    }
    return { ...current, data: cards };
  });
  try {
    return await persist();
  } catch (error) {
    if (previous) client.setQueryData(key, previous);
    throw error;
  }
}
