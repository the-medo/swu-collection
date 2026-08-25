---
name: swubase-websockets
description: Add or change SWUBASE authenticated Hono WebSocket routes, room registries, shared realtime events, publishers, client reconnect logic, and Query-cache patch/refetch behavior.
---

# SWUBASE WebSockets and realtime state

Use this skill for `server/routes/ws/`, `server/lib/ws/`, realtime publishers,
frontend socket hooks/contexts, or WebSocket URL environment variables.

## End-to-end contract

- Mount routes below `/api/ws` and preserve Bun's `websocket` export from
  `server/app.ts` through `server/index.ts`.
- Authenticate from the Better Auth session and validate `Origin` against the
  configured app origin before registration. Use WebSocket close codes such as
  4401/4403 for upgraded auth failures where the client needs to stop retrying.
- Register sockets in the minimum authorized user/team/weekend rooms and remove
  them on close, error, failed send, or replacement. Keep the raw-socket key
  handling used by the current registries.
- Define domain event DTOs in shared/root `types/` when both sides consume them.
  Use stable `type` names and include version/scope metadata needed to reject
  irrelevant or stale events.
- Publish only after the authoritative database change succeeds. Realtime is a
  cache acceleration path, not the source of truth.
- On the frontend, derive URLs through the existing URL helpers, wait for the
  authenticated session and required scope, parse defensively, bound
  exponential reconnects, clear timers, and close sockets on cleanup.
- Patch the exact TanStack Query key only when the event is continuous and
  applicable. Detect version gaps or unsupported patches and refetch.

The current room registries are process-local. They work only for clients
connected to the process that publishes the event. Before running multiple API
replicas, add a shared pub/sub fan-out rather than assuming these maps are
distributed. Game-result team memberships are captured when a socket connects;
membership changes require reconnecting or explicit room-refresh logic.

There is a known consistency gap: game-results rejects upgraded auth/origin
failures with 4401/4403 and its client stops reconnecting, while live-tournaments
currently returns JSON errors and its client reconnects on every close. Follow
the stronger game-results pattern when touching this behavior and do not assume
the live path already passes auth-loop validation.

Worktree setup owns `VITE_GAME_RESULTS_WS_URL` and
`VITE_LIVE_TOURNAMENT_WS_URL`; keep them aligned with that worktree's backend
port. Load `swubase-frontend-api` when sockets update Query data and
`swubase-auth-permissions` for session/origin changes. Load
`swubase-worktree-dev` when adding or changing generated WebSocket URLs or ports.

## Validation

Run the frontend build, connect an authenticated browser, verify the connected
event and one real domain update, then test irrelevant scope filtering,
disconnect/reconnect, auth failure, refresh fallback, and unmount cleanup.
