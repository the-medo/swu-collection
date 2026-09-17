# Naming cards and source-bound restrictions

Crossfire 0.30.0 / card bundle 30 / state 29 / view 17 implements Ryder Azadi,
Garindan and Galen Erso. The rule baseline is the supplied comprehensive rules
v8 §8.17. Naming uses the full **title**, without the subtitle or unique icon.
Commas inside a title remain significant. These cards' official clarifications
also fix the affected opponents at resolution and end their lasting restrictions
when the source leaves play, including capture; rescue does not restart them.

## Public catalog choice, private continuation

Each immutable card bundle pins canonical IDs and titles separately from
supported behavior. `play/cards/catalog.ts` assembles the current table from the
retained `play/cards/catalog-names.json` baseline and newer set snapshots, including
Homeworlds. The baseline table participates in the 1.0 compatibility checksum:
do not overwrite it with `refresh-card-names.ts` when importing a new set.
Extend the current release's titles while preserving historical bundle data.
A player may name an official card that Crossfire cannot yet play. The name table
does not register or admit unsupported definitions.

A `name-card` effect binds the chosen title in serializable `names` context.
The player submits `namedCardId` alongside the current decision/option. The
engine validates it against the pinned catalog, rejects missing or unknown names,
and rejects this field on unrelated decisions. It is a public catalog identity,
not a physical-card handle. The browser's official catalog supplies title
suggestions; no hidden-zone contents influence that list. The command and retry
receipt retain the same name choice across reconnects.

Garindan suspends for naming before creating an `inspect-zone` frame. Only the
inspector receives the opponent's hand faces and exact-copy choices. A `named`
card filter compares the bound title and accepts all subtitles. If none match,
the inspector still looks and confirms without discarding. Naming produces a
public title log entry; only actually revealed/discarded physical cards acquire
public instance links.

## Lasting behavior and ability loss

`restrict-named-card` records the source incarnation, original acting player,
title and restriction. Queries require that exact source to remain a unit in
play. Changing control or removing the source's abilities does not change an
already-resolved effect. A later incarnation cannot reactivate it.

Ryder prevents the original opponent from playing matching cards through the
shared paid/free play paths, including nested and alternate-zone plays. It does
not prevent deployment, putting a card into play, or playing an unrelated card.

Galen instead matches **ownership**, in every zone. Printed leaders and units
currently made leaders by an active upgrade are exempt. Affected nonleader cards
lose printed and gained abilities. Events still cost resources and enter discard
but have no effects; Plot, Piloting and printed ready-entry or cost-reduction
abilities cease to apply. A blank printed upgrade retains its statistics and
uses the general attachment restriction. An already-attached Pilot retains its
role, statistics and the attachment restriction established by its original
Piloting ability (v8 §3.6.3b).

An upgrade's own effects are distinct from abilities granted to its host. Galen
can remove Darksaber's leader/trait effects by naming Darksaber, while naming its
leader host does not remove that status. Shield tokens lose their own prevention
ability when named, but remain Shields and can pay for a different card's ability.
Numeric attributes, aspect icons and modifiers imposed by other sources remain.

## Verification

`play/testing/meta-naming.test.ts` covers official title identity, missing/invalid
commands, nested play prohibition, exact-copy discard, secret-differential views,
original opponent/ownership, source departure, ability loss in hidden zones,
events, Plot, Piloting, Shield costs, bases and upgrade attributes. The retained
continuation workload includes naming and the subsequent private-hand choice.
Run `bun run play:check`, then archive and verify the committed current bundle.

The `naming` browser preset exercises title selection, rejected empty/unknown
names, reconnect at naming and private inspection, and a complete game through
rendered controls. Run it only against the explicitly selected local worktree:
`CROSSFIRE_BROWSER_SCENARIO=naming` with the browser test's required local DB URL.

Primary card details and clarifications:
[Ryder Azadi](https://admin.starwarsunlimited.com/api/card/details/52067?locale=en),
[Garindan](https://admin.starwarsunlimited.com/api/card/details/40305?locale=en),
[Galen Erso](https://admin.starwarsunlimited.com/api/card/details/39605?locale=en).

## Phase duration and affected players

Transmission Jamming creates a title prohibition affecting both players for the
current phase. Its source is an event in discard; the restriction has its own
round/phase expiry and does not depend on that event remaining in a zone. Named
effects explicitly store the affected players and expiry. Source-dependent
restrictions still expire when their exact source unit leaves play. Phase-bound
restrictions are removed at phase expiry before subsequent trigger resolution.
The shared recovery workload covers an active Transmission Jamming prohibition.

## Board annotations

Viewer projections add named-title notes to an in-play source from its public
`card-named` facts, matching both instance and incarnation. Source departure
removes the note; a later incarnation does not inherit it. Ability-loss and play
restriction warnings use the engine’s active rules, not printed-text matching or
resource affordability. Only authorized faces receive these annotations. Hidden
hands and resources cannot be identified by marker changes.

The board renders yellow note and orange warning icons with hover explanations.
Named bases receive the same warning. Individual and grouped token badges retain
their warnings; a blank Shield explicitly says that it does not prevent damage.
Naming does not remove the Shield itself or its availability to pay another
card's costs. The base and token annotations disappear when Galen leaves play.
Tests cover source departure, temporary effect expiry, affected hidden copies,
and secret-differential spectator projections.
