# Email and password sign-in

Email/password is optional alongside Google and GitHub. It defaults to disabled
until a delivery mode is configured. The dialog reads `/api/auth/email-config`;
provider sign-in remains available while email is disabled or unavailable.

## Account behavior

- Signup asks for a name and email. The email contains a single-use link where
  the mailbox owner chooses their password and verifies the address together.
  The pending credential is unusable before this step and is replaced when the
  owner completes setup. No session is created automatically. Starting credits
  are granted once after setup, using the existing idempotent credit ledger.
- Google/GitHub accounts keep working. After verifying an email registration,
  Google with that same email links to the existing user ID, keeping decks,
  collection, permissions and credits. A different email is a different account.
- Unverified local registrations are deliberately **not** auto-linked to a new
  social identity. Otherwise an attacker could register a victim's address and
  keep password access after the victim signs in with Google. The auth error page
  links to email verification recovery.
- Existing OAuth users can use **Settings → Sign-in & security → Add a password**,
  or **Forgot password?**. Better Auth's reset flow adds the credential to the
  same account; it does not replace its Google/GitHub connection. An older social
  account whose email is unverified verifies it by completing the password link.
- Passwords use Better Auth's hashing and validation (12–128 characters).
  Reset links expire after one hour, are single-use, and revoke all sessions on
  success. Changing a password in settings requires the current password and
  revokes other sessions. Account-setup links also expire after one hour.
- Signup, reset and resend responses avoid confirming whether an address exists.
  Duplicate registrations never overwrite an account or password. A verified
  existing user receives sign-in guidance; an unverified user can get another
  account-setup email. Bare verification JWTs are never emailed; as defense in
  depth, processing one removes any unverified credential before verification.
  This prevents activating a password chosen by someone who does not own the address.

## Local capture

Use the worktree's development-only `.env`:

```dotenv
AUTH_EMAIL_MODE=capture
```

Capture requires `ENVIRONMENT=local` and the worktree's managed auth origin and
secret. Restart using `scripts/worktree-dev/swubase-worktree-dev down` then `up`.
Register through the UI and run this from the repository root:

```bash
bun --env-file=.env --env-file=.env.worktree server/crons/send-auth-emails.ts
```

The worker writes HTML previews and JSON to `.swubase/auth-emails/` with private
filesystem permissions. These contain real local action links: never commit,
publish or attach them to bug reports. Delete previews and browser-test screenshots after testing. Failure diagnostics omit URL query strings. Capture
does not contact Resend. Captured messages cannot later be delivered through
Resend: queued mode and origin must match the worker's current configuration.

The header asset is a 600×180 rendering of the homepage SWUBASE header, using
Theed Palace (Adrien Girod) and Shield Generator Complex (Reno). Email includes
the artwork as a CID attachment and includes a plain-text alternative.

## Production setup

This uses Resend's HTTPS API, not a self-hosted SMTP server. No SMTP ports, MTA,
mailbox hosting or inbound email service are required. Before enabling:

1. Create a Resend sending domain, preferably a dedicated transactional subdomain
   such as `auth.swubase.com`. Publish **the DNS records Resend supplies** for DKIM
   and SPF; add an appropriate DMARC policy and verify alignment. Do not replace
   the site's existing mailbox MX/SPF records with guessed values.
2. Create a sending API key scoped to the verified domain. Configure a sender on
   that domain and, optionally, a monitored reply-to address. Disable click and
   open tracking for these transactional messages: action URLs contain secrets.
3. Apply the database migration before deploying the enabled application.
4. Configure the backend and worker with the same environment:

   ```dotenv
   AUTH_EMAIL_MODE=resend
   RESEND_API_KEY=<server-only key>
   AUTH_EMAIL_FROM=SWUBASE <accounts@auth.swubase.com>
   AUTH_EMAIL_REPLY_TO=<optional monitored address>
   BETTER_AUTH_URL=https://swubase.com
   BETTER_AUTH_SECRET=<existing persistent secret, at least 32 characters>
   ```

5. Schedule `bun server/crons/send-auth-emails.ts` from `/app` in Coolify every
   minute (`* * * * *`). The app does not start a background timer. Configure a
   Sentry monitor named `auth-email-delivery` with the same schedule and alert on
   missed/failed runs. Confirm the cron process inherits all required variables.
6. Send verification and reset messages to operator-controlled Gmail/Outlook
   inboxes; inspect authentication, layout, spam placement, expiry and account
   linking. Test the deployed OAuth callback too. Keep Google/GitHub configured.

Invalid enabled configuration fails startup. To roll back availability, set
`AUTH_EMAIL_MODE=disabled` on app and worker and restart. Credentials remain in
the database, and Google/GitHub accounts remain usable. Existing email-only users
cannot sign in while disabled, so monitor delivery before enabling registration.

Resend acceptance is not proof of inbox delivery. Monitor bounces, complaints,
suppression and quota in Resend. There is no application webhook for delivery
events in this version; provider delivery failures after API acceptance need
operator attention. No production credentials, DNS records, schedule or real
email delivery are provisioned by this code change.

## Queue, limits and privacy

`auth_email_outbox` stores recipients/action URLs and the exact Resend request
encrypted using AES-256-GCM with a key derived from `BETTER_AUTH_SECRET`. A
separately derived HMAC identifies recipient cooldowns without plaintext emails.
Keep the secret stable: rotation makes pending messages unreadable and users
must request new links. Sanitized contributor exports truncate the entire table.

Verification/setup and password-reset messages each have a separate limit of
one message per minute and ten per hour per recipient, using a PostgreSQL
advisory lock. Existing-account notices have their own one-per-day limit and
cannot consume the setup/reset budgets. Cooldowns intentionally
return generic success. Better Auth enables its built-in per-IP endpoint limits
when `NODE_ENV=production` (or `AUTH_RATE_LIMIT_ENABLED=true`). Those IP counters
are process-local; a deployment with multiple app replicas needs a shared limit
store or edge limits. The reverse proxy must replace untrusted forwarded IP
headers and keep the backend private. Recipient limits alone do not protect
against large numbers of unique fake addresses.

The worker claims rows with `FOR UPDATE SKIP LOCKED`, processes up to 20 per run,
and uses a 45-second loop budget with a 10-second request timeout. Overlapping
workers are safe. Retries use the same payload and Resend idempotency key, with
1/2/4/8-minute backoff, at most five attempts. Most permanent HTTP 4xx errors stop
immediately; 408/409/429 retry. Messages expire after 55 minutes so the worker
doesn't send an already-expired one-hour link. A last request can extend the run
past its loop budget. Tune worker frequency/capacity if the queue grows.

Retry-pending attempts are counted separately from terminal failures; only terminal
failures or expired messages fail the cron monitor. Sent, failed and expired rows lose their encrypted payload immediately. Metadata
is deleted after seven days when the enabled worker runs. Local preview files
are separate, manually cleaned development artifacts. Status inspection should
select only `id`, `kind`, `status`, `attempts`, `created_at`, `next_attempt_at`,
`expires_at`, and `last_error`; never log decrypted messages or provider bodies.
A failed row is terminal: fix the cause and request a new email instead of
replaying an old action link.

App access logs redact all auth URLs. Auth pages use `no-referrer` and `no-store`;
Sentry filters auth events and retains only a fixed, context-free alert for auth
5xx responses. Browser analytics exclude auth pages and private forms; private
form containers also block Amplitude session replay capture. Configure reverse-proxy/CDN access logs to redact `/api/auth/*` and
`/auth/*` too: application redaction cannot change upstream logs. Keep email
links out of screenshots, analytics, support messages and error reports.

## Validation

Against a bootstrapped local worktree in capture mode:

```bash
SWUBASE_EMAIL_AUTH_DB_TEST=1 SWUBASE_USER_REPORTS_DB_TEST=1 \
  bun --env-file=.env --env-file=.env.worktree test \
  server/auth/email.db.test.ts server/auth/oauth.db.test.ts \
  server/lib/auth-email/email.test.ts server/lib/auth-email/outbox.db.test.ts
SWUBASE_EMAIL_AUTH_BROWSER_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/tests/email-auth.browser.ts
bun run --cwd frontend build
```

Drain pending local preview messages before the outbox test. The tests use real
Better Auth handlers and database writes, with only the external provider token
exchange replaced by fixtures. They remove their own users and outbox entries.

References: [Better Auth email/password](https://www.better-auth.com/docs/authentication/email-password),
[account linking](https://www.better-auth.com/docs/concepts/users-accounts),
[Resend domains](https://resend.com/docs/dashboard/domains/introduction),
[inline images](https://resend.com/docs/dashboard/emails/embed-inline-images),
[idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys).
