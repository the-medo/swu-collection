import { isUuid } from '../../../shared/lib/zod/uuid.ts';
import type { CardMetrics } from '../../../shared/types/cardMetrics.ts';

export type IntegrationGameDataContent = {
  format?: string;
  gameId?: string;
  lobbyId?: string;
  players?: {
    data?: {
      id?: string;
      base?: string;
      deck?: {
        id?: string;
        name?: string;
        deckSource?: string;
        base?: {
          id?: string;
          cost?: number | null;
          count?: number;
          internalName?: string;
        };
        leader?: {
          id?: string;
          cost?: number | null;
          count?: number;
          internalName?: string;
        };
      };
      leader?: string;
      isWinner?: boolean;
      accessToken?: string | null;
    };
    cardMetrics?: CardMetrics;
  }[];
  startedAt?: string;
  finishedAt?: string;
  roundNumber?: number;
  sequenceNumber?: number;
};

export const normalizeKarabastDeckId = (deckId?: string | null): string | null => {
  if (!isUuid(deckId)) {
    return null;
  }

  return deckId;
};
