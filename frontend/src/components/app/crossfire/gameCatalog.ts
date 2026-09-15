import { createContext } from 'react';
import type { CardListResponse } from '@/api/lists/useCardList.ts';
export const GameCatalog = createContext<CardListResponse['cards'] | undefined>(undefined);
