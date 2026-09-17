# Homeworlds in Crossfire

Crossfire implements all **275 canonical identities with an HMW printing** in
the official catalog, including reprints and tokens. This completes the earlier
180-card preview batch with **88 new definitions**. The registry contains 1,768
definitions across all supported sets.

The official card text is in `server/db/json/card-list.json`.
`play/cards/hmw/catalog.json` pins the printed data for the 268 non-reprint,
non-token HMW implementations; existing reprints retain their original
implementation files. Each new card has a canonical-ID file and an explicit
registry entry. Rules behavior follows the repository's pinned SWU v8.0 baseline.

## Release and preview identity transition

Runtime and card data are **1.2.0**, with `requiredEngine: 1.2.0`.
Deploy the compatible API/game worker before activating the card bundle.
Exporting or merging source does not activate a release; follow
[card releases](card-releases.md) for export, publication and administrator activation.

Current implementations use these official identities:

| HMW number | Former preview ID            | Official ID                   |
| ---------- | ---------------------------- | ----------------------------- |
| 104        | `garnac--let-the-hunt-begin` | `garnac--let-the-hunt-begin-` |
| 107        | `stormtrooper-patrol--`      | `stormtrooper-patrol`         |

Old IDs are not aliases in the new bundle. Existing games/replays continue using
their installed immutable catalogs and original IDs. Keep those installed
bundles. This source change does not rewrite stored game state, decks or preview
rows; any remaining saved preview references use the existing
[preview migration workflow](../preview-cards/preview-card-docs.md).

The official import currently leaves the planetary traits empty on 13 new
bases. The Crossfire snapshot retains their previously pinned printed traits,
rather than disabling abilities that depend on those planets:

- Dune Sea: Tatooine.
- Great Grass Plains: Naboo.
- Kachirho: Kashyyyk.
- Bright Tree Village: Endor.
- Origin Tree: Kashyyyk.
- Tusken Camp: Tatooine.
- Bioweapons Lab: Naboo.
- Jundland Wastes: Tatooine.
- Dendroid Wilds: Endor.
- Shadowlands: Kashyyyk.
- Kyyyalstaad Swamp: Kashyyyk.
- Otoh Gunga: Naboo.
- Research Station 9: Endor.

Other HMW printed fields now match the official import, including corrected
names and the two IDs above. Official Shield token entries with null stat
fields represent zero modifiers.

## Shared mechanics added

- `UnitFilter.noAbilities` distinguishes actual abilities from printed identity
  and externally imposed stat modifiers. Rex benefits vanilla or blanked units;
  an inactive conditional ability still prevents his bonus.
- `UnitFilter.sharesTraitWith` compares exact bound copies using current traits.
  Familiar Strategem excludes its attacker when looking for another friendly unit.
- `traitGrants.selfFromLeaders` supports self-only trait inheritance, including
  explicit outside-play operation and exclusions. Zam inherits current friendly
  leader traits except Force, using ownership outside play and control in play.
- `in-play-aspect-icons` counts repeated icons across specified public roles.
  Commander Gree includes units and upgrades, not undeployed leaders or bases.
- `unit-keyword-value` reads effective Raid/Restore totals. Volley Fire preserves
  the selected unit as the damage source.
- Upgrade filters can constrain trait or base/unit host. Renew and Wild Space
  Wanderer use these restrictions.
- `upgrades-count.lastKnown` can read the departed incarnation's recorded
  attachments. Progenitor still counts its Weaknesses if the new token defeats it.

All extensions are optional data fields/new numeric variants. Contracts for
1.0 and 1.1 remain retained; historical definitions do not opt into these changes.
Choices use existing serializable engine continuations.

## New definitions

- HMW 065: Clone of the Zillo Beast, Emperor's Experiment (`clone-of-the-zillo-beast--emperor-s-experiment`).
- HMW 067: The Great Progenitor, First of the Drengir (`the-great-progenitor--first-of-the-drengir`).
- HMW 068: Imperial Commandos (`imperial-commandos`).
- HMW 086: N-1 Patroller (`n-1-patroller`).
- HMW 087: Venomous Wyyyshokk (`venomous-wyyyshokk`).
- HMW 089: Territorial Mudhorn (`territorial-mudhorn`).
- HMW 090: Opee Sea Killer (`opee-sea-killer`).
- HMW 091: Pelta Relief Frigate (`pelta-relief-frigate`).
- HMW 092: Starlit Purrgil (`starlit-purrgil`).
- HMW 093: Coastal Catamarans (`coastal-catamarans`).
- HMW 096: Devotion (`devotion`).
- HMW 097: Dire Prowess (`dire-prowess`).
- HMW 098: Resonate (`resonate`).
- HMW 099: Always a Bigger Fish (`always-a-bigger-fish`).
- HMW 101: Trust Yourself (`trust-yourself`).
- HMW 106: Secessionist Convert (`secessionist-convert`).
- HMW 111: Invasion Lander (`invasion-lander`).
- HMW 119: Saw Gerrera, Shadowlands Insurgent (`saw-gerrera--shadowlands-insurgent`).
- HMW 120: Auzituck Avenger (`auzituck-avenger`).
- HMW 129: Child of Dathomir (`child-of-dathomir`).
- HMW 130: Emerie Karr, For Your Own Good (`emerie-karr--for-your-own-good`).
- HMW 131: Soaring Can-Cell (`soaring-can-cell`).
- HMW 132: Tibidee Mate (`tibidee-mate`).
- HMW 133: Wroshyr Rebel (`wroshyr-rebel`).
- HMW 134: Zam Wesell, Not What She Seems (`zam-wesell--not-what-she-seems`).
- HMW 137: V-19 Skirmisher (`v-19-skirmisher`).
- HMW 138: Commander Gree, Of the 41st Elite Corps (`commander-gree--of-the-41st-elite-corps`).
- HMW 139: Flock of Mynocks (`flock-of-mynocks`).
- HMW 141: Rex, Outserved His Purpose (`rex--outserved-his-purpose`).
- HMW 144: Howler Pack (`howler-pack`).
- HMW 146: Outer Rim Garrison (`outer-rim-garrison`).
- HMW 148: Local Support (`local-support`).
- HMW 149: Log Trap (`log-trap`).
- HMW 150: Migrate (`migrate`).
- HMW 153: Poacher's Starfighter (`poacher-s-starfighter`).
- HMW 155: Filthy Dianoga (`filthy-dianoga`).
- HMW 157: Corpo Thugs (`corpo-thugs`).
- HMW 165: Commandeered Tour Shuttle (`commandeered-tour-shuttle`).
- HMW 166: Gungi, Fighting for Kashyyyk (`gungi--fighting-for-kashyyyk`).
- HMW 167: Dune Sea Nomads (`dune-sea-nomads`).
- HMW 173: Rebel Operation (`rebel-operation`).
- HMW 178: Desperate Nantex (`desperate-nantex`).
- HMW 179: Feisty Blurrg (`feisty-blurrg`).
- HMW 181: Tusken Bantha Rider (`tusken-bantha-rider`).
- HMW 183: Nightsister Prodigy (`nightsister-prodigy`).
- HMW 184: Aggrocrab (`aggrocrab`).
- HMW 186: Mining Guild Trespasser (`mining-guild-trespasser`).
- HMW 187: Dathomiri Rancor (`dathomiri-rancor`).
- HMW 189: Neebray Manta (`neebray-manta`).
- HMW 190: Enraged (`enraged`).
- HMW 191: Hunter's Instinct (`hunter-s-instinct`).
- HMW 192: Volley Fire (`volley-fire`).
- HMW 194: Run Amok (`run-amok`).
- HMW 195: Catch the Scent (`catch-the-scent`).
- HMW 198: Treacherous Pyke (`treacherous-pyke`).
- HMW 199: Geonosian Picador (`geonosian-picador`).
- HMW 209: Corona Squadron X-Wing (`corona-squadron-x-wing`).
- HMW 216: Insurgent Camp (`insurgent-camp`).
- HMW 218: New Tactics (`new-tactics`).
- HMW 220: Clever Trapper (`clever-trapper`).
- HMW 224: Tusken Raider (`tusken-raider`).
- HMW 227: Horizon Chaser (`horizon-chaser`).
- HMW 228: Lakeside Shaaks (`lakeside-shaaks`).
- HMW 232: Mon Cal Cruiser (`mon-cal-cruiser`).
- HMW 233: Awakened Exogorth (`awakened-exogorth`).
- HMW 235: Gaderffii Stick (`gaderffii-stick`).
- HMW 236: Booma Ball (`booma-ball`).
- HMW 241: Howl (`howl`).
- HMW 242: Occupation Officer (`occupation-officer`).
- HMW 244: Separatist Harbinger (`separatist-harbinger`).
- HMW 245: Trandoshan Collaborator (`trandoshan-collaborator`).
- HMW 246: Pyke Sarisa (`pyke-sarisa`).
- HMW 248: Defoliator Tank (`defoliator-tank`).
- HMW 249: Frenzied Tri-Fighters (`frenzied-tri-fighters`).
- HMW 250: Imperial Cavalry (`imperial-cavalry`).
- HMW 252: Villainous Ambition (`villainous-ambition`).
- HMW 253: Forced Pacification (`forced-pacification`).
- HMW 256: Jedi Interceptor (`jedi-interceptor`).
- HMW 258: Ryloth Revolutionary Rider (`ryloth-revolutionary-rider`).
- HMW 259: Pack Guardian (`pack-guardian`).
- HMW 261: Ben Kenobi, Don't Be Afraid (`ben-kenobi--don-t-be-afraid`).
- HMW 262: Mylaya Rider (`mylaya-rider`).
- HMW 264: Heroic Bravery (`heroic-bravery`).
- HMW 266: Familiar Strategem (`familiar-strategem`).
- HMW 267: Renew (`renew`).
- HMW 269: Friendly Eopie (`friendly-eopie`).
- HMW 270: Wild Space Wanderer (`wild-space-wanderer`).
- HMW 271: Landing Pad (`landing-pad`).

## Verification

`play/testing/hmw-official.test.ts` checks official coverage, IDs, keyword and
vanilla profiles, conditional traits/stats, new effects, optional branches and
multi-step choices. It resumes representative pending choices in a fresh
process and checks private inspection projections. The two old preview IDs also
have fixed recordings captured with the unmodified 1.1.0 runtime at commit
`7e675925`; a cold 1.2.0 process verifies their original hashes and facts. The existing HMW regression,
catalog, and fixed historical replay tests remain part of `bun run play:check`.

Relevant commands:

```bash
bun test play/testing/hmw-official.test.ts
bun run play:check
bun run play:coverage
bun run play:cards:export
```

An executable archive smoke check requires committed runtime sources. Card
publication and activation are separate operational steps.
