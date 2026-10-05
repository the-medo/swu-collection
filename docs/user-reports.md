# User reports

Signed-in users can report another user from their public profile or a
conversation header. The reason is required and limited to 2,000 characters.
Submitting a report does not notify the reported user or apply an automatic
penalty. Administrators review the evidence and decide on account restrictions.

## Backend configuration

Set these in the backend environment:

```dotenv
DISCORD_USER_REPORTS_ENABLED=true
DISCORD_USER_REPORTS_CHANNEL_ID=1556212120612511795
DISCORD_RESOURCE_SUBMISSIONS_ROLE_ID=1350878582532214784
```

The role is shared with resource submissions. The existing `DISCORD_BOT_TOKEN`
must have View Channel, Send Messages, Embed Links, and permission to mention
that role in the report forum. Set `DISCORD_APP_BASE_URL` to the deployed app
origin for report-detail and history links. Keep the forum restricted to moderators.

Discord delivery is disabled unless explicitly enabled. Development tests use
injected Discord clients or dry runs, so they do not ping the real forum.

## Storage and delivery

`POST /api/user-reports` requires an authenticated session and the
`X-Requested-With: swubase` header. `shared/types/userReports.ts` defines the
strict input contract. The response contains only the report ID and timestamp;
there is no public report-list endpoint.

`user_report` stores the reporter, reported user, reason, profile/conversation
source, submission ID, and creation time. Participant IDs and display names are
also recorded as submission snapshots. Reports and these snapshots remain for
moderator review after account deletion; the live account foreign keys become
null. The timestamp and reported-user indexes support operator queries for recent reports
and a user's report history. Automatic retention expiry is not implemented.

Each reporter may submit five reports per rolling 24 hours. A database lock
serializes simultaneous submissions, and the client submission ID makes a retry
return the original receipt without another report or notification.

`0067_user_avatars_and_reports.sql` creates the avatar-source, report, and
moderation-action tables together, after main's `0066` migration. This replaces
the feature branch's original four migrations. Development databases that already
applied those four need their migration records reconciled after verifying the
same final schema, or a deliberate rebuild of disposable development data;
do not apply the consolidated `CREATE TABLE` statements over existing tables.

After the report transaction commits, the backend attempts one forum post with
the same role-only mention policy as resource submissions. Discord failure does
not undo the report. The existing `discord_notification` log uses the
`user-report` notification type and a `user-report:{id}` scope key; it records
delivery success or a redacted failure code. The helper supports dry runs and
deduplicates known successful sends. There is no automatic retry worker;
operators should inspect failed/missing deliveries if Discord is unavailable.

Report and admin moderation requests are excluded from Sentry events and traces.
Contributor-dump sanitization removes every report, moderation decision, and
report Discord log payload, including for users who opted into development-data
sharing.

## Validation

Run the focused report routes, Discord tests, frontend build, and browser checks.
Database tests are opt-in and require an isolated worktree database:

```bash
SWUBASE_USER_REPORTS_DB_TEST=1 bun --env-file=.env --env-file=.env.worktree test server/lib/user-reports/service.db.test.ts
```

## Administration

Open `/admin?page=user-reports` for the paginated open queue. Historic reports
contains resolved reports; All includes both. Each report has a bookmarkable URL:
`/admin?page=user-reports&reportId=<report UUID>`. Discord posts link directly to
that view and include sent/received/open counts for both participants at the time
of submission, plus links to their complete history. Older Discord posts are not
rewritten.

The detail view shows the submitted description and participant snapshots,
current account status, both participants' sent and received reports, and prior
moderation decisions. The Reports tab on `/users/<userId>?userTab=reports` is
visible only to admins. Deleted accounts remain reviewable through the report
and `/admin?page=user-reports&reportUserId=<user ID>`.

Administrators can:

- Close a report without an account action, with a required explanation.
- Suspend either participant for 1–365 days, or ban them indefinitely. These
  actions resolve the report, revoke all current sessions, and set the existing
  Better Auth restriction fields. Better Auth prevents new sessions during the
  restriction and clears an expired suspension when the user next signs in.
  Auth session lookups and mutations also reject active restrictions, including
  a session created by a sign-in that overlapped the decision. Existing event
  sockets recheck session authorization before sends and close with code 4401
  when access is revoked.
- Restore an account's current access restriction, including one imposed through
  another report. The confirmation explains this scope; prior decisions remain.
- Reopen a resolved report for further review.

Self, administrator, and system accounts are protected from account actions in
this workflow. Deleted accounts can still have their reports closed or reopened.
A new suspension cannot shorten an existing restriction. To change a resolved
report's sanction, reopen it first; restoring access is also available directly.
No warnings, automatic strike thresholds, email notifications, or appeals queue
are implemented. Public pages remain readable while signed out.

Failed social sign-ins use Better Auth's `onAPIError.errorURL` and
`errorCallbackURL` to open `/auth/error`. It distinguishes temporary suspensions
(with an exact end date in the browser's local time) from indefinite bans.
Both the legacy `banned` and current `BANNED_USER` callback codes load the
private restriction notice.
The page checks for expiry or restored access every minute while visible,
increasing to every five seconds near a suspension's end; users can sign in
again once access returns. Other sign-in failures get a
generic retry page. The default `/api/auth/error` endpoint also redirects here,
including an error page already open in the browser.

The `restriction-notice` Better Auth plugin runs before the admin plugin's
session-creation hook. Once the OAuth identity is verified, it issues a signed,
HttpOnly, worktree-scoped cookie valid for 15 minutes; the admin plugin still
enforces the restriction and the OAuth callback redirects to the error page. Its
`GET /api/auth/account-restriction` endpoint accepts only that proof and returns
the current status and optional expiry with `private, no-store` caching. It
does not create a session, accept a user ID from the browser, or disclose private
moderation reasons. Missing, expired, or invalid proof shows a generic
restriction notice and asks the user to sign in again. If proof expires while
the page is open, its last verified restriction remains visible but is explicitly
labelled stale; polling stops until the user signs in again. Successful sign-in
and new sign-in attempts clear the notice cookie.

`user_report.status`, `resolved_at`, and `revision` track review state. The
append-only `user_report_action` audit table records the actor, affected account,
action, reason, duration/expiry, timestamp, and identity snapshots. Restriction,
session revocation, report state, and audit writes share one database transaction.
A report revision check prevents stale concurrent decisions; a client decision
UUID makes identical retries safe. Histories survive participant deletion and
renaming. Audit entries cover this reporting workflow; unrelated legacy Better
Auth administrative API calls do not create report decisions. Legacy ban/unban
permissions are now admin-only; organizers and moderators cannot bypass this
workflow through those endpoints.

The `/api/admin/user-reports` route family requires the existing admin gate for
all reads and writes, including user histories. Its POST `/:reportId/actions`
accepts only the shared validated decision contract and requires
`X-Requested-With: swubase`. Responses use private/no-store caching. Frontend
query keys include the reviewing account and drop inactive private history data.

Validate report moderation against an isolated worktree database:

```bash
SWUBASE_USER_REPORTS_DB_TEST=1 bun --env-file=.env --env-file=.env.worktree test server/lib/user-reports/moderation.db.test.ts
```

These tests use synthetic users and do not send Discord messages.

Verify native OAuth rejection, notice privacy, and expiry with
`server/auth/restrictionNotice.db.test.ts` under the same opt-in command. With
the worktree app running, exercise the error page and its recovery states:

```bash
SWUBASE_USER_REPORTS_DB_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/scripts/auth-error-smoke.ts
```

The browser check creates and removes its own fixture account, covers responsive
light/dark views, and saves local screenshots under the ignored `.swubase/`.
