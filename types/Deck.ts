import type { User } from './User.ts';
import type { EntityPrice } from '../server/db/schema/entity_price.ts';

export interface Deck {
  id: string;
  userId: string;
  format: number;
  name: string;
  description: string | null;
  leaderCardId1: string | null;
  leaderCardId2: string | null;
  baseCardId: string | null;
  cardPoolId: string | null;
  versionCount: number;
  public: number;
  createdAt: string;
  updatedAt: string;
}

export interface DeckData {
  deck: Deck;
  user: User;
  isFavorite: string | null;
  entityPrices?: EntityPrice[];
  reference?: DeckReference;
  permissions?: DeckPermissions;
}

export type DeckVersionState = 'sealed' | 'open';

export type DeckReference = {
  id: string;
  deckId: string;
  deckVersionId: string | null;
  versionNumber: number | null;
  kind: 'parent' | 'sealed-version' | 'open-version';
  latestVersionNumber: number;
};

export type DeckPermissions = {
  canEditContent: boolean;
  canSaveVersion: boolean;
  canEditMetadata: boolean;
  canChangeVisibility: boolean;
  canDelete: boolean;
};

export type DeckVersionSummary = {
  id: string;
  deckId: string;
  versionNumber: number;
  state: DeckVersionState;
  sealedByUserId: string | null;
  sealedByName?: string | null;
  changeNote: string | null;
  createdAt: string;
  sealedAt: string | null;
  hasChanges: boolean;
  hasPlayableChanges: boolean;
  addedCards: number;
  removedCards: number;
  changedCards: number;
};

export type ResolvedDeckVersion = {
  deckId: string;
  deckVersionId: string;
  decklist: import('./ZDeckCard.ts').DeckCard[];
};
