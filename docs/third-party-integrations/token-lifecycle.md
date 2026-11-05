# Manage tokens and connections

[Developer guide](../third-party-integrations.md) · [Account linking](account-linking.md) · [Troubleshooting](testing-and-troubleshooting.md)

## Store one connection per player

After [exchanging the authorization code](account-linking.md#3-exchange-the-code),
store the connection in your backend. A useful record contains:

| Value                            | Purpose                                                                          |
| -------------------------------- | -------------------------------------------------------------------------------- |
| Your local player ID             | Identifies the account in your app that initiated linking                        |
| SWUBASE origin and app client ID | Keeps test and production connections separate                                   |
| SWUBASE user ID                  | Stable identity from `/api/integration-apps/me`, when `profile:read` was granted |
| SWUBASE display name             | Optional label for your app's connection screen                                  |
| Access token                     | Authorizes profile and game-result requests                                      |
| Refresh token                    | Replaces an expiring access token                                                |
| Access expiry time               | Derived from the token response's `expires_in`                                   |
| Refresh expiry time              | 30 days after issuance; reset after every successful refresh                     |
| Granted permissions              | Space-separated `scope` from the token response, stored as a set/list            |
| Connection status                | For example, connected or needs reconnection                                     |

Protect tokens at rest using your backend's credential storage or encryption.
SWUBASE stores hashes, but your app must retain usable token values to send
requests. Do not send them to your frontend, put them in URLs, or log them.

SWUBASE tokens are opaque strings. Do not decode them as JWTs or infer their
expiration from their contents. Store both tokens and expiry metadata together.
Using the request start time when computing expiry gives a conservative
estimate; refresh shortly before access expiry to allow for clock/network delay.

## Refresh the connection

Access tokens expire after one hour. From your backend, send
`POST {SWUBASE_ORIGIN}/api/integration-apps/token` with
`Content-Type: application/json`:

```json
{
  "grant_type": "refresh_token",
  "client_id": "YOUR_CLIENT_ID",
  "client_secret": "YOUR_CLIENT_SECRET",
  "refresh_token": "CURRENT_REFRESH_TOKEN"
}
```

A successful HTTP `200` response has the same top-level fields as the initial
exchange:

```json
{
  "access_token": "swu_access_NEW_RETURNED_VALUE",
  "refresh_token": "swu_refresh_NEW_RETURNED_VALUE",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "profile:read game-results:write"
}
```

Save **both new tokens** atomically. The old access token stops working
immediately, and the old refresh token is consumed. The replacement refresh
token starts a new 30-day lifetime. If no successful refresh happens before
that lifetime ends, the player must connect again.

Refreshing does not add permissions. Changing the requested permission set
requires a new approval flow.

### Serialize refreshes across workers

Only one refresh may run for a connection at a time. Use a per-connection lock
shared by every worker or process that can refresh it. An in-memory lock is
sufficient only when all such work runs in one process.

Use this sequence in your backend:

```text
Acquire the connection's refresh lock.
  Reload the latest saved connection.
  If another worker already refreshed it, use the saved access token.
  Otherwise send one refresh request with the current refresh token.
  On success, atomically save both new tokens and their expiry times.
Release the lock.
Use the current access token for the queued API request.
```

Reusing a consumed refresh token before its original expiry revokes the entire
connection. This also applies to two concurrent requests using the same refresh
token: even the tokens returned to the successful request become unusable.

Disable automatic retries for refresh requests. If a response is lost or a
request times out, the server may already have rotated the tokens. Check whether
your own storage has the replacement pair; if it does not, mark the connection
as needing reconnection. Do not keep retrying the old refresh token.

### Handle an expired access token

Before an API request, refresh if your stored access expiry is approaching.
If a resource request still returns `401`, reload the connection first: another
worker may already have replaced the token. Retry with that newer token, or
perform one serialized refresh if appropriate. Avoid an endless refresh/retry
loop. If refresh is rejected or the connection is gone, ask the player to
connect again.

For a game submission, retry with the same `gameId` after obtaining a valid
access token. A resource rate limit is separate from the token-exchange limit;
refreshing is not a way to reset a player's game-submission allowance.

## Reconnect or disconnect

There is one active connection per app and SWUBASE player. Completing a new
approval and token exchange replaces the previous token pair and permissions.
Share that connection through your backend across the player's devices.

Players revoke access in SWUBASE under **Settings → Integrations**
(`/settings?page=integrations`) using **Disconnect app**. This invalidates the
connection and pending authorization codes. Already imported results remain.

If you offer “Disconnect” inside your own app, stop uploads and delete your saved
tokens. Direct the player to SWUBASE's Integrations settings to revoke access on
the SWUBASE side as well. This integration API has no bearer-token revocation
endpoint or disconnection webhook; SWUBASE's settings endpoints require its own
signed-in session and are not a substitute.

Your app may retain queued results according to its own policy, but upload them
only after the same local player reconnects to the intended SWUBASE account.
Do not silently send an old queue to a different account after relinking.

## Changes to your app registration

These actions are available to the app owner in **Settings → Developer apps**:

| Action                                                          | Effect on connections                                                               |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Change name, description, callback URLs, or allowed permissions | Revokes all pending codes and connections; players must approve again               |
| Save without changing values                                    | Preserves connections; reordering callbacks or permissions also counts as unchanged |
| Rotate secret                                                   | Replaces the secret immediately and revokes all codes and connections               |
| Disable app                                                     | Stops access and revokes all codes and connections                                  |
| Re-enable app                                                   | Allows new approvals; does not restore old connections                              |
| Delete app                                                      | Removes the registration and its credentials/connections                            |

These actions do not delete previously imported game results. Plan registration
changes and secret rotation as events that require players to reconnect.
Restrictions on the app owner's or connected player's SWUBASE account can also
block access.
