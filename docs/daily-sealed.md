# Daily sealed homepage

The **Today** homepage offers one shared, public, eight-pack sealed pool per UTC
day. The pool belongs to the seeded `swubase` account. Players use the existing
limited deckbuilder. The homepage's **Build this pool** link preselects Public
for the new deck; players can change visibility before creating it. Private and
unlisted decks do not contribute to its gallery or counts.

## Schedule generation

Apply database migrations before enabling the job:

```bash
bun run db-migrate
```

Configure a daily Coolify task with schedule `0 0 * * *`, using UTC for the
scheduler, and this command in the application directory:

```bash
bun run server/crons/generate-daily-sealed-pool.ts
```

The application environment supplies `DATABASE_URL`. By default, the job selects
the newest released set supported by `lib/swu-resources/card-pool-info.ts`, using
the release dates in `lib/swu-resources/set-info.ts`. Set `DAILY_SEALED_SET=hmw`
(or another supported released set code) to choose a particular set. Unsupported
sets, unreleased sets, malformed dates, and missing `swubase` ownership fail the
run rather than creating a different pool.

For a missed day, supply the date explicitly:

```bash
bun run server/crons/generate-daily-sealed-pool.ts 2026-10-10
```

`card_pools.daily_date` is unique. Pool metadata and cards are committed in one
transaction; reruns and overlapping processes reuse the original pool, even if
the requested set has changed. Existing players' cards are never rerolled.
The job exits with `0` for creation or an existing day and `1` for failure.
Sentry uses monitor slug `cron-daily-sealed-pool` when configured.

This reuses the existing pack generator: eight packs create 120 persisted card
entries including eight leader pulls. Repeated leaders appear as one homepage
option with a copy count. Common bases remain available through the existing
limited deckbuilder.

## Homepage

The new mode sits between Two-week Meta and Live Weekend. Existing application
and user homepage preferences accept `today`; their defaults remain unchanged.
The mode menu aligns directly below the header artwork, with Discord and Support
alongside it on the right at desktop/tablet widths.
The homepage remembers modes selected in the menu or opened through a
`homeMode` link in the browser under `swubase.homepage-mode`. Opening `/`
uses the last selection; an explicit
`homeMode` URL takes precedence, followed by the local selection, account
default, application default, then Two-week Meta. This also means a remembered
selection takes priority over the site's live-weekend default. Stream watch links do not
overwrite the remembered mode. Invalid or unavailable storage falls back
gracefully, and other tabs observe changes to this browser preference.

Open `/?homeMode=today`. The daily pool occupies the left half of the desktop
homepage. Its leaders overlap in a card hand
that extends beyond the panel. Hover or keyboard focus lifts a card; selecting
one opens its details. The three newest completed public builds appear below
the hand: they need a leader, a base and at least 30 physical main-deck cards
(excluding leaders, bases, the remaining pool and trash). This filter runs before
the query limit. The **View all** count still includes every public build in the pool.
The two columns stack on smaller screens, with light/dark styling throughout.

The date is highlighted on the left, with the set and pack count in the middle
and the build button on the right. Clicking the date opens a calendar with only
available pool dates enabled. Previous/next links skip unavailable dates;
**Back to today** returns to the live daily pool. Dates are shareable through
`/?homeMode=today&poolDate=2026-10-09`. `TodayHome` accepts an optional ISO
`date` prop, and each date has a separate query cache. Omitting it follows the
current UTC day, including after midnight. Missing historical pools show an
empty state with navigation to another day.
When today's pool is unavailable, the latest eligible earlier pool remains
playable with its actual date and a notice that today's pool is pending. A
refresh replaces it with today's pool once generation finishes.
Switching homepage modes clears the archive date, so choosing Today again opens
the current pool.

The build link passes `poolDeckVisibility=public` to the pool detail route.
This overrides the form's initial choice. Without an override, new decks inherit
the pool's Public, Unlisted or Private setting, in both the form and API. Players
can change it before submitting; opening a pool never creates a deck.
Signed-in players with an existing attempt see **Open your build** and a
**Your build for this pool** row for their most recently updated attempt.
**Try another build** opens the new-deck form with Public preselected. Personal
attempts use the authenticated pool-deck endpoint, including private/unlisted
decks, in a separate session-scoped query; they never enter the public gallery.
The personal query refreshes on mounting and after relevant mutations, and its
unused cache is discarded immediately.

**Pool discussion** expands the shared comments UI below the daily pool. Each pool
has its own `daily-pool` discussion. Opening it pins the URL to that pool’s date
without remounting the panel, so midnight cannot switch an active draft to another
thread. The discussion is readable by everyone while the pool is public,
ready, unarchived and owned by `swubase`. Any signed-in user may comment or reply,
edit their own comments, and remove them. Administrators can moderate the thread.
Reply notifications link to the correct day, expand the discussion and focus the
comment using `poolDate`, `poolDiscussion=true` and `poolComment`. Date navigation
clears the focused comment; changing homepage modes also closes the discussion.
The existing draft navigation guard applies to collapsing or leaving it.

`GET /api/card-pools/:id/discussion` resolves the discussion ID and permissions;
comments use the existing `/api/discussions` endpoints and viewer-scoped caches.
Migration `0083_daily_sealed_pool` contains this branch's complete schema change:
the daily date/index, discussion binding, and lifecycle triggers. Pools receive a
thread when they acquire a daily date; deleting the pool deletes its thread.
Authors retain the existing ability to remove their own comments if a pool becomes
unavailable. The contributor-data sanitizer already clears `discussion_comment`
for every attachment type; the new binding stores only resource IDs.

On the viewer's local Saturday and Sunday, the Live Weekend menu has a subtle
green pulse (a static glow with reduced motion). **Weekend action** appears above
the community decks, with event counts, an approved YouTube
stream thumbnail when available, and a link to Live Weekend. It refreshes every
minute. The menu and panel update
at local midnight and when a sleeping tab resumes.

The panel uses the weekend marked Live only when its date matches the viewer's
current local weekend. A past or future live selection shows the awaiting-coverage
message and the current weekend's dates, without event counts or a stream thumbnail.

**What others are brewing** shows the three
newest public Premier decks by creation time. The deck-list query excludes
the seeded `swubase` user before pagination; private and unlisted decks are never
included, even for their owner. Each author has an avatar (or initials); clicking
the avatar or name opens the same profile popover used in discussions. Deck rows
open the normal deck page. This public query refreshes on returning to Today,
on tab focus when older than a minute, and after deck mutations.

Below it, **Continue with your decks** shows the signed-in user's three
most recently updated Premier decks, including private and unlisted drafts.
The deck lists use the same slim rows, with full leader and base cards extending
past the row edges. The same artwork component is used in deck tables and pool
details, including a third card for two-leader decks. Public sealed builds retain
separate author links. Personal
decks open the normal deck page. The personal section is hidden for signed-out
visitors and while authentication is unresolved. Signed-in players without
Premier decks get a link to their deck library.
The query requests format 1, newest update first, and three results; it refreshes
on returning to Today and after deck mutations. Card edits update the parent
deck timestamp in the same transaction so editing a list moves it forward.

`GET /api/card-pools/daily` returns today's pool (or the latest eligible earlier
pool) and its latest 12 completed public decks (leader, base and 30+ main-deck cards),
plus counts for all public decks and their distinct builders. An optional ISO
`date` query selects another day. Historical requests are exact and return a
null pool when the day has not been generated or its pool is hidden, archived,
or incomplete. Today's fallback excludes those pools and future dates. It never
generates a pool in response to a page visit. The page refreshes every 30 seconds,
on returning to the tab, and after relevant local deck mutations.
Every response includes the requested `date`, the actual challenge date in
`pool.date`, the server's current UTC `today`, and descending `availableDates`
for public, ready, unarchived system-owned pools through today. The calendar
uses those dates without shifting them to an adjacent day in the device's
timezone. Archive navigation and empty-state wording also use the server's day.

## Local checks

Use an isolated worktree database:

```bash
SWUBASE_DAILY_SEALED_DB_TEST=1 bun --env-file=.env --env-file=.env.worktree test server/lib/card-pools/daily-sealed.integration.test.ts
SWUBASE_RECENT_DECKS_DB_TEST=1 bun --env-file=.env --env-file=.env.worktree test server/lib/decks/recentDecks.db.test.ts
bun test server/lib/card-pools/daily-sealed.test.ts server/lib/card-pools/sealed-catalog.test.ts
bun run --cwd frontend build
bun run test:browser:today
bun run test:browser:weekend-action
```

The browser check serves the built frontend on an ephemeral loopback port with
explicit fixture API responses. Its screenshots use illustrative community and
personal decks. It checks presentation, public community discovery, owner/format
query filters, freshness, sign-out, date navigation, remembered homepage modes, and new-deck visibility
without writing application data. The database checks exercise the real list
visibility, system-owner exclusion before pagination, and card-edit timestamps separately.
The weekend-action browser check covers local weekend boundaries, selected-live-weekend
coverage, thumbnail approval/fallback, polling, navigation and reduced motion.
