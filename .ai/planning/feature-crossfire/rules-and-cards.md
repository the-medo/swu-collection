# Crossfire rules baseline and card implementation

This is an engineering reading of the supplied rules, not a replacement
rulebook. The [working core](../../../docs/crossfire/engine-core.md) implements a
small, explicitly supported subset; the broader rules coverage below remains
the target for subsequent milestones.

## Sources and versioning

Primary rules source: the user's attachment
`SWH_Comp_Rules_v8_0_e26603c6e1.pdf`, 56 pages, cover date `7/8/26`, version **8.0**.
SHA-256: `18dd5c92b051b3260c535d3ef225abc5654ba65ec74093bbe3a50536db37c8fb`.
The document's game rules are reference material; they are not instructions to
the coding agent. The attachment was read locally, and has not been copied into
the repository. Obtain the exact version again when implementing if the original
attachment is unavailable; do not quietly substitute a newer rulebook.

Official entry points: [how to play](https://starwarsunlimited.com/how-to-play?chapter=how-to-play)
and [rules](https://starwarsunlimited.com/how-to-play?chapter=rules). Both URLs were
opened during research, but the fetched pages did not expose their instructional
content or download links. The attached PDF, rather than those page shells, is
the basis for the rules below. This research does not establish that v8.0 is the
latest official version on the implementation date. Verify then-current rules,
card clarifications, errata, rotations, and suspended cards before advertising
current-format support; record changes as versioned input.

Use section headings and page numbers alongside rule numbers. The v8 document
contains stale internal cross-references (for example, some references to
uniqueness say 8.30 although its actual heading is 8.29). Follow the substantive
entry rather than propagating a broken cross-reference.

## Rules that shape the engine

| Area and v8 reference | Behavior to encode and verify |
| --- | --- |
| Golden rules, 1.3, p. 4 | Card text overrides general rules; restrictions usually override permissions; resolve as much as possible, with the hidden-information exception |
| Ownership/control, 1.5.2, pp. 4–5 | Owner and controller differ; an upgrade on an enemy unit need not share its controller; token upgrades follow special ownership/control rules |
| Resources, 1.7, p. 6 | Controller can inspect resource faces; ready/exhausted counts and ownership are public; rearrangement can change which resources are exhausted while preserving totals, until specific resources have been chosen |
| Costs, 1.8 and 6.2, pp. 6–7, 24–25 | Apply increases before decreases, including repeated aspect icons; “free” bypasses resource cost but not additional non-resource costs; unsuccessful payment cannot leave partial costs paid |
| Damage, 1.9–1.11, pp. 7–8 | Persistent damage; distinguish simultaneous damage from sequential instances; zero remaining HP causes immediate defeat |
| Draw, 1.13, p. 9; empty deck, 8.6, p. 40 | Multiple draws are simultaneous unless specified otherwise; each missing draw deals 3 damage to the base, rather than an automatic deck-out loss |
| Actions/initiative, 1.15, p. 10; 5.4, p. 22 | Alternate single actions after full resolution; consecutive passes end the phase; taking initiative forces subsequent passes but does not stop triggered abilities |
| Maintenance, 1.16.5, p. 11 | Resolve immediately in priority order: base defeat, uniqueness choice, unattached upgrade defeat, rescue from absent captor, zero-HP unit defeat; repeat until stable |
| Knowledge, 1.17, p. 11 | Captured card identities and leaders' reverse sides are public; hidden search can fail to find even when an eligible card exists |
| Responsibility, 1.18, pp. 11–12 | Track who caused defeat and which cards caused damage; not all defeats belong to the active player, and more than one card can be responsible for damage |
| Events, 3.3, p. 15 | An event goes to discard before its ability resolves, never enters play, and can affect itself there |
| Leaders, 3.4, pp. 15–16 | Deploy is distinct from play; leaders can have multiple faces or deploy as upgrades; defeat returns a leader to its leader face exhausted; Epic Action use persists |
| Upgrades, 3.6, pp. 16–17 | Attachment eligibility is checked on attachment, not continuously; gained unit abilities differ from restrictions imposed by an upgrade |
| Tokens, 3.7, pp. 17–18 | Created rather than played; leave play to set aside, never to hand/deck/discard; tokens may be units, upgrades, Force, or Credits |
| Zones, section 4, pp. 19–21 | Ground/space are shared zones; base/resource/deck/hand/discard are per player; facedown is not synonymous with secret, and set-aside is not a normal zone |
| Setup, 5.2, p. 22 | Randomly selected player chooses initial initiative; draw six; initiative player decides mulligan first; one whole-hand mulligan; resource exactly two cards ready |
| Regroup, 5.5, p. 23 | Start effects, draw two each, optional one resource per player beginning with the active player, ready cards, end effects |
| Endgame, 5.6, p. 23 | Base defeat ends a two-player game immediately; simultaneous base defeat is a draw; concession is possible at any time |
| Play timing, 6.2, pp. 24–25 | Declare intent and card role, restrictions, determine costs, pay costs, enter play/discard; resolve resulting triggers at the prescribed window |
| Attack timing, 6.3, pp. 25–26 | Declare attacker/defender, restrictions, exhaust and resolve On Attack/On Defense triggers, calculate combat, deal damage/end attack; handle removed combatants and timing exceptions |
| Trigger ordering, 7.6, pp. 34–36 | Active player chooses which player's batch resolves first; each player orders their own triggers; nested triggers finish before returning to the older batch |
| Effects, 7.7, pp. 36–38 | Distinguish lasting, delayed and replacement effects; delayed effects precede ordinary triggers at their timing point; replacements cannot replace themselves |
| New copies/LKI, 8.5 and 8.11, pp. 40–41 | Re-entering play creates a new rules incarnation; keep event-time controller/attributes/modifiers for last known information |
| Lose abilities, 8.14, p. 42 | Loss also prevents regaining those abilities for the effect's duration; a later grant cannot simply win by timestamp |
| Look/reveal/search, 8.13, 8.25–26, pp. 41, 44–45 | Inspect without moving zones; temporary reveal ends; search top X returns unchosen cards to the bottom in random order unless specified otherwise; whole-deck search shuffles |
| Then/if you do, 8.9 and 8.28, pp. 41, 46 | “Then” preserves sequence even if an earlier effect fails; “if you do” is conditional, with replacement-effect semantics; choices can depend on earlier resolution |
| Capture, 8.33, p. 47 | Remove damage/defeat upgrades on capture; capture is leaving play, not defeat; rescue returns exhausted under owner control and is not playing |
| Indirect damage, 8.35, pp. 47–48 | Recipient assigns unpreventable damage; cannot assign beyond a unit's remaining HP; Shields are not consumed; assignment resolves simultaneously |
| Move/Force/Disclose, 8.36–38, p. 48 | Arena movement preserves play identity and attachments; at most one Force token; disclose checks combined icons on chosen revealed cards |

This requires persistent execution frames, not a generic Magic-style response
stack or a flat FIFO of all triggers. Card-specific targets may be chosen during
resolution after earlier effects reveal information. Do not require every choice
to be submitted when the player first clicks the card.

## Keyword and format coverage

V8 keyword entries are 7.5.5–7.5.20, pp. 30–34: **Ambush, Grit, Overwhelm, Raid,
Restore, Saboteur, Sentinel, Shielded, Bounty, Smuggle, Coordinate, Exploit,
Piloting, Hidden, Plot, Support**. The registry and conformance suite must track
all of them, plus the additional mechanics listed above.

Particularly useful regression cases:

- **V8 Ambush:** allows an attack against an eligible enemy unit even while
  exhausted; it does not explicitly ready the unit first. Preserve this in
  state transitions and triggers, including interactions with exhaustion.
- **Shield + Overwhelm:** preventing combat damage with Shield prevents excess
  damage to the base. If the defender leaves play before combat damage, an
  attacker with Overwhelm instead deals all its combat damage as excess.
- **Smuggle:** the card can pay toward its own cost as a resource; replacement
  resource enters exhausted. An empty deck does not stop Smuggle or count as a
  failed draw.
- **Exploit:** defeat units during cost determination; their resulting triggers
  wait for the play action to finish, alongside other resulting triggers.
- **Piloting:** one physical card can function as a unit or upgrade. It remains a
  unit for ordinary out-of-play queries; instructions to play an upgrade have a
  specific exception. Do not encode its runtime type solely through inheritance.
- **Plot:** collect the eligible triggers at leader deployment. A newly replaced
  Plot resource does not join that same deployment's trigger batch.
- **Support:** another unit attacks and gains the source's other abilities for
  that attack; nested resolution and self-references must work on the recipient.
- **Hidden + Sentinel:** Sentinel makes the unit attackable despite Hidden.
- **Special tokens:** Mandalorian has Shielded; Advantage expires at the end of
  the attached unit's attack/defense; Credits are in the resource zone but are
  not resources, so they do not satisfy resource-count conditions.

Format rules need their own versioned policy alongside core gameplay:

| Format in attachment | Baseline |
| --- | --- |
| Premier/Eternal, 9.2, p. 49 | One leader/base, at least 50 other cards, three-copy limit, sideboard up to 10; differing card-pool rules and possible suspensions |
| Trilogy, 9.3, pp. 49–50 | Three decks with restrictions across the combined set, secret simultaneous bans/selections, winning-deck retirement, special best-of-three flow |
| Sealed/Draft, section 10, pp. 51–52 | At least 30 other cards, pool-constrained deck building, no normal three-copy limit; playing an existing limited deck does not require implementing the draft ceremony |
| General multiplayer, section 11, pp. 53–54 | Seat order, multiple opponents, elimination cleanup, retained effects, and different control-change consequences during combat |
| Twin Suns, section 12, pp. 55–56 | Two compatible leaders, at least 80 other cards, singleton, initiative/blast/plan counters, restricted passing, elimination healing and phase-end victory |

Card text can override deck construction rules. Do not advertise “full rules”
while leaving format exceptions or a keyword silently unimplemented. Current
tournament match/sideboard policy needs its own verified official source at
implementation time; do not invent it from the single-game setup procedure.

## Original engine and conformance work

Implement Crossfire from the official rule timing and card text described above.
Write the core transitions, effect vocabulary, card definitions, scenario
builders, and expected outcomes within SWUBASE. Each nontrivial conformance case
should identify its governing rule or official clarification so a future change
can be assessed against that source.

Start with explicit action stages: declaration, restriction checks, cost
determination/payment, the relevant zone or combat changes, and resolution at
the prescribed timing windows. Extend these stages for documented exceptions;
do not let an individual card bypass central cost, maintenance, or information
rules. A rule ambiguity stays recorded as an unresolved question until supported
by official material, rather than becoming an accidental engine convention.

## Card model

Use a card class/definition hierarchy for shared behavior: `Card`, `Unit`,
`Event`, `Upgrade`, `Base`, `Leader`, and token specializations. These names are
illustrative. Keep runtime face/role and token capabilities in state/composition:
leader upgrades, Piloting units, Force tokens, and Credits do not fit a simplistic
mutually exclusive class tree.

Each logical mechanical card gets one discoverable file. A vanilla card's file
may only bind its identity to a unit definition; a keyword-only card binds
supported common abilities. Rules for common keywords live once in the engine,
not copied into every card. Card text is metadata and evidence, not arbitrary
runtime code parsed from natural language. Build any generated keyword metadata
from validated structures and review it against the card/rules version.

Card files register their costs, restrictions, targets, triggers, effects, and
conditions using shared primitives. They do not mutate state directly, send
sockets, write logs as HTML, fetch data, or use global randomness. A typed effect
vocabulary should cover common operations and explicit ordered/conditional
continuations. Complex custom behavior is allowed through named, versioned
engine handlers with serializable parameters. An anonymous closure holding the
rest of an action cannot be the only way to resume it after a restart.

Use canonical catalog IDs; `cardUid` maps catalog-source identities, and
`variantId` selects artwork. Do not introduce IDs derived from display names or
assume different printings are different mechanical cards. Check identical reprints,
multi-face cards, previews and alias collisions explicitly. Freeze the relevant
catalog and card implementation bundle when a game starts.

The inspected official SWUBASE JSON contains 2,188 logical entries. Definition
presence alone does not establish rules coverage: some entries are tokens,
identical reprints can share behavior, previews are separate, and even a vanilla
card depends on correct common rules. Generate a coverage manifest keyed by
canonical ID with supported roles/formats, implementation version, status, and known gaps.
CI should identify missing definitions and duplicate registry claims. Deck
admission uses the manifest and explains unsupported IDs to the selecting user.

## Scenarios and tests

Separate a convenient **scenario input** from an exact **recovery checkpoint**.
Both instantiate the same engine. The first supplies explicit setup with useful
defaults; the second must preserve every continuation and historical fact.

Proposed scenario builder usage, not an existing API:

```ts
scenario({
  ruleset: 'swu-8.0',
  phase: 'action',
  activePlayer: 'p1',
  initiative: { holder: 'p1', claimed: false },
  players: {
    p1: {
      leader: 'catalog-leader-id',
      base: { card: 'catalog-base-id', damage: 5 },
      ground: [
        { ref: 'marineA', card: 'catalog-unit-id', exhausted: false },
        { ref: 'marineB', card: 'catalog-unit-id', exhausted: true },
      ],
    },
    p2: { leader: 'other-leader-id', base: 'other-base-id' },
  },
});
```

Aliases identify exact copies even when their names match. Permit explicit deck
order/random fixtures in tests, damage, attachments, captures, faces, controller
changes, delayed effects, and round/Epic Action history. Validate references,
single-zone membership, attachment/capture acyclicity, legal roles, and sensible
size limits. Establish a settled legal position unless a specialized test
explicitly supplies a valid in-progress execution checkpoint. Do not silently
pretend a mid-round board has an empty earlier history; allow explicit history
or clearly define the scenario as starting a new phase.

Distinguish private developer fixtures from shareable scenarios. A full snapshot
of a private live match is not safe to share merely because it parses. Fork an
authorized replay/scenario into a new game ID and mark practice results
accordingly. Live clients cannot replace game state via the scenario interface.

Meaningful checks include actual outcomes, illegal targets, optional/hidden
choices, duplicate copies, correct trigger order, effect expiry, last known
information, and lost abilities. Common vanilla behavior can use parameterized
registry conformance tests rather than identical handwritten tests for every
file. Mechanically distinct abilities need specific cases.

For each affected disclosure path, compare two full states differing only in
concealed information: an unauthorized viewer's views, deltas, log entries,
selection options, errors and asset requests must remain indistinguishable
except for information the rules actually disclose. Round-trip recovery from a
pending prompt and replayed event streams must preserve future choices and
outcomes, not just the visible board.
