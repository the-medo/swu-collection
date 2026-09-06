export type CustomPoolDraftEntry = {
  cardId: string;
  cardNo: number;
};

export type CustomPoolDraftGroup = CustomPoolDraftEntry & {
  key: string;
  quantity: number;
};

type CardNumberLookup = Record<number, { cardId: string } | undefined>;

export function parseCollectorNumber(value: string): number | undefined {
  const normalized = value.trim();
  if (!/^\d+$/.test(normalized)) return undefined;

  const number = Number(normalized);
  return Number.isSafeInteger(number) && number > 0 ? number : undefined;
}

export function addCustomPoolDraftEntry(
  entries: CustomPoolDraftEntry[],
  entry: CustomPoolDraftEntry,
) {
  return [...entries, entry];
}

export function removeOneCustomPoolDraftEntry(
  entries: CustomPoolDraftEntry[],
  entry: CustomPoolDraftEntry,
) {
  const next = [...entries];

  for (let index = next.length - 1; index >= 0; index--) {
    const candidate = next[index];
    if (candidate?.cardId === entry.cardId && candidate.cardNo === entry.cardNo) {
      next.splice(index, 1);
      break;
    }
  }

  return next;
}

export function removeAllCustomPoolDraftEntries(
  entries: CustomPoolDraftEntry[],
  entry: CustomPoolDraftEntry,
) {
  return entries.filter(
    candidate => candidate.cardId !== entry.cardId || candidate.cardNo !== entry.cardNo,
  );
}

export function groupCustomPoolDraftEntries(entries: CustomPoolDraftEntry[]) {
  const groups = new Map<string, CustomPoolDraftGroup>();

  for (const entry of entries) {
    const key = `${entry.cardId}:${entry.cardNo}`;
    const existing = groups.get(key);

    if (existing) {
      existing.quantity++;
    } else {
      groups.set(key, { ...entry, key, quantity: 1 });
    }
  }

  return [...groups.values()];
}

export function resolveCustomPoolDraftEntries(
  cardIds: string[],
  cardsByNumber: CardNumberLookup | undefined,
) {
  const numberByCardId = new Map<string, number>();

  Object.entries(cardsByNumber ?? {})
    .sort(([left], [right]) => Number(left) - Number(right))
    .forEach(([cardNo, card]) => {
      if (card && !numberByCardId.has(card.cardId)) {
        numberByCardId.set(card.cardId, Number(cardNo));
      }
    });

  const entries: CustomPoolDraftEntry[] = [];
  const unresolvedCardIds = new Set<string>();

  for (const cardId of cardIds) {
    const cardNo = numberByCardId.get(cardId);
    if (cardNo === undefined) {
      unresolvedCardIds.add(cardId);
    } else {
      entries.push({ cardId, cardNo });
    }
  }

  return { entries, unresolvedCardIds: [...unresolvedCardIds] };
}
