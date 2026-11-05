# Test and troubleshoot your integration

[Developer guide](../third-party-integrations.md) · [Account linking](account-linking.md) · [Game results](game-results.md) · [Tokens](token-lifecycle.md)

## Test the complete player journey

Use a separate test registration and test players. For local callback testing,
register the exact HTTP loopback URL, including its port. Your browser must be
able to reach both that callback and the SWUBASE instance. Choose a callback
URL that matches where your app's callback server actually runs; `localhost`
in the player's browser means the player's machine.

1. Create an app and save its secret. Reload the settings page and confirm your
   integration does not rely on retrieving that secret again.
2. Start from your app as player A. Follow **Connect SWUBASE**, approve, return
   to your callback, and show the account returned by `/me`.
3. Repeat from a signed-out SWUBASE browser session. Sign in and finish approval.
4. Deny approval. Your callback should validate state and show cancellation
   without exchanging a code or marking the player connected.
5. Try a missing, modified, expired, duplicated, or already consumed state.
   Your callback should reject it without attaching a connection.
6. Submit a game and inspect that player's SWUBASE statistics/history.
7. Send the same payload again. It should return the same result ID and leave
   only one game in the player's history.
8. Correct the complete payload using the same game ID. Then manually edit that
   game in SWUBASE and verify another submission preserves the player's edit.
9. Link player B and submit the same external game ID with B's token. Confirm
   that each player's result belongs to the correct account and perspective.
10. Refresh once and save both tokens. Confirm requests use the replacement
    access token. Exercise simultaneous jobs in your app and verify they share
    one refresh operation.
11. Disconnect in SWUBASE. Your app should stop sending with rejected tokens and
    offer reconnection. Existing imported results should remain.
12. On a disposable test registration, try secret rotation, a registration edit,
    and disabling/re-enabling. Verify that affected players must reconnect.

SWUBASE also rejects missing/wrong client secrets, expired or reused codes,
wrong callback URLs, cross-app credentials, and requests beyond granted
permissions. Include these failures in your client tests. You can refresh early
to test rotation without waiting an hour. Deliberately replay a refresh token
only with a disposable connection because doing so revokes it.

## Read errors by HTTP status

Check the HTTP status before treating a response as successful. Expected service
errors normally contain a safe `message`:

```json
{
  "message": "Invalid or expired authorization code."
}
```

Request-validation failures can instead contain `success: false` and an `error`
object. Malformed JSON, proxies, or unavailable services may return other body
formats. Your error handling must tolerate non-JSON responses and must not assume
that every error has `message`. Avoid logging complete requests or responses
that may contain credentials or callback values.

| Status               | Typical cause                                                                                  | What your app should do                                                                                                         |
| -------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `400`                | Invalid fields, bad scope or callback, expired/used code, invalid/expired/reused refresh token | Correct the input; restart linking when the grant cannot be used. Do not blindly retry token requests.                          |
| `401`                | Wrong client credentials, missing bearer token, expired/replaced/revoked access token          | Check configuration for token calls. For resource calls, use the latest stored token or the serialized refresh flow.            |
| `403`                | Missing permission or restricted player/app-owner account                                      | Check granted permissions and account status. A refresh cannot add a permission.                                                |
| `404`                | App unavailable, or `deckId` inaccessible to the connected player                              | Check the app registration and deck ownership. Do not treat every 404 as a missing API route.                                   |
| `409`                | App owner has reached the ten-app registration limit                                           | Reuse an appropriate registration or remove an unused one in settings.                                                          |
| `413`                | Request body exceeds 16 KiB                                                                    | Submit one compact game result per request.                                                                                     |
| `429`                | Rate limit reached                                                                             | Respect `Retry-After`, queue work, and retry later.                                                                             |
| `500` or other `5xx` | SWUBASE or an upstream service failed                                                          | Retry profile/game requests with bounded backoff. Treat uncertain token exchanges or refreshes as described in the token guide. |

## Rate limits and retries

The current API applies a 120-requests-per-minute limit across profile and
game-result requests for each authenticated app/player pair. Authenticated
requests rejected for missing permissions also count. Token refresh and
reconnection do not reset this resource allowance. Additional limits apply
per bearer token, grant credential, authenticated app/player token exchange,
and account making registration changes.

A rate-limited response includes `Retry-After: 60`. Respect the returned value;
use a queue with bounded backoff and jitter rather than immediately resending.
Limits are best effort per server process, and deployment-level protection may
impose additional limits. Do not rely on a guaranteed burst size.

| Operation      | Retry guidance                                                                        |
| -------------- | ------------------------------------------------------------------------------------- |
| Read profile   | Safe to retry transient failures with backoff                                         |
| Submit game    | Retry with the same external `gameId` and intended payload                            |
| Exchange code  | Single use; if the outcome is unknown and no tokens were saved, restart linking       |
| Refresh tokens | Single use; reload saved tokens first, and reconnect if the replacement pair was lost |

## Common mistakes

| Symptom                                                   | Check                                                                                                                                                                |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| “Callback URL is not registered for this app.”            | Compare the full callback string, including scheme, port, trailing slash, and query, with the registration.                                                          |
| Callback arrives, but your local session is missing       | Verify your app's cookie domain/path and SameSite policy for a top-level return navigation. Do not work around it by skipping state validation.                      |
| “App cannot request these permissions.”                   | Request only registered scopes, separated by spaces.                                                                                                                 |
| Token request is rejected despite valid credentials       | Send a JSON body with `Content-Type: application/json`; use the correct instance and exact registered callback. Do not use a form body or HTTP Basic authentication. |
| Code exchange worked, but tokens are undefined            | Read `access_token` and `refresh_token` directly from the response, not `response.data`.                                                                             |
| Profile/game response is not where you expect             | These successful responses do use a `data` wrapper.                                                                                                                  |
| Browser reports CORS errors                               | Make token and resource calls from your backend. Use browser navigation for the approval page.                                                                       |
| Consent page will not load inside your app                | Open it in a normal browser tab/window, not an iframe.                                                                                                               |
| Refresh succeeds, then the connection stops working       | Look for concurrent refreshes or an automatic retry using the consumed refresh token.                                                                                |
| Players disconnect after a harmless-looking settings edit | Name and description changes also revoke connections. Only unchanged saves preserve them.                                                                            |
| Reconnecting one device disconnects another               | SWUBASE has one connection per app/player. Share it through your backend across devices.                                                                             |
| A result appears more than once                           | Reuse the same external game ID for retries; do not generate an ID per delivery attempt.                                                                             |
| Some fields disappeared after a correction                | Resend the full intended payload; omitted optional fields are cleared.                                                                                               |
| An update returns 200 but does not change a result        | The player may have manually edited it; their changes take precedence.                                                                                               |
| A deck returns 404                                        | It must be an existing SWUBASE deck UUID owned by the connected player.                                                                                              |
| Cards show as unknown                                     | Map to SWUBASE card IDs; sending an unknown value does not resolve it automatically.                                                                                 |
| Results are missing from the view you are checking        | Check the connected account, original played-at date, format/filter selection, exclusions, and whether the player edited the result.                                 |

If you need help, provide the endpoint, HTTP status, approximate request time,
your app's name/client ID, and a redacted example payload. Never share client
secrets, access/refresh tokens, authorization codes, session cookies, or full
callback URLs containing those values.
