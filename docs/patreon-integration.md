# Patreon supporters and credits

SWUBASE reads its creator campaign through Patreon API v2. There is no Patreon
login or account-linking flow. The admin page at `/admin?page=patreon` lists
supporters, matching accounts, lifetime support and credit awards.

## Configuration

Keep these server-only settings in the deployment environment or local `.env`:

- `PATREON_CLIENT_ID`
- `PATREON_CLIENT_SECRET`
- `PATREON_CREATORS_ACCESS_TOKEN`
- `PATREON_CREATORS_REFRESH_TOKEN`
- `TOKEN_ENCRYPTION_KEY` (the existing stable encryption key, at least 32 characters)
- `PATREON_WEBHOOK_SECRET` (the signing secret from the webhook registration)

The first four values come from the creator's v2 client in the
[Patreon developer portal](https://www.patreon.com/portal/registration/register-clients).
The client must have one campaign, denominated in USD, and access to campaigns,
members and member emails. The creator token includes the v2 scopes.

For local development, the base checkout's `.env` is the source for worktrees.
The launcher loads `.env` followed by its generated `.env.worktree`; keep
Patreon credentials in `.env`. Do not put secrets in `.env.example` or frontend
variables. Use separate development and production clients: rotating one shared
refresh token from two independent databases can invalidate the other copy.

`patreon_connection` stores access/refresh tokens encrypted with AES-256-GCM.
Environment tokens seed a new client connection only; persisted tokens are used
after restarts. Token refresh is serialized by a database row lock. Keep the
encryption key stable. If the client or key changes, or an external token rotation
invalidates the stored pair, the operator must deliberately reset that client's
connection with fresh credentials. No automatic fallback overwrites stored tokens.

## Webhooks and first import

1. Deploy the code and apply migrations with `bun run db-migrate`.
2. Register the public HTTPS endpoint
   `https://swubase.com/api/integration/patreon/webhook` in Patreon's webhook portal.
3. Select `members:create`, `members:update`, `members:delete`,
   `members:pledge:create`, `members:pledge:update`, and `members:pledge:delete`.
4. Save that webhook's signing secret as `PATREON_WEBHOOK_SECRET` and restart the
   application. Send a test delivery from Patreon and check its delivery status.
5. Open the Patreon admin page and use **Sync supporters and award credits**.
   This imports all pages, including former members, and awards historical support.

The webhook authenticates the raw body using Patreon's HMAC-MD5 signature, checks
campaign identity, and re-fetches the member before awarding. It acknowledges
only after processing commits. Provider/database failures return a retryable
error. Duplicate and out-of-order notifications use the same reconciliation
path as manual imports. See [Patreon's webhook documentation](https://docs.patreon.com/#webhook-responses).

Malformed member records are held for review without storing the raw response.
They do not block later members in an import or subsequent webhook deliveries.
The admin page shows the skipped-record count from the latest full sync. Transient
provider/DB failures still fail the request so the operator or Patreon can retry.
**Recheck record** fetches the member again and stores a valid replacement even
when no account matches or the latest charge was not paid. Normal credit checks
still apply; any newly detected monetary discrepancy remains on hold.

There is no scheduled polling. Run the admin sync again after an outage or when
reconciling a missed event. If Patreon has paused delivery, inspect the webhook
in its portal and resume/replay pending deliveries there. The CLI equivalent is:

```bash
# Deployment: .env / process environment must select the intended database.
bun run patreon:sync

# Development: explicitly apply the isolated worktree database overlay.
bun --env-file=.env --env-file=.env.worktree run patreon:sync
```

These commands award credits; repeated runs are safe. Partial imports commit per
member, so retrying after a failed page resumes without repeating earlier awards.
They never create, edit or delete a Patreon subscription or register webhooks.

## Matching and accounting

- Match trimmed, case-insensitive Patreon email to a verified SWUBASE email.
  Do not remove plus-address suffixes or dots. Missing emails, unverified accounts
  and ambiguous matches receive no credits.
- Unmatched members keep their uncredited support. Account creation/updates retry
  matching against locally stored membership data; a manual sync also retries.
  A member already linked to an account is never transferred automatically.
- `user_credits` is an append-only ledger. `SUM(amount)` is the user's balance.
  Patreon grants have a unique source key identifying member and credited total.
  The same balance includes starting and admin grants. See [user credits](user-credits.md)
  for registration grants, administration and future provider integration.
- `patreon_member.credited_cents` records lifetime USD support already awarded.
  First award: lifetime cents × 10. Later award: new lifetime cents minus credited
  cents, multiplied by 10. A row lock and one transaction protect award/checkpoint
  updates. Integer cents avoid floating-point conversion of dollars.
- Support totals and membership status live in the Patreon records. The unused
  `user_profile.total_support` and `active_supporter` placeholders are removed;
  profile favorites remain independent of support accounting.
- Current membership status and the most recent charge attempt do not replace
  lifetime paid support. A former or currently declined member can still have
  paid historical support. Cancellation never removes earned credits.
- Missing amounts, changed emails, deleted credited accounts, refund/fraud charge
  statuses and decreases in lifetime support are visible in the admin list.
  Refund/fraud statuses and monetary decreases stay on hold
  for explicit operator review, including after later payments. **Recheck and
  approve** fetches current provider data and clears a hold only when the latest
  status is Paid, a verified email matches, and lifetime support is at least the
  amount previously credited. It records the reviewing admin and time, preserves
  previous awards and grants only the difference. Otherwise it returns a conflict
  and keeps the hold; it never transfers a membership to another account.
  Restore the original verified email to resolve an email-change hold. A deleted
  credited account is deliberately not reassigned. This version has no refund
  debit or spending endpoint. Do not reset credited totals to clear a discrepancy,
  because that could award the same support twice.
- An older in-flight snapshot cannot overwrite a newer observation. Deleted
  memberships retain a tombstone and their credited checkpoint.

Patreon private records, encrypted credentials and credits are removed from
public contributor dumps regardless of opt-in. API error reporting suppresses
private Patreon request bodies; admin responses never include tokens.

## Validation

```bash
PATREON_DB_TEST=1 bun --env-file=.env --env-file=.env.worktree test server/lib/patreon
bunx drizzle-kit check --config=drizzle.config.ts
bun run --cwd frontend build
```

Database tests refuse non-worktree database URLs, use synthetic accounts/provider
responses and clean up their fixtures. They cover concurrent awards and refresh,
rollback, late email matches, duplicate webhooks, authorization and sanitization.
