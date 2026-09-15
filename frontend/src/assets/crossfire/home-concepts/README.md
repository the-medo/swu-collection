# Crossfire home: three layout studies

These standalone HTML/CSS/JavaScript previews help choose a direction for the
Crossfire home page. They are not imported by the application. Names, decks,
results, invitations and reports are sample data. Controls simulate local UI
flows; they do not create games, load accounts, submit reports or send invitations.
Card images load from the existing public image bucket.

With the worktree frontend running, open
`/src/assets/crossfire/home-concepts/index.html` on its frontend origin.
Use the top controls to compare layouts, switch light/dark themes, and try an
empty account. Each combination has a shareable query string:

- `?concept=desk&theme=dark` — A: Play desk
- `?concept=room&theme=dark` — B: Play desk II
- `?concept=quick&theme=light` — C: Quick start
- Add `&empty=1` for the empty account.

The same folder can also be served by a plain static HTTP server, provided the
parent Crossfire logo SVGs remain at their relative paths. Open via HTTP rather
than `file://` so the JavaScript module can load.

## What the current page needs

The current `CrossfireHome.tsx` shows deck selection, match format, visibility
settings, invitation entry, history, bookmarks, reports and practice invitations
on one page. `GameHistory.tsx` already distinguishes returning to a running game
from watching a finished replay. The opportunity is to give starting and resuming
a game a clear priority while keeping the other workflows easy to find.

The options below are design hypotheses based on that implementation, not
findings from usability testing. All three preserve private invitation games,
SWUBASE deck selection, single games/BO3, spectator and hand-visibility settings,
replays, saved positions, practice invitations and report access.

## A — Play desk (original reference)

**For:** returning players who want to start or resume quickly.

A running game sits above a compact new-game area. The selected deck and create
button stay visible, visibility settings move into a dialog, and an explicit
summary remains beside the main action. The opponent still accepts those
settings. A separate invitation panel serves players arriving with a link.
History, saved positions, invitations and reports share one tabbed area.

**Expected improvement:** fewer competing controls, with a clear next action.
**Scope:** small-to-medium frontend refactor using existing data and mutation
hooks. **Risk:** hidden settings must retain a visible summary, and an ongoing
game must not obscure the option to start another. **Confidence:** highest of
the three because it reorganises the existing page without changing its basic
navigation. Check whether players discover bookmarks and settings easily.

## B — Play desk II (revised A)

**For:** returning players who want A's direct setup with more ways to choose a deck.

This version keeps A's sidebar, visual style and activity tabs. The running game
moves to the right, above invitation entry. A full-height deck accordion occupies
56% of the main panel on the left, and the create button anchors the bottom-right
corner. The smaller leader artwork stays in the upper-right area.

The **Last played**, **Your decks** and **Public decks** accordion headings are
always visible. One group can expand at a time, or all can be collapsed. Only
the expanded group's results scroll, so long lists do not push the other headings
out of view. Search filters all three sources. Selecting a deck keeps the picker
open and updates its selection marker and the leader preview on the right.
On narrow screens, the full-width accordion stacks above the preview and action.
An empty account still has public examples and shared deck links. All deck
history and public authors in this preview are sample data.

**Expected improvement:** A's clear starting point, with resume beside it and
repeat deck choices within easy reach. **Scope:** medium frontend work once
chosen. **Risk/dependency:** a real implementation needs paginated deck sources,
recently played deck references and readiness checks for public selections.
This prototype does not add or assume a new backend contract for those sources.
**Confidence:** high for the layout direction selected by the user; deck browsing
still needs validation with real collections and mobile screens.

The existing `concept=room` URL now opens this revised B; A and C remain available
for comparison.

## C — Quick start

**For:** players learning Crossfire or wanting a calm, explicit setup flow.

A three-step panel separates deck choice, settings and sharing the invitation.
Resume, join and activity links sit alongside it. Light mode is the default in
this study; all layouts support both themes.

**Expected improvement:** less information to interpret at each decision.
**Scope:** medium frontend state/focus work with the same existing endpoints.
**Risk:** the extra steps may slow repeat players, and mobile users must scroll
to reach secondary activity. **Confidence:** medium; compare first-time clarity
against the repeat-player cost before making it the only setup flow.

## Preview boundary and a later implementation

Deck selection, deck search, game settings, tabs, wizard navigation, input
validation, dialogs and theme/empty-state controls are interactive. Invitation
links are explicitly examples. Replay, resume, practice and report destinations
show explanatory placeholders. Pasting a syntactically valid SWUBASE deck link
selects the sample Ahsoka deck; it does not fetch or validate that deck. State
resets on refresh except the design/theme/empty choices in the URL.

These studies cover the signed-in home layout. They do not demonstrate real
authentication, asynchronous loading/errors, deck legality/readiness, large
collections, or server-side invitation consent. Those existing behaviours must
be carried through when a design is selected. No new database, game protocol,
public matchmaking, rankings or bot opponent is proposed.

For the chosen implementation, load `swubase-frontend-components`,
`swubase-frontend-api`, `swubase-online-play`, `swubase-validation` and
`swubase-change-review`; add `swubase-frontend-routing` if navigation or router
search state changes. Build with the existing React components, dialogs and API
hooks rather than porting this prototype's string rendering into the app.
