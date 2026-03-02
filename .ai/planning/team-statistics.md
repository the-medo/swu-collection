# Team Statistics — Feature Plan

> **Always update this planning document when you do stuff!**

## Overview

Add a **Team Statistics** page at `/teams/{teamId}/statistics` that reuses the existing personal statistics UI (`/statistics`) but displays aggregated game results for all members of a given team. The feature is split into two parts: Part 1 mirrors the existing statistics view for a team, and Part 2 adds team-specific enhancements (per-member breakdown and "InTeam" filtering).

---

## Reference: Existing Statistics Architecture

| Layer | Location |
|---|---|
| FE route | `/frontend/src/routes/statistics/` (layout + 5 sub-routes: dashboard, history, decks, leader-and-base, matchups) |
| FE components | `/frontend/src/components/app/statistics/` |
| Data hook | `useGameResults.ts` — transforms raw API data into `StatisticsHistoryData` (games, matches, byDate, byLeaderBase, byDeckId) |
| API hook | `/frontend/src/api/game-results/useGetGameResults.ts` — already accepts `teamId` param & scopes Dexie cache by `teamId` |
| Backend endpoint | `/server/routes/game-results/get.ts` — accepts `teamId` in query schema and filters by team members when provided |
| DB schema | `game_result` table — has `userId`, no `teamId` column |
| Team schema | `team` + `team_member` tables — `team_member(teamId, userId, role)` |

Key observations:
- `StatisticsDashboard` already accepts an optional `teamId` prop and passes it to `useGameResults`.
- `StatisticsTabs` accepts a `basePath` prop for dynamic tab links in both personal and team contexts.
- Team `_statisticsLayout.tsx` displays "Team {name} statistics" and fetches by `team.id`.
- The backend endpoint resolves team shortcut to UUID, then JOINs `game_result` with `team_member` when `teamId` is provided.

---

## Part 1: Team Statistics Page (mirror of personal statistics)

### 1.1 Backend — Update game results endpoint

**File:** `server/routes/game-results/get.ts`

- [x] When `teamId` query param is provided:
  - Resolve shortcut to actual team UUID if needed (using `isUuid` check + team table lookup)
  - Verify the requesting user is a member of the team (reuse `getTeamMembership` from `server/lib/getTeamMembership.ts`)
  - Return 403 if not a member
  - Query `game_result` rows where `userId IN (SELECT userId FROM team_member WHERE teamId = :teamId)` instead of filtering by the single authenticated user
  - Apply the same date range filters (`datetimeFrom` / `datetimeTo`) as the personal query
- [x] When `teamId` is **not** provided, keep existing behavior (personal stats by `user.id`)

### 1.2 Frontend — New route: `/teams/$teamId/statistics`

**New files under:** `frontend/src/routes/teams/$teamId/statistics/`

- [x] Create route structure mirroring `/statistics/`:
  - `index.tsx` — redirects to `/teams/$teamId/statistics/dashboard`
  - `_statisticsLayout.tsx` — team statistics layout (see 1.3)
  - `_statisticsLayout/dashboard/index.tsx`
  - `_statisticsLayout/history/index.tsx`
  - `_statisticsLayout/decks/index.tsx`
  - `_statisticsLayout/leader-and-base/index.tsx`
  - `_statisticsLayout/matchups/index.tsx`
- [x] Each sub-route renders the **same component** as its `/statistics/` counterpart, but passes `teamId` from route params

### 1.3 Frontend — Team statistics layout

**New file:** `frontend/src/routes/teams/$teamId/statistics/_statisticsLayout.tsx`

- [x] Extract `teamId` from route params (`Route.useParams()`)
- [x] Call `useGetGameResults({ teamId, datetimeFrom, enabled })` instead of using `session.data?.user.id`
- [x] Display team name in header (e.g., "Team {name} statistics") — use `useTeam(teamId)` hook
- [x] Render `StatisticsFilters` (same as personal)
- [x] Render `StatisticsTabs` — but with team-aware paths (see 1.4)
- [x] Render `<Outlet />` for sub-pages
- [x] Define `statisticsSearchParams` (same zod schema as personal layout)

### 1.4 Frontend — Make `StatisticsTabs` route-aware

**File:** `frontend/src/components/app/statistics/StatisticsTabs/StatisticsTabs.tsx`

- [x] Accept an optional `basePath` prop (default: `/statistics`) or a `teamId` prop
- [x] Generate tab links dynamically based on context:
  - Personal: `/statistics/dashboard`, `/statistics/history`, etc.
  - Team: `/teams/{teamId}/statistics/dashboard`, `/teams/{teamId}/statistics/history`, etc.
- [x] Keep the same tab keys, labels, and search param forwarding

### 1.5 Frontend — Pass `teamId` through statistics subpage components

Several components already accept `teamId` (e.g., `StatisticsDashboard`). Verify and update all subpage components:

- [x] `StatisticsDashboard` — already accepts `teamId` ✓; fix hardcoded "View full match history" link to be context-aware
- [x] `StatisticsHistory` — pass `teamId` to `useGameResults`
- [x] `StatisticsDecks` — pass `teamId` to `useGameResults`
- [x] `StatisticsLeaderBases` — pass `teamId` to `useGameResults`
- [x] `StatisticsMatchups` — pass `teamId` to `useGameResults`

### 1.6 Frontend — LeftSidebar: chart icon for team statistics

**File:** `frontend/src/components/app/navigation/LeftSidebar/LeftSidebar.tsx`

- [x] In the teams sub-items list (where each team is rendered with `title` and `url`), add a small chart icon button (`ChartSpline` or `BarChart3` from lucide-react) next to each team link
- [x] The icon button links to `/teams/{team.shortcut ?? team.id}/statistics`
- [x] Icon should be visually subtle (muted color, small size) so it doesn't compete with the team name link

### 1.7 Frontend — Team detail page: "Statistics" button

**File:** `frontend/src/components/app/teams/TeamPage/TeamPage.tsx` (or `TeamMemberView.tsx`)

- [x] Add a prominent "Statistics" button/link in the top-right corner of the team detail page (visible only to team members)
- [x] Use `Link` to navigate to `/teams/{team.shortcut ?? team.id}/statistics`
- [x] Style as a clearly visible action button (e.g., with `ChartSpline` icon + "Statistics" text)

---

## Part 2: Team-specific enhancements

### 2.1 New "Members" tab in team statistics

- [x] Add a new tab "Members" to `StatisticsTabs` (only shown in team context)
- [x] Create new route: `frontend/src/routes/teams/$teamId/statistics/_statisticsLayout/members/index.tsx`
- [x] Create new component: `frontend/src/components/app/statistics/StatisticsMembers/StatisticsMembers.tsx`
- [x] Fetch team members via existing `useTeamMembers` (or the members GET endpoint)
- [x] For each member, display individual statistics summary:
  - Member name + avatar
  - Win/loss record, win rate
  - Most played leader/base
  - Number of matches in the selected time period
- [x] Collapsible/expandable row per member with leader & base breakdown

### 2.2 "InTeam" filter checkbox

- [x] Add an "InTeam" checkbox to `StatisticsFilters` (only visible in team statistics context)
- [x] When checked, filter game results to only include matches where **both** the player AND the opponent are members of the same team
- [x] Implementation: Hybrid approach — backend supports `inTeam=true` query param (`game-results/get.ts`) that filters by `matchId` shared by 2+ team members; frontend also filters in `useGameResults.ts` by checking matchIds with 2+ distinct userIds (avoids Dexie cache issues)
- [x] Pass `inTeam` filter state through search params (`sInTeam: z.boolean().optional()`) in team statistics layout
- [x] `sInTeam` is preserved across tab navigation in `StatisticsTabs`

---

## Implementation Order

1. **Backend** (1.1) — Update game results endpoint to support `teamId` query ✅
2. **Routes** (1.2) — Create team statistics route structure ✅
3. **Layout** (1.3) — Team statistics layout with team context ✅
4. **StatisticsTabs** (1.4) — Make tabs dynamic ✅
5. **Subpage components** (1.5) — Pass teamId through all statistics components ✅
6. **Navigation** (1.6 + 1.7) — Sidebar chart icon + team detail page button ✅
7. **Members tab** (2.1) — New per-member statistics view ✅
8. **InTeam filter** (2.2) — Intra-team match filtering ✅

---

## Edge Cases & Considerations

- **Authorization:** Only team members should access team statistics. Enforce on both backend (403) and frontend (redirect or error state).
- **Empty state:** Handle teams with no game results gracefully (show empty state messaging).
- **Dexie caching:** `useGetGameResults` already scopes cache by `teamId` — verify that switching between teams invalidates/re-fetches correctly.
- **Large teams:** If a team has many members, the aggregated game results could be large. Consider pagination or limiting the date range.
- **Deck visibility:** In team context, deck names/details might reference other members' decks. Ensure deck lookup works cross-user or shows limited info.
- **Route params:** Teams can be accessed by `id` or `shortcut`. The statistics route uses `$teamId` param — backend resolves shortcut to UUID before querying.
- **Search params preservation:** When navigating between tabs in team statistics, preserve all filter search params (same as personal statistics).
