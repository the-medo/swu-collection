# Stripe support

`/support` offers monthly support at 5, 10 or 20 in EUR or USD and one-time
support with an amount entered in Stripe Checkout. Users sign in before
checkout so rewards belong to that SWUBASE account. Stripe customer records
are created without an email-based ownership link. Patreon remains available.

## Configuration

Set these server-only values in the environment for the intended account:

```dotenv
STRIPE_MODE=test
STRIPE_ACCOUNT_ID=acct_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PORTAL_CONFIGURATION_ID=bpc_...
```

`BETTER_AUTH_URL` is the trusted application origin for Checkout and portal
returns. Local environments require sandbox keys; production requires live keys,
`STRIPE_MODE=live` and an HTTPS origin. The service verifies the API account ID
and the mode of provider objects. A restricted key can also be used if it has
the required account, customer, price, Checkout, subscription, invoice,
InvoicePayment, PaymentIntent, charge, dispute and billing portal permissions.

Stripe CLI's OAuth login can configure sandbox products and listen to events,
but does not supply a durable secret key to the backend. Reveal/create that key
in the intended sandbox's Dashboard API keys page and keep it in the local
`.env`; never commit it or expose it through `VITE_*`. The CLI listener secret
belongs to that local listener, not to a Dashboard webhook endpoint.

### Price catalog

Create active prices with these exact lookup keys in each account. The server
checks currency, billing interval, quantity and the chosen fixed amount.

| Lookup key                            | Configuration                                     |
| ------------------------------------- | ------------------------------------------------- |
| `swubase_support_monthly_eur_5`       | EUR 500 cents, monthly                            |
| `swubase_support_monthly_eur_10`      | EUR 1,000 cents, monthly                          |
| `swubase_support_monthly_eur_20`      | EUR 2,000 cents, monthly                          |
| `swubase_support_monthly_usd_5`       | USD 500 cents, monthly                            |
| `swubase_support_monthly_usd_10`      | USD 1,000 cents, monthly                          |
| `swubase_support_monthly_usd_20`      | USD 2,000 cents, monthly                          |
| `swubase_support_one_time_eur_custom` | EUR, one time, `custom_unit_amount[enabled]=true` |
| `swubase_support_one_time_usd_custom` | USD, one time, `custom_unit_amount[enabled]=true` |

Use `SWUBASE Monthly Support` and `SWUBASE One-Time Support` products. For example,
after selecting the intended sandbox with `stripe whoami`:

```bash
stripe post /v1/prices -d product=prod_... -d currency=eur -d unit_amount=500 \
  -d 'recurring[interval]=month' -d lookup_key=swubase_support_monthly_eur_5
stripe post /v1/prices -d product=prod_... -d currency=eur \
  -d 'custom_unit_amount[enabled]=true' \
  -d lookup_key=swubase_support_one_time_eur_custom
```

Consult `stripe prices create --help` for your installed CLI; bracket fields
can always be passed with `-d`. Sandbox prices do not transfer to live mode.
Existing Payment Links are useful to inspect the catalog but do not link a
supporter to their SWUBASE account. Application rewards require the signed-in
Checkout flow.

### Customer portal

Create a portal configuration with invoice history and payment-method updates
enabled, subscription cancellation enabled **at period end**, and subscription
updates disabled. Set its ID in `STRIPE_PORTAL_CONFIGURATION_ID`. The service
verifies these cancellation/update settings before opening the portal. Users
can cancel future renewals there; changing tiers or currencies requires waiting
for cancellation to finish and starting a new subscription.

### Webhooks

Register `POST /api/integration/stripe/webhook` for:

- `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
  `checkout.session.async_payment_failed`, `checkout.session.expired`
- `invoice.paid`, `invoice.payment_succeeded`
- `charge.refunded`, `charge.dispute.created`, `charge.dispute.updated`,
  `radar.early_fraud_warning.created`

The handler verifies the signature over the exact raw body and re-fetches
provider state. Subscription metadata or a redirect alone never awards rewards.
Failures return 503 for Stripe to retry; unrelated objects return success.

For this worktree, check `swubase-worktree-dev status` for the backend port and
run the listener separately:

```bash
stripe listen --events-from @self --latest \
  --events checkout.session.completed,checkout.session.async_payment_succeeded,checkout.session.async_payment_failed,checkout.session.expired,invoice.paid,invoice.payment_succeeded,charge.refunded,charge.dispute.created,charge.dispute.updated,radar.early_fraud_warning.created \
  --forward-to http://127.0.0.1:BACKEND_PORT/api/integration/stripe/webhook
```

Use the listener's signing secret locally. For production, create a Dashboard
endpoint and use that endpoint's signing secret. Configure tax behavior and any
applicable tax registrations for the live business separately; this feature
does not enable automatic tax or choose a tax classification.

## Receipts, rewards and recovery

The server reserves a UUID checkout request in PostgreSQL before calling Stripe.
It uses stable customer/Checkout idempotency keys. Retrying a request returns the
same session; changing its option is a conflict. One pending monthly checkout
per customer and provider subscription checks prevent duplicate subscriptions.
The page offers Resume/Cancel for pending monthly checkouts. Sessions expire
after 24 hours; a stale reservation with no known provider ID can be cancelled
after that expiration. Creation recovery never reuses a Stripe idempotency key
after its guaranteed retention period.

The success page verifies the owner's receipt and polls pending payments for
about a minute. The webhook handles payments that finish after the user leaves.
Each paid subscription invoice has its own PaymentIntent identity, so every
renewal grants once even when both Checkout and invoice events are delivered.
Only real, successful, captured payments count. Manual settlements, customer
balance, split payments, and subscription changes require review.
These permanent outcomes persist a customer hold and the exact review invoice
ID on the subscription's checkout, without granting rewards, and are acknowledged.
Temporary failures remain retryable.

Rewards use support before payment-processing fees and exclude tax. Each USD
cent grants 10 credits and one hundredth of beskar. EUR conversion uses the most
recent ECB USD reference rate on or before the charge date (UTC), rejecting rates
over eight days old. Amounts round half-up to USD cents. The exact rate/date,
converted amount, both ledger awards and payment checkpoint persist together;
a replay does not fetch a new rate. Temporary FX/provider failures leave awards
pending for retry, with no estimated or partial grants.

`stripe_customer`, `stripe_checkout` and `stripe_payment` contain private provider
identifiers, ownership and accounting checkpoints. Account deletion nulls
ownership but keeps provider receipts, preventing email reassignment or duplicate
awards. Contributor sanitization always clears all three tables regardless of
data-sharing opt-in. Support endpoints/webhooks are excluded from Sentry event
and transaction payloads; integration errors log only a bounded category/code.

### Operator review

Before removing a SWUBASE user through administration or SQL, cancel their
SWUBASE subscription in Stripe and expire unfinished monthly Checkout sessions.
SWUBASE currently does not enable self-service account deletion. Deleting its
database user alone does not call Stripe. As a fallback, observing an invoice
for a deleted owner cancels that subscription without proration or a final
invoice and flags the orphan for review. This stops future renewals, but does
not undo a payment already received before that observation.

Refunds, disputes, early fraud warnings and risky charges place a sticky customer
hold. Previously granted rewards remain recorded; automatic subtraction could
overdraw spent beskar. Future payments remain uncredited on hold, while portal
access stays available. Refund or dispute resolution does not release the hold
automatically.

`stripe_customer.review_keys` records each observed invoice/payment/refund/
dispute review cause once. Clearing a customer hold after a human review keeps
these checkpoints: replaying an old cause must not re-arm a resolved hold. A new
refund amount, dispute status or anomalous invoice does create a new hold.
`stripe_checkout.review_invoice_id` points to the latest newly observed invoice
anomaly; all reviewed invoice identities remain in the customer's checkpoints.

Review the actual Stripe payment/refund/dispute and the customer's receipts
before making an accounting decision. Use the existing admin currency grant UI
only for a deliberate positive adjustment; it does not clear provider holds.
For a verified resolution, an operator can clear `stripe_customer.review_required`
for the exact customer in a locked database transaction. Clear a specific
`stripe_payment.review_required` only when that payment is verified eligible;
never clear refunded/disputed receipts merely to unblock future payments. Never
edit credited amounts, delete source keys, reassign orphaned ownership, or change
cached wallet totals directly. Clearing a hold does not grant pending receipts:
redeliver the original event from Stripe, or recheck the owner's checkout.

## Validation

```bash
SWUBASE_STRIPE_DB_TEST=1 bun --env-file=.env --env-file=.env.worktree test server/lib/stripe
bunx drizzle-kit check --config=drizzle.config.ts
bun --env-file=.env --env-file=.env.worktree run db-migrate
bun run --cwd frontend build
```

Database tests require the isolated loopback worktree PostgreSQL database. They
cover concurrent replay, transactional grants, FX persistence, refund holds,
deleted ownership, checkout retries, monthly reservations, renewals, manual
payments, CSRF and webhook signatures. Complete a real sandbox Checkout before
enabling live payments; simulated contracts alone do not prove account setup.
