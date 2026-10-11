import { z } from 'zod';
import type { SwuSet } from '../../types/enums.ts';

export const DAILY_SEALED_BOOSTER_COUNT = 8;
export const dailySealedDateSchema = z.iso.date();
export const getDailySealedDate = (now = new Date()) => now.toISOString().slice(0, 10);

export type DailySealedDeck = {
  id: string;
  name: string;
  leaderCardId: string | null;
  baseCardId: string | null;
  author: { id: string; displayName: string };
};

export type DailySealedPool = {
  id: string;
  /** Actual challenge date, which can precede today while generation is pending. */
  date: string;
  name: string;
  set: SwuSet;
  boosterCount: number;
  cardCount: number;
  leaders: { cardId: string; copies: number }[];
  publicDeckCount: number;
  builderCount: number;
  decks: DailySealedDeck[];
};

export type DailySealedResponse = {
  /** Requested date; historical requests never fall back to a different day. */
  date: string;
  /** Current UTC day on the server, independent of the requested pool date. */
  today: string;
  nextRefreshAt: string;
  /** Public, ready, unarchived daily pools through today, newest first. */
  availableDates: string[];
  pool: DailySealedPool | null;
};
