# Crossfire browser client

The [connection controller](../../frontend/src/components/app/crossfire/connection.ts)
owns one in-memory TanStack Store per mounted game and signed-in session. Its
only Crossfire dependency is the browser-safe `play/view/types.ts` entrypoint.
It never imports the engine, projects authoritative state, or persists tickets,
hands, handles or pending intent in Query, localStorage or IndexedDB.

Incoming snapshots and deltas pass the shared strict server-message validator
before entering the store. A scope/version/revision mismatch requires a snapshot;
an unsupported message stops the connection. A gap requests only one resync and
hides the old view while waiting. Changing hand-display preferences also clears
the view until the server supplies its new permitted snapshot.

The client submits only a supplied option and valid selections from the current
decision. It allows one pending command and never advances the board optimistically.
On a lost acknowledgment, it obtains a new ticket and resends the exact original
command ID/payload after the replacement snapshot. The server's durable receipt
lookup determines whether the old command committed. A rejected obsolete choice
clears pending intent and resyncs; the player chooses again from the new position.

Automatic reconnect attempts are bounded to five, with delays from one to ten
seconds. A successful command acknowledgment resets the budget; a connect/close
loop does not. Access denial or seat replacement stops retries. An exhausted
outage budget allows manual reconnect while retaining unresolved intent. The
ten-second watchdog covers ticket admission, initial snapshot, command receipt
and resync. Cleanup aborts ticket requests, closes the socket, cancels timers and
clears all game data; late work from an older connection cannot repopulate it.

The URL helper resolves the configured worktree path against the app's origin,
including WSS under HTTPS. Tickets remain in the authentication message.
The authenticated `/crossfire` page uses an inline deck accordion: Last played,
Your decks and Public decks. All three headers stay visible while the open list
scrolls. A selected-deck preview and inline game settings lead to Create invitation;
running games, incoming/outgoing invitations and teammates occupy the left column,
with the larger deck picker on the right. Below, recent games take two thirds of
the width; bookmarks and bug reports share the remaining column. Existing saved-position
practice invitations remain accessible alongside the teammate invitations. The page keeps the
normal SWUBASE navigation without an additional page header and fills the
available content width. Its search field accepts a SWUBASE deck link or UUID
as well as ordinary search text. The deck detail's Play button beside Image
opens `/crossfire?cfDeck=<deck-id>` with the Crossfire logo. `cfDeck` takes
precedence over automatic selection; without it the page selects the last
played accessible deck, falling back to the most recently created owned deck.
Linked selections also appear as a selected deck row directly below search,
with all accordion sources initially closed. Each row has a separate
decklist-preview button to the left of the selection check that opens the existing
full deck contents (including large leader/base images) without
changing the selected deck. The leader illustration uses a bounded
crop flush to the upper-right corner beside the deck details to avoid enlarging the catalog image across the
whole preview panel. Match length uses a Best of 1 / Best of 3 segmented radio
group with keyboard navigation. Spectator and hand-reveal settings are directly
available below it; disabling spectators also disables their hand-reveal option.
An orange Deck needs attention button sits beside Create invitation. Its Deck
check dialog groups issues by reason and counts distinct affected cards, with
deck-level issues counted separately; it describes practice support and
structure rather than claiming tournament legality.
The readiness endpoint names unsupported cards before create/join; admission
still rechecks the actual deck. Waiting `/crossfire/:lobbyId` links redirect to
`/crossfire?cfInvite=<lobby-id>`, keeping normal navigation and the same deck
accordion. Joining shows the host's immutable settings; the explicit Accept
invitation and play button submits the selected deck and consent. The host sees
a waiting panel with the locked deck, share link and expiry countdown. Invalid,
cancelled and expired links explain their status instead of permitting submission.
Lobby queries have a fifteen-second fallback refresh while waiting; real-time
invalidation normally supplies updates immediately.
The started lobby lazy-loads the board for a participant or permitted spectator.
The sidebar and deck menu provide entry points.

Crossfire uses the Grogu logo with longer crossed blades, stored in
`frontend/src/assets/crossfire/logo-light.svg` and `logo-dark.svg`.
`CrossfireLogo` replaces the main sidebar logo on Crossfire pages and follows the
application theme in navigation, deck menus and invitations; the dark game, replay and report tables explicitly use the light
artwork intended for dark backgrounds.

`CardBack` is the shared renderer for decks, hidden hands, resources and captured
cards. Its single public image URL is
[`swu-default-c012e36fb016.jpg`](https://images.swubase.com/crossfire/card-backs/swu-default-c012e36fb016.jpg),
stored at `swu-images/crossfire/card-backs/swu-default-c012e36fb016.jpg` in R2.
This is the supplied, unmodified 216 × 302 JPEG (9,483 bytes), with immutable
one-year caching. The filename contains the first twelve SHA-256 digits; a
replacement image should use a new key. Image requests carry no card identity.
The full SHA-256 is
`c012e36fb0167b85f72cc5c889e710a84107ea1c110db872fde88eec1324064e`.
Custom backs are not implemented. Resource/captive hover rules check for a
permitted face directly inside the card-art wrapper, so the back's own image
cannot be mistaken for a revealed face.

The React session boundary keys the entire subtree to the Better Auth session,
removes session-scoped lobby/readiness queries on cleanup, and unmounts the
connection when that session disappears or changes. Tickets use an imperative
HTTP operation with an abort signal, never a Query/mutation cache. Lobby queries
contain small metadata only and stop polling after start/cancellation.

The board renders only the server's permitted cards, counts, decisions and logs.
Base/leader areas, two arenas, hands, resources and discard include current
attachments, pilot upgrades and tokens supplied by the view. Hidden hands render anonymous card backs from counts; hidden cards have no
catalog image lookup. The match route uses the full window: space on the left,
ground on the right, bases and leaders in the middle, hands along the outer
edges and a separate game-log rail. The log opens in a focus-managed sheet on
narrow screens. The waiting invitation retains its own back link; leaving the
match restores the regular application navigation.

The live toolbar groups its controls at the right, starting with yellow Undo and blue Bookmark.
Replay and the narrow-screen activity toggle follow; match/rematch, resync, the
red problem report and leave controls sit at the right. Compact icon buttons keep
accessible names and tooltips. Narrow screens place the toolbar below the game
heading. The [match result dialog](matches.md) opens after a game ends and can be
dismissed without losing access to the finished board.

The browser-only [interaction controller](../../frontend/src/components/app/crossfire/interaction.ts)
keeps local selection separate from committed game state. Clicking a card with
one action starts that action; several actions open a contextual card menu.
Attacks, upgrades and other targeted plays first highlight legal card targets,
then submit the exact supplied option when the target is clicked. Even a sole
legal target requires a target click. Escape or Cancel clears the local action.
Resource choices and other multi-card selections are made on the cards and
confirmed explicitly. Allocation cards add the supplied increment; bounded
number controls support reducing or redistributing the amount. Naming, modes,
optional effects, Pass and initiative retain compact non-card controls. Effect
choices float in a compact, non-modal panel; hiding it exposes the full table
without declining the choice. The arena rows have fixed proportions independent
of the panel. Card naming uses a searchable official-title selector: filtering
alone never submits a typed name. Aspect choices appear directly in the panel.

Hands use an overlapping arc. Hover or keyboard focus lifts a complete permitted
card face into view. Players drag their hand cards with mouse or touch; Alt + Left/Right remains
available for keyboard ordering. Pointer cancellation preserves the order, and a
tap still activates the card. Only opaque handles are
reordered in React memory; new cards append, departed cards are removed, and a
fresh board epoch resets the order. Reordering never sends a game command.
Resources appear face down beside the resource/Credit counters. Hover or keyboard
focus reveals one permitted face; clicking a resource or its counter opens the
resource pile. A current resource-selection choice can also select directly from
the row. Opponent resource identities remain absent from the view and dialog.
The Credit counter is gold, with individual credits appearing only when needed
for a choice. Force is a blue circle over the base. Full-size ordinary upgrades
sit under their host, exposing their bottom modifier strips. Shield (blue shield),
Experience (green plus) and Advantage (black arrow) overlay the host; duplicates
share an icon and count, with a popover preserving individual token selection.
Weakness has red-minus presentation prepared, but no engine implementation yet. Exhaustion rotates clockwise without a
text badge. Bases display central damage; unit power and remaining HP stay visible.

Private inspected cards and selectable cards in closed piles appear in a choice
tray, using only supplied faces and handles. Inspection faces can temporarily
supplement a face-down resource in that tray without revealing the resource on
the ordinary board. New decision IDs or projection epochs clear local selections.
Pending acknowledgments disable additional submissions. Selection prompts enforce
minimum/maximum, allocation, disclosure and budget bounds. Allocations use
clicks and plus/minus controls on the exact target, with counts and a compact
confirmation bar between the arenas. Per-target limits, shared totals and
required increments come from the decision; no allocation dialog is used. Neither labels nor
card art determine legality.

Copy numbers remain in accessible card labels but are hidden visually; opaque
handles remain the command/reference identity. Hovering or focusing a log reference highlights
that exact current handle. Historical references without a current handle stay
plain labels and cannot link into hidden zones. Hover previews show permitted artwork.
Full inspection opens with right-click, a one-second touch hold, or I on a focused
card or log reference. Ordinary card clicks only select or act; clicking a log
reference highlights its exact copy. Moving the touch cancels inspection so hand
dragging remains available; releasing a completed hold cannot also submit a game
action. Resource/discard pile buttons still open their zone overview on a click.
The inspector provides related-card thumbnails, previous/next buttons and left/right
arrow navigation through the host, its attached upgrades and captured cards. It
follows exact visible handles and includes only faces authorized by the current
projection, closing if the selected face becomes unavailable. Gallery 82/83 show
related-card navigation and mobile touch inspection.
Committed layout changes use Motion with the user's reduced-motion
preference; animations never gate commands. Spectator hand preferences replace
the projection, with controls shown only when the game permits disclosure.

Chat, concessions and replay browsing are implemented. Full catalog/rule coverage
and scenario editing remain later work.
The UI does not invent controls for mechanics absent from the wire contract.

Validation: focused `interaction.test.ts` tests cover source/target flows, action
grouping, exact copies, private choices, selection bounds and stale decisions.
The `connection.test.ts` tests exercise dropped acknowledgments,
replacement epochs, gap recovery, hand preferences, cleanup during admission,
stale callbacks, fatal messages, send failures and bounded reconnects. The engine
view suite passes actual snapshots/deltas through the shared browser validator.

Run the opt-in browser acceptance against an already running Crossfire worktree:

```bash
# Use this worktree's exact local URL, as reported by its generated environment.
CROSSFIRE_TEST_DATABASE_URL='<local worktree DATABASE_URL>' bun run play:browser:test
```

The script loads this worktree's ignored development env files, requires an exact
match between the explicit test URL and the app database, and refuses nonlocal
PostgreSQL or a non-development browser origin. It creates three synthetic
Better Auth sessions and decks, drives the real create/join/board controls and
cleans only its own fixtures. Screenshots go to ignored `.swubase/`. Chromium
must be installed (`bun run screenshotter:install`). No live-account credentials
or production auth bypass are needed.

The acceptance covers a completed game, own-list selection and URL preselection,
consent, duplicate copies, log focus/inspection, resource-prompt reload,
spectator reveal/hide and server-forbidden hands, hidden-identity socket/image
checks, session expiry, direct/back navigation, anonymous access and narrow/wide
light/dark rendering. More card-specific interaction coverage is still needed
as mechanics and the supported catalog grow. The browser driver observes the
same validated public socket messages to identify the choices under test, then
uses rendered card clicks, contextual menus, targets and confirmations. It never
sends game commands directly or adds hidden action controls to the application.
The default, Exploit, pilot, Smuggle and resource-play cases exercise this board
with one player using a narrow viewport.

Leader/base markers use the public `limitedActions` projection (protocol 32).
The server derives printed game limits from all leader faces or the base, and
pairs each with committed usage. Only spent actions show a grey crossed star;
unused actions have no marker. These markers do not imply current legality. Repeatable
leader deployments and once-per-round actions are excluded from these markers.
Current executable and protocol pins are maintained in [engine-core.md](engine-core.md).
Protocol 33 adds a nonnegative whole-number choice for Sense Through the Force.
The compact panel validates the number and supports Enter; it never receives
the deck inspection until the server accepts that choice. Excess combat damage
uses the existing direct card targeting flow.

Protocol 35 adds a private top-deck face for an active look permission. Hondo's
controller can inspect it by right-clicking or holding their deck; opponents and spectators
receive no such face, including with revealed hands enabled. Protocol 34 added
the public bottom-at-regroup schedule label.

Generate the local scenario gallery with:

```bash
CROSSFIRE_TEST_DATABASE_URL='<local worktree DATABASE_URL>' bun run play:browser:gallery
```

The gallery uses synthetic development sessions and real lobby admission, then
Playwright intercepts only the fixture socket. Scenarios and command resolution
run in the Bun process through the original engine and Projector. The browser
receives validated viewer snapshots only. No testing route, authentication bypass
or state editor is added to the application. The ignored
`.swubase/crossfire-gallery/index.html` links the full captures and close-ups.
The command also copies only its generated gallery files into the ignored
`frontend/.swubase/crossfire-gallery/` directory, served by development Vite at
`/.swubase/crossfire-gallery/index.html`. This directory is outside `public/` and
is excluded from the production build.
The generator (`play/browser/gallery.ts`), scenarios and interaction checks are
committed; generated HTML, manifests and screenshots are local artifacts only
and are not committed or uploaded to R2. These captures show the implemented UI,
not the discarded logo alternatives or homepage design mockups.
Checks cover keyboard, mouse and real touch ordering without game commands;
touch cancellation followed by normal card play; resource privacy; exact token
identities; title selection; allocation bounds and increments; engine advancement;
stable arena dimensions; spent actions and narrow layouts.

JTL examples cover Yularen’s keyword choice, Pilot conversions, defeat
replacements, and Jump to Lightspeed’s free or normal payment. The gallery
checks card-click attachment, cancellation without losing the free-play grant,
actual resource spending, and the payment prompt on narrow screens. Payment
fixtures remap their serialized rollback state alongside the current game.

## Home deck search

`GET /api/crossfire/decks` accepts `source=recent|mine|public`, a literal
case-insensitive `search` (up to 120 characters), and an opaque cursor. It
returns at most 20 metadata rows, ordered by last-played time for recent decks,
creation time for owned decks, or update time for public decks, with deck ID
breaking ties. Search
matches the deck name or the leader/base names in the official catalog. The
browser waits 250 ms after typing, cancels obsolete requests, and keeps the
same search when switching sources. Only the open accordion source is fetched
for browsing; initial automatic selection also queries recent decks and, when
there are none, owned decks. Changing search or source preserves the selected
deck, and a late default lookup cannot replace a user's selection.

Pasting an official SWUBASE or current-origin `/decks/<uuid>` link selects its
ID and clears the search field. Raw UUIDs also work. The browser requests
metadata and readiness through the local typed API, never the pasted remote
URL. An unavailable explicit deck stays an error rather than silently
selecting a different deck. Preview contents load only when their dialog opens.

Recent decks come only from the signed-in player's started-game seats and are
deduplicated by source deck ID. They show the current editable deck, not its
frozen game snapshot. Every result is checked against current deck access;
public discovery excludes unlisted decks. `GET /api/crossfire/decks/:deckId`
allows direct-link metadata for owned or shared public/unlisted decks. Limited
decks must have matching owner/pool metadata and permitted visibility in both
records. None of these endpoints sends deck contents or private game data.
Queries are scoped to the Better Auth session and removed on session cleanup.

The resume panel uses `/api/crossfire/history?status=running`, so an older
running game is not hidden behind a page of completed games. These queries use
existing tables; no migration, new database or additional service is needed.
Running games, recent games, bookmarks, practice invitations and reports share
compact rows with both leader portraits. Activity endpoints extract only the
public leader IDs from the admitted participant snapshots, placing the viewer’s
seat first (seat order for spectators). This preserves the played decks after
source edits without reconstructing game states or requesting each deck.
Bookmarks and reports omit these IDs when replay access is no longer available.
HTTP list DTOs carry this artwork metadata; saved-bookmark socket messages and
engine versions are unchanged.

With the local worktree services running and `CROSSFIRE_TEST_DATABASE_URL`
explicitly set to its `DATABASE_URL`, run `bun run play:browser:home`. It creates
and removes synthetic local accounts/decks/games, exercises real search,
link pasting, selection defaults, deck previews, Play navigation, readiness and
invitation submission, checks desktop/mobile/touch layouts, and
writes screenshots and a gallery index to `.swubase/crossfire-home/`, then copies
them into the ignored `frontend/.swubase/crossfire-home/` directory for Vite to
serve at `/.swubase/crossfire-home/index.html`. Report rows are local list
fixtures only; no report notification is queued or sent.

## Resource and ability choices

Both players can select resources together. The second player's early confirmation
stays private until the initiative player's resourcing resolves. A private ready
prompt retains the selected-card highlight and offers Change resources. Players
may instead wait to see the initiative player's decision. See [regroup.md](regroup.md)
for the durable queue and validation behavior.

Pending triggered and delayed abilities appear immediately as compact illustrated
rows in the choice panel. The server supplies captured source/origin, timing and
sibling index; the client uses the existing card catalog for printed descriptions
and source art. Multiple When Played abilities on one source are numbered. Target
prompts prefer the server’s current-instruction summary and fall back to printed
source text. Text is explanatory; supplied options and selections still control
legality. Clicking a leader with one offered action executes it immediately.
The menu contains only actions; pure deployment options below their resource
requirement are omitted. Inspection remains on hover, right-click and keyboard.

The server projects effective Sentinel from current unit keywords, including
conditional abilities and ability loss. Active units receive a shield badge and
border, rather than deriving Sentinel from printed text in the browser.

Chat and game events share one activity pane. Player-colored left borders replace
actor headers; chat also has a distinct background. Message text remains escaped
React content. Chat stays scoped to the two players. Public event ordinals anchor
chat positions across refreshes without exposing private fact counts. Migration
`0057_crossfire.sql` includes nullable `play.chat_messages.after_event`;
older unanchored messages follow the game events. Undo retains existing chat.

Protocols 37–39 add optional presentation fields. Standalone saved report views
from protocols 36–38 pass a narrow compatibility reader and the current full view validator;
this does not reintroduce old engine execution. Gallery examples 66–71 cover
Shuttle's two triggers, the five-trigger Grogu/Cobb/Anakin example, Ahsoka's target
text, conditional Sentinel, private early resources and combined activity.

Board-only target choices use the fixed strip between the arenas, keeping cards
and bases accessible. Summaries distinguish Masterpiece’s healing, Experience,
and damage steps. They contain presentation strings derived from the current
effect; execution frames and private bindings remain server-only. Non-board
choices continue to use the compact floating dialog.

Shared source artwork sits at the right of trigger rows and single-effect
prompts: top art for units/upgrades, bottom art for events, and the unit/back face
for leaders. Named-card notes and active rule warnings come from the viewer
projection, including on authorized hand faces. Hovering a marker shows its
explanation without opening the card preview.

Grouped selections keep a visible count and outline on every chosen card.
Clicking again removes a selection; unrelated card clicks cannot open inspection
while choosing targets. Confirmation sends the selected group once. Maul’s two
damage targets now share one engine decision, so this local editing happens
before either target is committed. Gallery examples 72–77 exercise these cases
on desktop and narrow touch layouts.

The middle targeting strip has a fixed grid track. Selection counts sit beside
the instruction near its confirmation button; the title has no divider. Source
art is cropped past the card borders and anchored to the outer strip or dialog.
The gallery asserts unchanged arena heights and tests both mouse and touch drag
positions with animations enabled. Hand movement belongs to the fan’s pointer
transforms; shared layout projection is disabled on hand cards to prevent
compounding the drag offset. Arena card layout animation remains enabled.

Plot plays use a dedicated card preview with Play/Skip controls. Payment switches
select distinct server options; upgrade or Pilot host targeting preserves that
option group. The separate opponent notice uses only public Plot `shown` events,
keeps public ordinals across reconnect, and resets the discarded suffix after
undo. It never submits an acknowledgement to the engine. Gallery examples 78–81
cover default and alternative payment, One in a Million, upgrades, mobile, and
continued play while the notice stays open.

On phones and short landscape screens, hands sit beside compact resource/Credit
counts and deck/discard controls. Resource images are hidden from the rails;
their count opens the same resource dialog and highlights when a resource is
available for a current action or selection. Smaller arena cards leave room for
multiple units. Gallery 12a is the landscape mobile example. Aspect choices use
the shared aspect icons with accessible names. Captured cards sit sideways behind
their guard; gallery 14/14a shows their face-down and hovered states. Gallery
73c/73d shows Galen's base warning and disabled Shield badges.

## Site-wide teammate invitations

`CrossfireInvitations` wraps the normal and immersive application shells, and
owns a session-scoped invitation query outside the game page's cache teardown.
The authenticated main-API socket `/api/ws/invitations/crossfire` delivers
versioned invalidations, never decks. Creation, acceptance, decline, cancellation
and expiry invalidate both the invitation list and any open lobby. Connection
and reconnection refetch metadata to recover missed messages. Heartbeats,
bounded reconnect delays, terminal authorization close codes and cleanup cover
page/session changes; UI countdowns also remove expired notices without waiting
for the network. Other tabs receive the same server events.

Pending incoming invitations appear in a nonmodal bottom-right dialog and in
the Crossfire sidebar count. Dismissing a notice only hides that notice in the
current tab. Incoming invitations remain in the page's primary-colored list
until accepted, declined or expired. Teammates are selectable rows with the same
highlighted border and circular check as decks. Selecting a row only chooses the
recipient; selecting it again clears the choice. It never sends immediately,
even when a deck is automatically suggested. The player can change the deck and
settings, then explicitly **Send invitation to {display name}** to freeze that
selection and start the three-minute acceptance window. An info tooltip explains
these steps; no separate draft banner is displayed.
Teammates, invitation notices and pregame host labels use public display names,
falling back to “Player” for an empty display name, never the account's real name.
Show my leader before game defaults
to true; when false, the API omits both leader and base identities from the
recipient's invitation metadata, including the pregame page.

The original 0.8-second synthesized saber cue is generated by
`play/scripts/invitation-sound.py` and served from
`https://images.swubase.com/crossfire/audio/invitation-58d0bda22ed0.wav`.
No recorded samples are used. A page gesture primes browser audio, playback
failures leave the visual invitation available, and a Web Lock avoids concurrent
playback of the same notification in multiple tabs. No credentials or audio
upload jobs are part of the browser bundle.

The home browser smoke also creates synthetic teammate memberships and checks
real WebSocket delivery on another SWUBASE page, two recipient tabs, locked
settings, acceptance, hidden thumbnails/identities, expiry, reconnect and revoked
session admission. Its gallery includes these invitation states. It does not
call any external report-notification endpoint.

### Leaving and unavailable games

Every running-game row and the game toolbar expose **Leave game**. The stopped
connection screen keeps that action beside **Back to Crossfire**, using the
account-authenticated HTTP endpoint independently of the game socket. A
confirmation explains whether the operation concedes a game, forfeits a BO3
match, or closes an incompatible version without a winner. While connected,
the BO3 confirmation also offers **Concede current game**; sideboarding has a
whole-match exit. Closing a browser tab or using Back to Crossfire alone never
concedes anything.

An accepted pending exit is visible as Leaving until committed by the worker.
Account WebSocket game invalidations refresh running games, history, lobby and
match queries in every tab; a short pending-only HTTP refetch interval recovers
missed completion messages. Incompatible connection errors explain the version
mismatch and hide Reconnect. Abandoned history rows retain their artwork and
result label with Replay unavailable. BO3 forfeits display the actual played
game score and the separately recorded match winner.

`play/browser/home-smoke.ts` covers an older game that predates match metadata,
closing it from the stopped screen, cross-account list updates, a BO3 current-game
concession, a subsequent sideboarding forfeit, and leaving directly from home
without a game socket. Its gallery includes desktop and mobile confirmations.
