# User credits

`user_credits` is the shared, append-only credit ledger. A user's current balance
is `COALESCE(SUM(amount), 0)` across every source for their `user_id`. There is no
separate wallet balance on the user or profile. The schema currently lives in
`server/db/schema/patreon.ts`, but the ledger is independent of Patreon.
`server/lib/credits/service.ts` supplies the common balance reader and starting
and admin grants.

Battlefield layouts use this balance as a reusable budget. Saving, activating
or duplicating a Battlefield checks that its cost fits the balance; these
actions do not debit credits.

## Starting credits

Every existing account receives an additional 10,000 credits through migration
`0076_starting_credits.sql`. New accounts receive the same grant from Better
Auth's user-creation hook, including OAuth registration and admin-created
accounts. No verified email or configured Patreon integration is needed.

Both paths use `source = 'starting'` and `source_key = 'starting:<userId>'`.
The unique source key prevents repeated hooks or migration retries from
awarding the grant twice. Existing provider or admin awards are preserved.
Session creation and routine refresh also retry the starting grant, covering
temporary creation failures and registrations during deployment, including
continuously active accounts. Grant failures are logged without blocking login
or skipping local Patreon reconciliation.

## Administration

Open **Administration → Users → User credits** (`/admin?page=credits`), search
by name, display name or email, and select **Give credits**. Enter a positive
whole-number amount to add to the user's current balance.

The admin-only API exposes `GET /api/admin/credits?search=...` and
`POST /api/admin/credits/:userId/grants`. Grants require the same-origin
`X-Requested-With: swubase` header and a JSON body with `amount` and UUID
`requestId`. A grant's source is `admin`; its source key is
`admin:<grantingAdminUserId>:<requestId>`, retaining the actor and preventing a
retried request from duplicating the award. Reusing a key for another amount or
recipient returns a conflict. A failed request refreshes the balance. Unconfirmed
grants keep their amount and key when the dialog closes and reopens within the
admin page; confirm them with **Retry grant** before entering a new amount.
Concurrent awards and balance validation run in a transaction.

Credit totals must remain safe JavaScript integers. An award that would exceed
this range rolls back instead of leaving an unreadable balance.
An existing unsafe balance is marked **Balance requires review** in the admin
list without hiding other users; additional grants to that account are disabled.

## Support providers

[Patreon](patreon-integration.md) stores membership and already-credited lifetime
support in `patreon_member`. Those are provider accounting records; they are
not the user's available credits. Patreon awards go into the same ledger, at
10 credits per paid USD cent.

A future Stripe integration should keep its payment/refund reconciliation
records separately and append verified awards to `user_credits` with
`source = 'stripe'` and a stable, unique payment key. Duplicate webhook delivery
must not repeat an award. The balance and Battlefield budget will then include
those awards automatically. Stripe is not implemented yet.

The ledger, including admin attribution, remains excluded from public
contributor dumps by the existing sanitizer.
Restored dumps retain migration history but clear credits. Development accounts
whose starting migration is already recorded receive the default grant when
their session is created or refreshed.

## Validation

```bash
SWUBASE_CREDITS_DB_TEST=1 bun --env-file=.env --env-file=.env.worktree test server/lib/credits server/routes/admin/credits
PATREON_DB_TEST=1 bun --env-file=.env --env-file=.env.worktree test server/lib/patreon
SWUBASE_USER_REPORTS_DB_TEST=1 bun --env-file=.env --env-file=.env.worktree test server/auth/oauth.db.test.ts
BATTLEFIELD_BROWSER_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/tests/user-credits.browser.ts
bunx drizzle-kit check --config=drizzle.config.ts
bun --env-file=.env --env-file=.env.worktree run db-migrate
bun run --cwd frontend build
```
