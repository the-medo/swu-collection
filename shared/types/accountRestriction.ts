/** A login notice, not an authenticated session or a public user lookup. */
export type AccountRestrictionNotice =
  | { status: 'unknown' | 'available' | 'banned' }
  | { status: 'suspended'; expiresAt: string };
