export interface Deck {
  id: string;
  userId: string;
  format: number;
  name: string;
  description: string | null;
  leaderCardId1: string | null;
  leaderCardId2: string | null;
  baseCardId: string | null;
  public: boolean;
  createdAt: string;
  updatedAt: string;
}
