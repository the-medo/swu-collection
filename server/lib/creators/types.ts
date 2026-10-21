import type { db } from '../../db/index.ts';
export type Database = Pick<
  typeof db,
  'select' | 'selectDistinct' | 'insert' | 'update' | 'delete' | 'execute' | 'transaction'
>;
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
export type Connection = Database | Transaction;
export const now = () => new Date().toISOString();
