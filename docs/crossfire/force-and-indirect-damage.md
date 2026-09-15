# Force and indirect damage

The baseline is the supplied comprehensive rules v8.0, §§8.35 and 8.37.
The printed text for this batch is pinned in
[meta-force-indirect.json](../../play/testing/fixtures/meta-force-indirect.json).

## The Force

A Force token is a separate public card in its player's base zone, represented
by `players[id].tokens`. It is neither a resource nor an upgrade. A player can
have at most one; gaining the Force again has no effect. Using it removes that
exact token to set-aside and increments the player's phase usage count.
Scenarios can declare `force: true` for either player.

Force is an explicit ability cost. The engine checks it together with resource
and exhaustion costs before paying anything. Optional effect payments also work
after their source has left play. Darth Maul declares the Force/exhaust action
on his leader face, and the separate attack trigger on his unit face. Both choose
the two distinct damage targets in one mandatory selection, clamped to the
number of units available. The browser can toggle these targets before a single
confirmation; the engine validates distinctness and applies their damage together.

Conditional upgrade grants are evaluated for their current holder. This supports
Constructed Lightsaber's faction abilities and the named lightsabers' matching
unit/Force conditions. Attachment filters constrain eligible units on entry.
Ambush is a keyword, including when granted conditionally; it triggers on played,
deployed and created entry and does not ready the attacker.

## Allocating indirect damage

An indirect effect first identifies the receiving player, then saves an
`allocate-indirect` frame. That frame records the original source, controller,
recipient, assigning player and final amount. Friendly Hunting Aggressors
increase damage to opponents; Devastator lets its controller assign that damage.

The assigning player distributes the full amount among their recipient's units
and base. Unit limits are their remaining HP, while the base can receive the
entire amount. Each repeated selected card handle represents one damage point.
All other selection types still require distinct handles. The server validates
the total, eligible cards and individual caps before applying simultaneous,
unpreventable damage. Shields remain attached. Source attribution remains with
the card that dealt the damage, including a source already defeated.

Only the assigning player receives this decision. Public allocation keys are
opaque viewer handles; internal instance IDs never cross that boundary.
The browser uses numeric inputs and restores a pending allocation after a
reconnect. Its connection validator preserves repeated handles only for
allocation decisions. Pryde observes each unit actually dealt indirect damage
and can target only a non-unique upgrade attached to that exact unit.

## Verification

`meta-force-indirect.test.ts` checks singleton Force, atomic costs, both leader
faces, conditional Ambush/lightsabers, Force-filtered searches, damage caps,
Shield bypass, source attribution, Pryde's targets, opaque allocation handles,
and fresh-process continuations. Catalog checks validate every new definition
against the pinned printed text. The connection regression covers repeated
handles and rejected over-allocation.

Run the authenticated browser allocation scenario against the running local
worktree with `CROSSFIRE_BROWSER_SCENARIO=indirect`,
`CROSSFIRE_TEST_DATABASE_URL` set to that worktree's database, and
`bun run play:browser:test`. It uses synthetic local identities, drives the
rendered controls, and removes its database fixtures afterward.
