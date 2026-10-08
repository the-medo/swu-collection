# User currencies

`user_credits` is the shared transaction ledger for credits and beskar, independent
of the source that awarded them. It remains in `server/db/schema/patreon.ts` for
schema compatibility. Each entry has a `currency`, signed `amount`, `source`,
globally unique `source_key` and timestamp. Shop purchases also store `item_id`.

The current totals live directly in `user_profile`:

- `credit_balance`: whole credits, used as a reusable Battlefield model budget.
- `beskar_balance_cents`: hundredths of beskar; 250 means 2.5 beskar.

A database trigger updates these columns in the same transaction as each ledger
write. Readers in Battlefield, administration and profiles do not sum history.
The application appends entries; the trigger also handles SQL corrections and
deletions, including account cascades. Do not truncate the ledger independently
of profiles or edit the cached totals directly. Database constraints keep both
totals within safe JavaScript integer range and prevent negative beskar.

## Starting credits and migration

The single feature migration, `0077_user_currencies.sql`, adds the columns,
awards 10,000 credits to every existing account, backfills beskar for already
credited Patreon support, populates the totals once, and installs the trigger.
It preserves other profile fields, slot entitlements and previous credit awards.
Historical beskar uses linked members' `credited_cents`, not pending or held
increases above that checkpoint. Unlinked support stays pending.

New accounts receive 10,000 credits from Better Auth's creation hook, including
OAuth registration and admin-created accounts. No verified email or configured
provider is needed for this grant; accounts start with zero beskar unless support
matches or an administrator awards it.

Both the migration and registration use `source = 'starting'` and
`source_key = 'starting:<userId>'`. Repeated hooks cannot award it twice.
Session creation and routine refresh also repair failed starting grants or
registrations during deployment. Grant failures do not block sign-in or skip
Patreon matching, and logs contain only bounded database error codes.

The starting award is a permanent baseline entitlement. Deleting its ledger row
causes session recovery to restore it. For an accounting correction, keep the
original entry and append a negative credit adjustment with a separate unique
source key; no user-facing debit or revocation flow is provided by this feature.

### Deployment

Stop every old API instance and Patreon sync writer before applying this
migration, then start the new version. The API also runs pending migrations at
startup, so this must be a coordinated replacement rather than an overlapping
rolling deployment. Old code sums both currencies as credits and advances
Patreon's checkpoint without awarding beskar. Mixing the two versions after the
migration can therefore permit over-budget layouts or omit a beskar award.

Build the new version before stopping the old one; apply migrations with
`bun run db-migrate` against the deployment database, and then start only the
new version. Existing support and balances are preserved by the migration.

## Administration

Open **Administration → Users → User currencies** (`/admin?page=credits`), search
by name, display name or email, and select **Give credits** or **Give beskar**.
Credits must be positive whole numbers. Beskar allows up to two decimal places.
Both awards appear in the recipient's transaction history.

The admin-only API exposes `GET /api/admin/credits?search=...` and
`POST /api/admin/credits/:userId/grants`. Grants require
`X-Requested-With: swubase` and `{ currency, amount, requestId }`, where
`requestId` is a UUID. Omitted `currency` defaults to `credits` for compatibility.
Beskar input uses displayed units (2.5), which the service converts to hundredths
(250). The admin source key is `admin:<grantingAdminUserId>:<requestId>`.
Reusing a key for another currency, amount or recipient returns a conflict.

Unconfirmed awards keep their original amount and key when the dialog closes
and reopens within the page; **Retry grant** confirms the result without another
award. Definite initial rejection permits a fresh request. Grants lock the
recipient's wallet and reject unsafe totals before committing.

## Private profile and shop

Users see a compact Credits/Beskar balance card and a **Beskar & Credits** tab
only on their own profile. **More info** opens its **What is this** subpage;
**Shop** and **Transactions** are the other two subpages. The profile URL uses
`userTab=currencies`, with **What is this** as the default; `currencyPage=shop`
or `currencyPage=transactions` opens the other subpages. **More info** scrolls
to the section, including on mobile. Old
`userTab=transactions` links still open transaction history.

`GET /api/user/:id/wallet` and `GET /api/user/:id/transactions?page=1`
enforce ownership, including against other administrators. Responses are private
and not cacheable. History is paginated (25 entries) and excludes source keys,
provider member/payment identifiers and admin attribution.

The owner's Shop subpage sells one additional achievement slot for
**5 beskar** and one additional Battlefield slot for **3 beskar**. Defaults remain
one slot each. Purchases increase the existing profile entitlements so achievement
selection and Battlefield creation use the purchased slots immediately.
Battlefields retain their existing maximum of 100 slots; achievement limits
remain bounded by the database integer range.

The authenticated `/shop` URL redirects to the caller's profile Shop subpage.

`GET /api/shop` returns the catalog and the caller's wallet.
`POST /api/shop/purchases` accepts only `{ itemId, requestId }` and requires
`X-Requested-With: swubase`. The server derives the buyer from the session and
the price from its catalog. It locks the wallet, checks funds/limits, appends a
negative beskar entry with `source = 'shop'`, and increments the slot limit in
one transaction. A failed entitlement write also rolls back its charge.
The receipt key `shop:<userId>:<requestId>` makes retries safe even after funds
have been spent or the slot cap is reached. Altering the item on a reused request
is a conflict. Unconfirmed purchases can be retried after closing/reopening their
dialog or browsing the other subpages within the Beskar & Credits section.

Battlefield models still use credits as a reusable budget: saving or duplicating
layouts checks their cost but does not debit credits.

## Support providers and development data

[Patreon](patreon-integration.md) keeps its membership/reconciliation records
separate from the wallet. Each verified new USD cent awards 10 credits and one
hundredth of beskar in the same transaction as its credited checkpoint.

A future Stripe integration should append both currency awards with
`source = 'stripe'` and a distinct, stable source key per payment and currency,
such as `stripe:credits:<paymentId>` and `stripe:beskar:<paymentId>`. Keep
payment/refund verification and reconciliation records provider-specific, and
write both awards/checkpoints transactionally. The trigger then updates the
same balances automatically. Stripe is not implemented yet.

The existing contributor sanitizer clears the entire profile and ledger,
including currencies, entitlements, purchases and admin attribution, regardless
of opt-in. Restored dumps retain migration history; development accounts regain
the starting grant on session creation/refresh.

## Validation

```bash
SWUBASE_CREDITS_DB_TEST=1 bun --env-file=.env --env-file=.env.worktree test server/lib/credits server/routes/admin/credits server/routes/shop.test.ts server/routes/user/wallet.test.ts
PATREON_DB_TEST=1 bun --env-file=.env --env-file=.env.worktree test server/lib/patreon
USER_ACHIEVEMENTS_DB_TEST=1 USER_PROFILE_DB_TEST=1 bun --env-file=.env --env-file=.env.worktree test server/lib/user-profile
BATTLEFIELD_BROWSER_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/tests/user-credits.browser.ts
BATTLEFIELD_BROWSER_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/tests/user-currencies.browser.ts
bunx drizzle-kit check --config=drizzle.config.ts
bun --env-file=.env --env-file=.env.worktree run db-migrate
bun run --cwd frontend build
```
