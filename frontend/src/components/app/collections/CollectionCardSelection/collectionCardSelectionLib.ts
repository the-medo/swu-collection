import type { CollectionCard } from '../../../../../../types/CollectionCard.ts';
import { CollectionCardSelection } from '@/components/app/collections/CollectionCardSelection/useCollectionCardSelectionStore.ts';

function isSameCard(
  a: Omit<CollectionCard, 'cardId' | 'variantId'>,
  b: Omit<CollectionCard, 'cardId' | 'variantId'>,
) {
  return a.foil === b.foil && a.condition === b.condition && a.language === b.language;
}

export function upsertCard(
  selection: CollectionCardSelection,
  card: CollectionCard,
): CollectionCardSelection {
  const { cardId, variantId, amount, ...rest } = card;
  const cardsByCardId = selection.cards[cardId] ?? {};
  const arr = cardsByCardId[variantId] ? [...cardsByCardId[variantId]] : [];

  const idx = arr.findIndex(c => isSameCard(c, rest));
  if (idx >= 0) {
    const existing = { ...arr[idx] } as Omit<CollectionCard, 'cardId' | 'variantId'>;
    const newAmount = (existing.amount ?? 0) + amount;
    if (newAmount > 0) {
      existing.amount = newAmount;
      arr[idx] = existing;
    } else {
      // remove this entry
      arr.splice(idx, 1);
    }
  } else if (amount > 0) {
    arr.push({ ...rest });
  }

  if (arr.length > 0) {
    cardsByCardId[variantId] = arr;
  } else {
    delete cardsByCardId[variantId];
  }

  const newCardsByCardId = { ...cardsByCardId };
  if (Object.keys(newCardsByCardId).length > 0) {
    selection.cards[cardId] = newCardsByCardId;
  } else {
    delete selection.cards[cardId];
  }

  return { ...selection, cards: { ...selection.cards } };
}

export function removeCard(
  selection: CollectionCardSelection,
  card: CollectionCard,
): CollectionCardSelection {
  const { cardId, variantId, ...rest } = card;
  const cardsByCardId = selection.cards[cardId];
  if (!cardsByCardId) return selection;
  const arr = cardsByCardId[variantId];
  if (!arr) return selection;
  const idx = arr.findIndex(c => isSameCard(c, rest));
  if (idx >= 0) {
    arr.splice(idx, 1);
  }
  if (arr && arr.length === 0) {
    delete cardsByCardId[variantId];
  }
  if (Object.keys(cardsByCardId).length === 0) {
    delete selection.cards[cardId];
  }
  return { ...selection, cards: { ...selection.cards } };
}

const LS_COLLECTIONS_MAP_KEY = 'collectionsWithCardSelection';

const readCollectionsMap = (): Record<string, true> => {
  try {
    const raw = localStorage.getItem(LS_COLLECTIONS_MAP_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed as Record<string, true>;
  } catch {}
  return {};
};

const writeCollectionsMap = (map: Record<string, true>) => {
  try {
    if (Object.keys(map).length === 0) {
      localStorage.removeItem(LS_COLLECTIONS_MAP_KEY);
    } else {
      localStorage.setItem(LS_COLLECTIONS_MAP_KEY, JSON.stringify(map));
    }
  } catch {}
};

export const addCollectionToMap = (id: string) => {
  const map = readCollectionsMap();
  if (!map[id]) {
    map[id] = true;
    writeCollectionsMap(map);
  }
};

export const removeCollectionFromMap = (id: string) => {
  const map = readCollectionsMap();
  if (map[id]) {
    delete map[id];
    writeCollectionsMap(map);
  }
};
