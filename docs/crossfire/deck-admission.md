# Preparing SWUBASE decks for Crossfire

The private [deck reader](../../server/lib/crossfire/readDeckInput.ts) reads
SWUBASE deck metadata and contents in one repeatable-read transaction. Its caller
must provide the authenticated session's user ID and the official-only catalog
from `server/db/lists.ts`. It takes an injected Drizzle database and does not
import the main application or read credentials.

Private decks are readable by their owner. Public/unlisted decks are readable by
an authenticated caller with the ID; unlisted access does not imply discovery.
Missing and inaccessible decks both return `null`, with no card details. Limited
decks additionally require consistent ownership/pool metadata and visibility in
`card_pool_decks`; one stale public metadata record cannot expose a private deck.
No special administrator bypass is added.

| Source | Mainboard | Inactive cards | Omitted |
| --- | --- | --- | --- |
| Normal `deck_card` rows | Board 1 | Board 2 sideboard | Zero quantities and board 3 |
| Limited physical pool copies | Location `deck` | Location `pool`, stored as reserve | Location `trash`; leader/base slot cards |

Limited copies are resolved against their own pool and aggregated by logical
card ID. An unresolved non-trash physical reference is an error, not a silently
shorter deck. Pool reserve is never treated as a constructed sideboard. Neither
model mutates the source deck or relies on its `updatedAt` timestamp.

[prepareDeckSnapshot](../../play/admission/decks.ts) validates the resulting input
against the explicitly selected Crossfire format and compiled card bundle. Only
`core-practice` is currently supported: one implemented leader/base and 6–120
implemented non-token main-deck cards. Data Vault raises that minimum to sixteen;
the upper limit stays 120. It rejects missing or unknown identities,
unsupported main cards, invalid roles/quantities, a second leader and other
requested gameplay formats. This is a development practice format, not a claim
of Premier, Limited, rotation, ban-list or card-specific construction legality.
The source SWUBASE format is retained as metadata and does not silently select a
rules implementation.

A successful snapshot is detached and recursively frozen. It includes canonical
mainboard/sideboard/reserve rows, executable pins, the official catalog's identity
and type hash, and a private content hash. Equivalent reordered/split rows share
a hash; source deck IDs are excluded from that content identity. Subsequent source
edits do not alter an already prepared snapshot. The identity/type hash is not a
hash of all printed card text; mechanical behavior is pinned by the card bundle.

Core practice has no sideboarding. Inactive cards are retained with a separate
unsupported-card report and cannot become live cards without new admission
validation. Unsupported reserve cards therefore do not prevent playing an
otherwise supported limited main deck. The source deck ID, complete lists and
hashes are private admission data and must not appear in opponent lobby metadata,
viewer projections or contributor dumps.

The [lobby service](lobbies.md) now persists these snapshots with accepted seats
and atomically creates the initial game when both players join. The private
[connection service](connections.md) issues and redeems admission tickets;
[HTTP admission](http-admission.md) exposes lobby operations and ticket issuance when enabled. The
network game service is still separate work.
Preview behavior is deliberately absent.

The local integration suite (`bun run play:storage:test` with an explicit local
`CROSSFIRE_TEST_DATABASE_URL`) covers private/public/unlisted access, normal and
limited storage, both limited visibility copies, dangling physical references,
zero/maybeboard/trash exclusions, unsupported cards/formats and stable snapshots
through source edits. Fixtures use synthetic accounts/decks and clean up only
those records.
