import { createContext, useContext } from 'react';
import type { InsertKind, Insertion, EditorInsertion } from './model.ts';

export const InsertionContext = createContext<
  ((kind: InsertKind, initial?: Insertion) => Promise<EditorInsertion | null>) | null
>(null);
export function useInsertionPicker() {
  const request = useContext(InsertionContext);
  if (!request) throw new Error('An editor must be inside InsertionProvider');
  return request;
}
