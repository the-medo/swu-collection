# Build a SWUBASE integration

Use this guide to let players connect their SWUBASE accounts to your app and
send their game results to SWUBASE.

You register your app once. Each player then approves their own connection:

1. **You create an app in SWUBASE** and receive a client ID and client secret.
2. **A player clicks “Connect SWUBASE” in your app.** Your app opens SWUBASE,
   where the player signs in and approves the requested permissions. SWUBASE
   returns the player to your app, and your backend completes the connection.
3. **Your backend sends results for that player.** SWUBASE adds them to the
   player's statistics and identifies your app as the source.

## Read the guide

| Guide                                                                            | What you will implement                                                        |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| [Register an app](#register-an-app)                                              | Create credentials and configure your callback URL                             |
| [Connect an account](third-party-integrations/account-linking.md)                | Connect button, approval, callback, token exchange, and account identification |
| [Send game results](third-party-integrations/game-results.md)                    | Request fields, examples, card identifiers, retries, and corrections           |
| [Manage tokens and connections](third-party-integrations/token-lifecycle.md)     | Storage, refresh, reconnection, and revocation                                 |
| [Test and troubleshoot](third-party-integrations/testing-and-troubleshooting.md) | Acceptance checklist, errors, rate limits, and common mistakes                 |

## What your app needs

- A SWUBASE account to own the app registration.
- A backend that can keep your client secret and each player's tokens private.
- A way to identify signed-in players in your own app.
- A callback endpoint on your backend, such as
  `https://your-app.example/integrations/swubase/callback`.
- Storage for connections and a way to make HTTPS requests with JSON bodies.

Your backend handles token exchange, refresh, and game submission. A desktop
or mobile app can use your backend for these requests. Keep the client secret
out of browser JavaScript, distributed executables, mobile bundles, and source
control.

The client ID identifies **your app**. An access token authorizes requests for
**one connected player**. The app's credentials alone cannot submit results
for arbitrary players.

Use a SWUBASE instance where **Developer apps** is available. Examples use
`https://swubase.com` as the SWUBASE origin; replace it with your test instance's
origin when testing. Register the app on that same instance. Credentials and
connections are specific to the instance where they were created.

## Register an app

1. Sign in to SWUBASE and open **Settings → Developer apps**
   (`/settings?page=apps`).
2. Click **Register app**.
3. Fill in the fields below and click **Create app**.
4. Save the client ID and client secret in your backend's configuration.
   **The secret is shown only once.**

| Field                            | What to enter                                                           |
| -------------------------------- | ----------------------------------------------------------------------- |
| App name                         | A name players will recognize on the approval screen; 1–80 characters   |
| Description                      | Explain what the app does and why it needs access; up to 500 characters |
| Callback URLs                    | One exact URL per line; 1–10 unique URLs, up to 2,048 characters each   |
| Permissions your app can request | Select the permissions your integration will use                        |

Each account can own up to ten apps. App registration uses the server/client
secret model. If you lose the secret, use **Rotate secret** to generate a new
one; rotation also disconnects existing players.

### Choose permissions

| Permission           | What your app may do                                         |
| -------------------- | ------------------------------------------------------------ |
| `profile:read`       | Read the connected player's SWUBASE ID and display name      |
| `game-results:write` | Add and update results submitted by your app for that player |

For a game integration that identifies the connected account and sends results,
select both. During linking you can request a subset of the permissions you
registered. Players approve or deny the requested set together.

There is no permission here to read a player's game history, list their private
decks, or access arbitrary SWUBASE APIs. Additional capabilities require new
SWUBASE API support.

### Choose callback URLs

The callback is an endpoint **in your app**. SWUBASE sends the player there
after approval or denial. It is different from the SWUBASE approval page.

Production callbacks must use HTTPS. HTTP is allowed for local development on
`localhost`, `127.0.0.1`, and `[::1]`, for example:

```text
https://your-app.example/integrations/swubase/callback
http://localhost:3000/integrations/swubase/callback
```

Matching is exact, including the port, path, trailing slash, and query string.
Wildcards, URL credentials, and fragments are not supported. Use a fixed callback
and keep any “where to return next” value in your own server session. Avoid
`code`, `error`, and `state` in the registered query string: those names are
reserved for the callback response.

Use separate registrations for development and production where practical.
Changing a registration, including its name or description, disconnects all of
that app's players. [Connection lifecycle details](third-party-integrations/token-lifecycle.md#changes-to-your-app-registration).

## Connect an account

Add **Connect SWUBASE** to your app. Your backend creates a linking request and
redirects the player's browser to `/settings/link/app` on SWUBASE. After approval,
your callback exchanges the temporary code for access and refresh tokens.

Follow [Connect a player's account](third-party-integrations/account-linking.md)
for the exact parameters, callback handling, and backend JavaScript examples.

## Use the API

All paths below are on your configured SWUBASE origin.

| Method and path                            | Purpose                           | Authentication                                                      |
| ------------------------------------------ | --------------------------------- | ------------------------------------------------------------------- |
| Browser navigation to `/settings/link/app` | Show the player's approval screen | Player signs in to SWUBASE                                          |
| `POST /api/integration-apps/token`         | Exchange a code or refresh tokens | Client ID and secret in a JSON body, plus the code or refresh token |
| `GET /api/integration-apps/me`             | Identify the connected player     | Bearer access token; `profile:read`                                 |
| `POST /api/integration-apps/game-results`  | Submit one player's game result   | Bearer access token; `game-results:write`                           |

Token responses contain fields directly at the top level. Profile and game-result
responses wrap their result in `data`. Check the HTTP status before using either.

Send JSON for POST requests. Form-encoded token requests, HTTP Basic client
authentication, client-credentials grants, implicit grants, OAuth discovery, and
OpenID Connect ID tokens are not supported. Calls from your backend do not need a
SWUBASE session cookie or the headers used by SWUBASE's own settings UI. Direct
cross-origin browser API calls are not supported.

This API has its own contract. Existing Karabast integration credentials and
payloads cannot be substituted for these requests.

## Refresh

Access tokens last one hour. Refresh tokens last 30 days and are replaced each
time you refresh. Your backend can keep the connection active without asking the
player to approve every game. Read [Manage tokens and connections](third-party-integrations/token-lifecycle.md)
before implementing background submissions: concurrent refresh attempts can
invalidate a connection.

## Operations and development

Maintaining SWUBASE itself? See the separate
[operations notes](third-party-integrations/operations.md) for migrations,
sanitization, implementation references, and repository test commands.
