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
  public: number;
  createdAt: string;
  updatedAt: string;
}

export interface DeckData {
  deck: Deck;
  user: User;
  isFavorite: string | null;
  entityPrices?: EntityPrice[];
}
