# Live Tournament Homepage Mode Plan

## Summary
Build a full v1 "Live" homepage mode for tournament weekends. The existing daily snapshot remains available as the `snapshot` homepage mode, while the new `live` mode shows the active tournament weekend, running/finished/upcoming/unknown tournaments, approved streams, watched players, and weekend meta data. Admins prepare weekends, attach tournament groups, toggle the live weekend, reconcile included tournaments, approve submitted links, and manually trigger live checks.

Key decisions:
- Replace the current `liveTournamentMode` boolean with scalable `homepageMode: 'snapshot' | 'live'` in application configuration.
- Add user setting `homepageMode: 'default' | 'snapshot' | 'live'`, where `default` follows application configuration.
- Use weekend-scoped WebSockets for logged-in live viewers and update TanStack Query cache from socket messages. Public/unauthenticated viewers use normal query refetch fallback.
- Discord bot notifications are out of v1, but backend events should be structured so they can be reused later.

## Data Model And Migrations
Add Drizzle schema files for these tables, keeping index names short:

- `tournament_weekend`: `id`, `name`, Saturday `date`, `is_live`, denormalized status counters, timestamps. Add a partial unique index so only one row can have `is_live = true`, plus an index on `date`.
- `tournament_weekend_tournament_group`: join table for weekend to tournament groups, with `weekend_id`, `group_id`, `format_id`, `meta_id`, composite primary key, and indexes for weekend/group lookup.
- `tournament_weekend_tournament`: join table for weekend to tournament, with `status: upcoming | running | finished | unknown`, `has_decklists`, `additional_data`, current round fields, match counters, `exact_start`, `last_updated_at`, and timestamps. Use `(weekend_id, tournament_id)` as primary key.
- `player`: repo-style singular table for Melee players, with integer Melee `id`, `display_name`, nullable verified `user_id`, and `updated_at`.
- `tournament_standing`: one row per tournament/player/round, with rank, points, match/game record strings, and indexes by tournament/round/player.
- `tournament_weekend_match`: live-match rows independent from imported `tournament_match`, with tournament, round, dedupe key, player ids, optional leader/base fields, game wins, and nullable `updated_at`.
- `tournament_weekend_resource`: stream/VOD submissions for tournaments, based on `entity_resource` fields but with `tournament_id`, nullable `user_id`, and `approved`.
- `player_watch`: `(user_id, player_id)` primary key for watched Melee players.
- `tournament_import`: queue table with `tournament_id`, `status: pending | running | finished | failed`, timestamps, attempts, and `last_error`.

Also add separate short indexes to `entity_resource` for `entity_type`, `entity_id`, and `resource_type`.

Migration process:
- Generate schema migration with `bun db-generate`.
- Review generated SQL and snapshot per [migrations.md](C:/Users/marti/Desktop/Projects/swu-collection/docs/migrations.md).
- Add custom SQL to migrate existing `application_configuration.liveTournamentMode` into `homepageMode`, then leave old keys ignored by the new parser.
- Run `bun db-migrate` after review.

## Backend Implementation
Add a top-level `tournament-weekends` Hono route:
- Public/optional-auth reads:
  - `GET /api/tournament-weekends` list newest first.
  - `GET /api/tournament-weekends/live` - this will return only ID of the currently LIVE tournament weekend
  - `GET /api/tournament-weekends/:id/detail`
  - `POST /api/tournament-weekends/:id/resources` for logged-in stream/VOD submissions.
  - `GET/POST/DELETE /api/player-watch` for logged-in watchlist management.
- Admin-protected mutations:
  - `POST /api/tournament-weekends` create weekend from name + Saturday date and auto-fill all tournaments whose `date`/`days` overlap that Saturday-Sunday.
  - `PATCH /api/tournament-weekends/:id` edit name/date and toggle `is_live` transactionally.
  - `POST/DELETE /api/tournament-weekends/:id/tournament-groups` manage attached groups.
  - `POST /api/tournament-weekends/:id/refresh-tournaments` reconcile missing/extraneous weekend tournament rows.
  - `POST /api/tournament-weekends/:id/check` manually run checks for all unfinished tournaments with Melee ids.
  - `PATCH /api/tournament-weekends/:id/resources/:resourceId` approve/reject submitted links.

Add `server/lib/live-tournaments`:
- `liveTournamentCheck({ weekendId, tournamentId })`: fetch Melee tournament detail, update `exact_start`, `status`, attendance/player count if available, `has_decklists`, `last_updated_at`, and weekend counters.
- If running, call `liveTournamentProgressCheck`.
- If finished and decklists are published, enqueue `tournament_import` with `onConflictDoNothing`.
- `liveTournamentProgressCheck`: fetch current/final round ids, standings, and round matches; upsert players, standings, and live matches; update current round name/number and match counters.
- Derive undefeated players for Swiss rounds 4+ from standings where the match record has zero losses.
- Derive bracket display from live matches whose round name is Quarterfinals, Semifinals, or Finals.
- Publish WebSocket events after any persisted live update.

Add standalone cron scripts:
- Hourly reconcile script: verify active weekend membership matches overlapping tournaments and report mismatches to Sentry.
- Every 3 minutes: check unfinished active-weekend tournaments with Melee ids.
- Every minute: process one pending `tournament_import`, call existing `runTournamentImport`, mark `tournament.imported`, recompute statistics, update tournament group stats, and generate thumbnails.
- Register Sentry monitor slugs for the three new cron scripts.

Add WebSocket route:
- `GET /api/ws/live-tournaments/:weekendId`
- Require logged-in user, validate origin like existing game-results sockets, register the socket in a weekend room, support `ping`, and send `live_weekend.connected`.
- Message types: `live_weekend.summary`, `live_tournament.updated`, `live_tournament.standings_updated`, `live_tournament.matches_updated`, `live_resource.approved`, `tournament_import.finished`.

## Frontend Implementation
Homepage:
- Update the root route to resolve mode in this order: `homeMode` search param, user setting if not `default`, application configuration, then fallback `snapshot`.
- Render existing `DailySnapshots` for `snapshot`.
- Add `LiveTournamentHome` for `live`, backed by `useLiveTournamentWeekend`.
- Add a compact mode switcher that can set the user preference when logged in and can use the search param for one-off viewing.

Live homepage sections:
- Weekend header with counts, last update, and links to Melee/streams where relevant.
- Running tournaments: country, player count, current round, remaining matches, undefeated players from round 4+, bracket if top cut has started, Melee link, approved stream link.
- Finished tournaments: country, player count, bracket, Melee/stream links, and winning leader/base when imported deck data exists.
- Upcoming and unknown tournaments: country, start time when known, Melee link when known, and submission prompts for missing Melee/stream links.
- Streams panel: approved running/prepared streams from `tournament_weekend_resource`.
- Watched players: allow logged-in users to add/remove by Melee id/name and show watched players active in the weekend.
- Meta pie chart: use attached weekend tournament groups and existing `tournament_group_leader_base` data, reusing/adapting current Nivo pie chart patterns.

Admin UI:
- Add `tournament-weekends` to admin page search enum and tab list.
- New admin page shows weekends newest first, create form, live toggle, status counters, and expandable rows.
- Expanded row manages attached tournament groups, shows weekend tournaments, exposes manual check/reconcile buttons, and includes resource approval controls.
- Reuse existing format/meta/tournament group selectors and table/card primitives.

Client data:
- Add API hooks for application configuration, tournament weekends, resources, player watch, and admin mutations.
- Add `useLiveTournamentSocket(weekendId)` that connects only for logged-in users and patches/invalidate TanStack Query cache from WebSocket messages.
- Use query refetch fallback for guests and for socket disconnects.

## Validation And Acceptance
Automated checks:
- `bun db-generate` output reviewed for short index names and correct partial unique live-weekend constraint.
- `bun db-migrate` succeeds locally.
- Root TypeScript check succeeds.
- `cd frontend && bun run build` succeeds.
- Add unit-level tests or fixture scripts for Melee parsing functions using saved HTML/JSON samples for tournament detail, standings, and round matches.

Manual scenarios:
- Admin creates a weekend from a Saturday date and sees all overlapping tournaments populated.
- Admin toggles a weekend live and any previously live weekend is unset.
- Live homepage resolves by app config, user setting, and `homeMode` URL override.
- Tournament with no Melee id appears as unknown and prompts for Melee id/stream.
- Running tournament updates round/match counters and pushes a socket cache update.
- Round 4+ running tournament shows undefeated players.
- Top cut rounds render as bracket sections.
- Finished tournament with published decklists enters import queue and later displays winning leader/base.
- Stream submission rejects non-YouTube/non-Twitch URLs and remains hidden until approved.
- Watched player appears when that player is in standings or live matches.
- If no active weekend exists, live mode shows an empty-state message and keeps snapshot mode available.

## Assumptions
- `plan.md` belongs beside the description in `.ai/planning/feature-live-tournaments/`.
- Weekend membership means tournaments whose `date` and `days` overlap the configured Saturday-Sunday.
- Only YouTube, youtu.be, and Twitch URLs are accepted for user-submitted stream/VOD resources.
- Existing Melee scraping continues to use `TOURNAMENT_COOKIE` and `TOURNAMENT_ORIGIN`.
- Imported tournament/deck data remains the source of truth for final leader/base visibility; live rows may have null leader/base until decklists are published/imported.
- The daily snapshot dashboard is retained as `snapshot`, not removed.
