/** Stored card rows, including nullable fields and PostgreSQL numeric prices. */
export interface CollectionCardLookupRow {
  cardId: string;
  variantId: string;
  foil: boolean;
  condition: number;
  language: string | null;
  note: string | null;
  amount: number;
  amount2: number | null;
  price: string | null;
}

export interface CollectionCardLookupList {
  collection: {
    id: string;
    title: string;
    collectionType: number;
  };
  cards: CollectionCardLookupRow[];
}

export interface CollectionCardLookupResponse {
  data: CollectionCardLookupList[];
}
