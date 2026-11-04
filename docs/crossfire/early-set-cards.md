# SOR, SHD and TWI implementation

The first expansion batch adds 90 canonical definitions, 30 from each set,
using the existing engine. Identical reprints reuse their original definition.
The registry now contains 1,967 definitions; these sets remain partially supported.

Coverage against the tracked official catalog after this batch:

| Set | Implemented identities | Total identities | Remaining |
| --- | ---: | ---: | ---: |
| Spark of Rebellion | 96 | 254 | 158 |
| Shadows of the Galaxy | 87 | 264 | 177 |
| Twilight of the Republic | 77 | 259 | 182 |

Counts include leaders, bases and reprints. The SHD and TWI gains exceed 30
because they also reprint newly implemented SOR/SHD cards. Unsupported cards
continue to be rejected at deck admission.

The batch covers vanilla units; Ambush, Sentinel, Shielded, Saboteur, Grit,
Overwhelm, Raid and Restore; live Coordinate bonuses; faction auras;
upgrade and initiative conditions; healing, readying, damage, removal,
Experience grants, drawing and Clone Trooper/Battle Droid creation.
Printed text, uniqueness and official clarifications are pinned in
[early-set-foundations.json](../../play/testing/fixtures/early-set-foundations.json).
Rules use the engine's pinned Comprehensive Rules v8 baseline. In particular,
Ambush permits attacking while exhausted without readying the unit.

[The conformance scenarios](../../play/testing/early-set-foundations.test.ts)
check target restrictions, optional branches, conditional bonuses disappearing,
live power, deployed leaders, simultaneous damage and token timing. Selected
healing, defeat-trigger and damage-replacement choices also resume in a fresh
process. Shared catalog checks verify every new definition against its identity,
printed statistics and pinned text.

Card release `1.4.1` requires engine `1.4.0`; this batch adds no engine capability
or checkpoint changes. [The addition manifest](../../play/cards/early-set-additions.json)
excludes these new cards from the frozen development baseline so its historical
catalog checksum remains unchanged. The explicit registry remains the runtime
source of truth.
