import type { CollectionCard } from '../../../../../../types/CollectionCard.ts';
import { CollectionCardSelection } from '@/components/app/collections/CollectionCardSelection/useCollectionCardSelectionStore.ts';
import { CollectionCardActionConfiguration } from '@/components/app/collections/CollectionCardActions/collectionCardActionLib.ts';
import { CollectionType } from '../../../../../../types/enums.ts';

function isSameCard(
  a: Omit<CollectionCard, 'cardId' | 'variantId' | 'amount'>,
  b: Omit<CollectionCard, 'cardId' | 'variantId' | 'amount'>,
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
    arr.push({ amount, ...rest });
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

export const getCollectionCardActionConfiguration: () => CollectionCardActionConfiguration =
  () => ({
    step1: {
      title: '',
      description: 'Create a trade list from selected cards.',
      allowedCollectionTypes: [CollectionType.OTHER],
      collectionTypeData: {
        [CollectionType.COLLECTION]: undefined,
        [CollectionType.WANTLIST]: undefined,
        [CollectionType.OTHER]: {
          title: 'Add to card list',
          description: undefined,
        },
      },
      defaultSelectedCollectionType: CollectionType.OTHER,
    },
    step2: {
      allowCreate: true,
      allowExisting: false,
      create: {
        predefinedTitle: {
          template: 'Trade list {date} ["{userName}" {hasFor} "{userNameCollectionOwner}"]',
        },
        predefinedDescription: {
          template:
            'List from {collectionTypeOriginal} "{collectionName}" that was created by {userNameCollectionOwner}',
        },
      },
    },
    step3: {
      allowedActions: ['add'],
    },
  });
