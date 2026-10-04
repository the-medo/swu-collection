/** Expired suspensions must allow sign-in so Better Auth can clear their fields. */
export function hasActiveAccountRestriction(
  account: { banned?: boolean | null; banExpires?: Date | string | null } | null | undefined,
  now = Date.now(),
): boolean {
  if (!account?.banned) return false;
  return !account.banExpires || new Date(account.banExpires).getTime() > now;
}
