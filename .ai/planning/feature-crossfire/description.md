# SWUBASE Crossfire

Current pre-release decision: keep only the newest engine executable. Do not
retain/rebuild earlier experimental versions as part of routine development.
Keep strict version checks and current-version recovery tests. Historical game
compatibility and executable retention below are future release requirements,
to revisit before real user games are collected.

Status: milestone 0 implemented, 2026-09-09. The user selected **Crossfire** and
an **original SWUBASE game engine**. A headless core-practice slice now completes
games with ten supported card definitions. See the
[working engine guide](../../../docs/crossfire/engine-core.md). This brief retains
the full feature requirements; online hosting, persistence, UI, and complete
rules/card coverage remain future milestones.

## Purpose

Let SWUBASE users select their decks and play fully automated Star Wars:
Unlimited games together, watch games, revisit saved replays, and construct
reproducible practice scenarios. Deck building, playing, and reviewing games
should feel like parts of the same application and use the same account.

## Confirmed product and engine decisions

The feature is **SWUBASE Crossfire**, shortened to **Crossfire** within SWUBASE.
Proposed navigation: **Play**, opening the Crossfire landing page. Internal
`play` names describe the domain independently of branding.

Write an original engine and card implementations in this repository, using
official SWU rules, card text, and SWUBASE's requirements as the specification.
Do not fork, vendor, port, or wrap another project's game engine or copy its card
implementations or tests. Explain architectural choices through the requirements
they satisfy and validate them with independently authored conformance cases.
General libraries and existing SWUBASE components remain available.

External project research can inform exploration, but keep that research outside
committed feature files. The durable proposal, code, and contributor guidance
describe Crossfire's own design and cite official rules where relevant.

## Required product behavior

- A logged-in user selects any SWUBASE deck they may access, creates or joins a
  game, and plays another user. Support ordinary decks and decks built from
  limited card pools. Playing does not require owning cards in a collection.
- Enforce the complete rules for the advertised ruleset and format. Unsupported
  cards must be identified before starting; they must never silently behave as
  blank cards. The eventual goal remains every card and full rules coverage.
- Give every mechanically distinct card a dedicated implementation file,
  including leaders, bases, tokens, and cards with only keywords or no abilities.
  Alternate art, foil variants, and identical reprints share behavior.
- Run many independent games concurrently. A game's choices, timers, effects,
  random source, and connected viewers cannot affect another game.
- Keep full authoritative state on the server. The server validates commands,
  makes random choices, shuffles, applies rules, and constructs permitted views.
- Send incremental WebSocket updates during normal play. Initial connection,
  recovery from a gap, and a change of viewing permissions can send a full
  **viewer-safe** snapshot.
- Provide a board with ground and space arenas, bases and leaders, resources,
  hands, decks, discards, upgrades, captured cards, special tokens, choices,
  initiative, chat, and a game log.
- Support spectators with an explicit game policy. Keep revealing hands to
  opponents separate from revealing hands to spectators. A spectator's display
  toggle operates within the visibility permission granted by the game.
- Animate playing, moving, attacking, exhausting, damage, and defeat. Animation
  follows accepted game events and must not control rules timing.
- Logs and choices refer to the exact card instance. Underlined card names can
  highlight that instance on the board, including when multiple copies exist.
  Historical references remain useful after a card has left the board.
- Keep active games in memory while also persisting accepted progress. Save
  enough information for replay and restart recovery, including a pending choice
  within an action. Saving only when a game ends is insufficient.
- Support replay navigation by individual step or complete action, including
  backwards seeking. Build private state caches on the backend and send only
  permitted views/deltas; expire idle replay caches after 3–4 minutes.
- Allow opponent-approved undo to the start of the current or immediately
  preceding action, including its nested plays and abilities. Preserve undone
  history and acknowledge that revealed information cannot be forgotten.
- Let users bookmark committed positions, revisit them after compaction or undo,
  and create separately authorized practice games from those positions. The
  [next implementation plan](history-replay-and-undo.md) records the agreed
  storage model, cache policy and delivery gates for these requirements.
- Provide a reusable scenario description for tests and future user-created
  scenarios, including multiple copies, attachments, hidden zones, and history
  needed by rules. User scenarios are data, never uploaded executable card code.
- Add repository skills for implementing cards and maintaining the game engine,
  visibility, scenarios, and replay contracts.

## Proposed delivery scope

Start with two-player games using existing decks: Premier/Eternal and already
built limited decks, plus an explicitly labeled casual practice mode. This is a
recommended release sequence, not a user decision to exclude other formats.
Separate deck legality from card implementation support: relaxing format legality
does not make an unsupported card playable.

The supplied v8 rules also cover Trilogy, multiplayer, and Twin Suns. Keep these
on the completion roadmap and use player IDs, player collections, and leader
arrays in foundational contracts. A two-player release must describe its support
accurately; it is not completion of all formats in the comprehensive document.
Creating an online draft/pack-opening system is separate from playing a deck
already built through SWUBASE's limited workflow.

Full automation is the destination. An early vertical slice may support a small,
explicit card set, but neither a manual tabletop nor “all cards render” meets
the requested final feature. Matchmaking ratings, AI opponents, tournament
administration, and voice/video are not needed to establish this feature.

## Proposed user flow

1. Choose **Play** from navigation or a deck's action menu.
2. Select an accessible deck and see format/implementation validation. Create a
   game with agreed spectator, hand visibility, and replay settings, or join an
   existing game. Reconfirm readiness if a deck or setting changes.
3. The server freezes both decklists and rules versions, performs setup, and
   sends each participant their permitted board and decisions.
4. Play using card selection and explicit legal choices; reconnect into the
   same seat and pending decision after interruption.
5. At game end, open the replay. A later scenario editor can turn an authorized
   position into a separate practice game with its own identity and history.

No client receives hidden information merely because it could be convenient for
an animation, card hover, replay button, or disabled action. The security goal
is preventing unauthorized state disclosure and actions through the software.
Players can still communicate information they legitimately know outside the
application; revealed information cannot subsequently be made unknown.

## Decisions to settle before dependent implementation

| Decision | Recommended starting point |
| --- | --- |
| First supported formats | Two-player Premier/Eternal and built limited decks |
| Preview cards | Explicit opt-in games, only after their implementations are supported |
| Hand disclosure | Private by default; all affected players agree to increases in visibility |
| Spectators | Game option; ordinary public board view by default when enabled |
| Replay access | Participants' own perspectives; sharing and extra disclosure explicit |
| Runtime | Separate TypeScript/Bun game service; framework-independent engine |
| Persistence | Existing PostgreSQL database, separate `play` schema and bounded service access initially |

The table contains proposed defaults for the full feature; Crossfire's name and
original engine are confirmed decisions. The headless core does not deploy a
service, add gameplay tables, or publish material externally.

## Acceptance of the complete feature

Two users can play any supported deck through a full game using the same
SWUBASE accounts, while unrelated games run independently. Rules/card coverage
is enumerated and tested against the advertised versions. Replays reproduce
accepted actions and choices after process restart. Forged, repeated, stale, or
out-of-seat commands cannot alter state illegally. An unauthorized viewer cannot
recover concealed cards through snapshots, patches, logs, errors, image requests,
or replay APIs. Exact-copy highlights, spectators, reveal permissions, reconnect,
and animation behavior all work together.

Implementation acceptance checks and release gates are in [plan.md](plan.md).
The architecture is in [architecture.md](architecture.md), and the rules baseline
and card workflow are in [rules-and-cards.md](rules-and-cards.md).
