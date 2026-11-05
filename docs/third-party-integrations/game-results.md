# Send game results

[Developer guide](../third-party-integrations.md) · [Account linking](account-linking.md) · [Token management](token-lifecycle.md)

Once a player has connected with `game-results:write`, your backend can submit
their results to `POST {SWUBASE_ORIGIN}/api/integration-apps/game-results`.

Send `Content-Type: application/json` and
`Authorization: Bearer YOUR_ACCESS_TOKEN`. Use that player's access token.
SWUBASE determines the player from the token; do not send a `userId`.

## First submission

The smallest request contains three fields:

```json
{
  "gameId": "practice-game-42",
  "playedAt": "2026-11-04T18:30:00Z",
  "isWinner": true
}
```

HTTP `200`:

```json
{
  "data": {
    "id": "RESULT_UUID",
    "gameId": "APP_SCOPED_GAME_ID"
  }
}
```

`id` is SWUBASE's result identifier. The returned `gameId` is namespaced by
SWUBASE; keep sending your original external `gameId` on retries and corrections.
Treat both response identifiers as opaque values.

Backend JavaScript:

```js
export async function submitSwubaseGame({ swubaseOrigin, accessToken, game }) {
  const response = await fetch(new URL('/api/integration-apps/game-results', swubaseOrigin), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(game),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new Error(`SWUBASE result submission failed (${response.status})`);
  }
  return (await response.json()).data;
}
```

The helper makes one request. Your background job should handle token refresh,
rate limits, and retries as described below and in the
[troubleshooting guide](testing-and-troubleshooting.md).

## Request fields

| Field                  | Required | Type and meaning                                                                                        |
| ---------------------- | -------- | ------------------------------------------------------------------------------------------------------- |
| `gameId`               | Yes      | Your stable game ID; nonempty string, up to 150 characters                                              |
| `playedAt`             | Yes      | ISO timestamp including `Z` or a timezone offset; the time the game was played                          |
| `isWinner`             | Yes      | `true` for a win, `false` for a loss, `null` for a draw, from this player's perspective                 |
| `matchId`              | No       | Your stable match ID, grouping multiple games; nonempty string, up to 150 characters                    |
| `gameNumber`           | No       | Game number within the match; integer from 1 to 32,767                                                  |
| `format`               | No       | Format label, up to 80 characters; for example `premier`, `nextSetPreview`, or `open`                   |
| `deckId`               | No       | UUID of an existing SWUBASE deck owned by the connected player                                          |
| `leaderCardId`         | No       | Player's SWUBASE leader card ID; nonempty string up to 150 characters, or `null`                        |
| `baseCardKey`          | No       | Player's SWUBASE base card ID or statistics base key; nonempty string up to 150 characters, or `null`   |
| `opponentLeaderCardId` | No       | Opponent's SWUBASE leader card ID; nonempty string up to 150 characters, or `null`                      |
| `opponentBaseCardKey`  | No       | Opponent's SWUBASE base card ID or statistics base key; nonempty string up to 150 characters, or `null` |
| `hasInitiative`        | No       | Boolean indicating whether this player had initiative                                                   |
| `hasMulligan`          | No       | Boolean indicating whether this player took a mulligan                                                  |

Only the four card fields accept explicit `null` when optional; `isWinner`
requires a boolean or `null`. Omit other optional fields when unknown. IDs and
format labels are trimmed. The entire JSON request must fit within 16 KiB.

Example with match and base information:

```json
{
  "gameId": "practice-match-12-game-2",
  "matchId": "practice-match-12",
  "gameNumber": 2,
  "playedAt": "2026-11-04T19:45:00+01:00",
  "isWinner": false,
  "format": "premier",
  "baseCardKey": "capital-city",
  "opponentBaseCardKey": "Command",
  "hasInitiative": true,
  "hasMulligan": false
}
```

Offsets are normalized to UTC. Results dated more than five minutes in the
future are rejected. Offline games can be queued and uploaded later with their
original timestamps when your backend can reach SWUBASE again.

## Player perspectives and matches

Submit one result for each connected player whose statistics should change.
For a game between Alice and Bob:

- With Alice's token, send `isWinner: true` if Alice won. Player card fields
  describe Alice; opponent fields describe Bob.
- With Bob's token, send `isWinner: false` for the same game. Swap the player
  and opponent card fields and use Bob's initiative/mulligan values.

You can use the same external `gameId` in both requests because results belong
to different players. If only Alice is connected, submit only Alice's result.

In a best-of-three match, use one `matchId`, a different `gameId` for every game,
and the corresponding `gameNumber`. Do not reuse one game ID for the entire
match. IDs should remain unique within your app across devices and restarts;
use UUIDs or a stable match/game namespace rather than a local counter alone.

## Card and deck identifiers

Use SWUBASE card IDs, not a display name, set/collector number, variant ID, or
Karabast numeric UID. If you maintain a card mapping, compare it with SWUBASE's
[official card catalog](../../server/db/json/card-list.json). Use the catalog's
card keys, and map the specific leader printing rather than guessing a slug.
The API also recognizes active preview cards maintained by SWUBASE.

You can omit card fields until you have a mapping. Known cards supplied in the
wrong slot, such as a unit in `leaderCardId`, are rejected. Unrecognized IDs are
retained and the result is marked as containing unknown cards; acceptance does
not mean an unrecognized ID was matched successfully.

Basic base IDs are normalized to the statistics key shared by equivalent bases.
For example, `capital-city` becomes `Vigilance`, while `theed-palace` becomes
`Command`. You can also send a recognized statistics base key directly. Bases
with distinct abilities keep their own ID or specialized key. The maintained
[base mapping](../../shared/lib/basicBases.ts) is the source of truth.

`deckId` means a SWUBASE deck UUID already owned by this player. It cannot be
your app's deck ID or another player's deck. There is no deck-listing or
deck-creation endpoint in this integration API, so omit it if you do not have
a valid owned deck ID. Submitting a result does not add a deck to a team.

## Retries and corrections

The identity of a result is the app, connected SWUBASE player, and your external
`gameId`. Repeating the same submission updates that result rather than creating
a duplicate. App namespaces prevent collisions with other integrations.

- Retry a failed or uncertain game submission with the **same** external ID.
- To correct a result, resend its **complete intended payload** with that ID.
  This endpoint is not a partial update: omitted optional fields are reset to
  their empty values on an editable existing result.
- Keep one retry queue item per player/game, and avoid out-of-order updates
  that could replace a newer correction with older data.
- If the player manually edited the result in SWUBASE, later submissions
  preserve that result. HTTP `200` then returns its existing identifiers; it
  does not guarantee your correction overwrote the player's changes.
- Player notes, exclusions from statistics, and event grouping remain under
  the player's control.

Imported games appear in normal SWUBASE statistics and the history identifies
the submitting app. This API currently accepts game outcomes and matchup
information. Unknown payload fields are rejected, including `userId`,
`gameSource`, `otherData`, and arbitrary card metrics. There are no integration
endpoints for deleting results, reading history, or uploading Karabast's
card-level metrics payload.
