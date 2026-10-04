import { createContext, useContext } from 'react';
import type { InsertKind, Insertion } from './model.ts';

export const InsertionContext = createContext<
  ((kind: InsertKind, initial?: Insertion) => Promise<Insertion | null>) | null
>(null);
export function useInsertionPicker() {
  const request = useContext(InsertionContext);
  if (!request) throw new Error('An editor must be inside InsertionProvider');
  return request;
}
