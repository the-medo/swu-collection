import type { PgSelect } from 'drizzle-orm/pg-core';

export function withPagination<T extends PgSelect>(qb: T, limit: number, offset: number) {
  /**
   * Adds pagination capabilities to a `PgSelect` query.
   *
   * @template T - A type that extends `PgSelect`.
   * @param qb - The query builder instance to apply pagination to.
   * @param limit - The maximum number of rows to return.
   * @param offset - The starting point for the rows to return.
   * @returns The query builder with `limit` and `offset` applied.
   */
  return qb.limit(limit).offset(offset);
}
