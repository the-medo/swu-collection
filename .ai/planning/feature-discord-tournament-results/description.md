I'd like new feature - when tournament is marked as imported, notify users with role `Tournament Results` 
in a `#tournament-results` channel with a message that `Tournament Name results are in!` and it would add 
screenshots from the `screenshotter` feature into the message. 

I think screenshots opened a lot of possibilities for this feature, so this would be the first usecase for that.

I've been talking with chatgpt about this already, here is the repsonse, maybe it helps.

--------------------------

For your first use case, you **do not need a constantly running Discord client/bot process**. Since your Bun backend only needs to post messages into a known channel, the cleanest setup is:

**Bun/Hono backend → Discord REST API → channel message**

That still uses a real Discord bot token, but you do not need `discord.js` or WebSocket gateway logic yet.

Discord messages can include `content`, `embeds`, and `allowed_mentions`; `allowed_mentions` is important so you can intentionally ping only the `Tournament Imports` role. Discord also requires the role to be mentionable, or the bot must have the `MENTION_EVERYONE` permission for role pings to notify users. ([docs.discord.com][1])

---

## 1. Create the Discord bot

Go to the **Discord Developer Portal**:

1. Create a new application, for example `SWU Base Bot`.
2. Go to **Bot**.
3. Click **Add Bot**.
4. Copy the **Bot Token**.
5. Go to **OAuth2 → URL Generator**.
6. Select scopes:

   * `bot`
7. Select bot permissions:

   * `Send Messages`
   * `Embed Links`
   * `Mention Everyone` — only needed if the role is not globally mentionable
8. Open the generated invite URL and invite the bot to your server.

For image previews from your Cloudflare R2 URLs, the bot should have `Embed Links`, because Discord will render images inside embeds. Discord supports embed objects in messages, and messages can include up to 10 embeds. ([docs.discord.com][2])

---

## 2. Get these Discord IDs

Enable **Developer Mode** in Discord:

**User Settings → Advanced → Developer Mode**

Then right-click and copy:

```txt
DISCORD_CHANNEL_ID=...
DISCORD_TOURNAMENT_IMPORTS_ROLE_ID=...
```

For the role ping, you will use this format:

```txt
<@&ROLE_ID>
```

Example:

```txt
<@&123456789012345678>
```

---

## 3. Add env vars in Coolify

In your Coolify app environment variables:

```env
DISCORD_BOT_TOKEN=your_bot_token
DISCORD_IMPORTS_CHANNEL_ID=123456789012345678
DISCORD_TOURNAMENT_IMPORTS_ROLE_ID=123456789012345678
PUBLIC_APP_URL=https://swubase.com
```

Never put the bot token in the frontend. Keep it backend-only.

---

## 4. Create a small Discord service in your backend

Example:

```ts
// server/lib/discord.ts

type TournamentImportDiscordMessage = {
  tournamentName: string;
  tournamentUrl: string;
  players?: number;
  screenshotUrls?: string[];
};

const DISCORD_API_BASE = 'https://discord.com/api/v10';

export async function sendTournamentImportedMessage({
  tournamentName,
  tournamentUrl,
  players,
  screenshotUrls = [],
}: TournamentImportDiscordMessage) {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const channelId = process.env.DISCORD_IMPORTS_CHANNEL_ID;
  const roleId = process.env.DISCORD_TOURNAMENT_IMPORTS_ROLE_ID;

  if (!botToken) throw new Error('Missing DISCORD_BOT_TOKEN');
  if (!channelId) throw new Error('Missing DISCORD_IMPORTS_CHANNEL_ID');
  if (!roleId) throw new Error('Missing DISCORD_TOURNAMENT_IMPORTS_ROLE_ID');

  const roleMention = `<@&${roleId}>`;

  const embeds = screenshotUrls.slice(0, 4).map((url, index) => ({
    title: index === 0 ? tournamentName : undefined,
    url: tournamentUrl,
    description:
      index === 0
        ? [
            'Tournament has been imported into SWU Base.',
            players ? `Players: **${players}**` : undefined,
            `[Open tournament](${tournamentUrl})`,
          ]
            .filter(Boolean)
            .join('\n')
        : undefined,
    image: {
      url,
    },
  }));

  if (embeds.length === 0) {
    embeds.push({
      title: tournamentName,
      url: tournamentUrl,
      description: [
        'Tournament has been imported into SWU Base.',
        players ? `Players: **${players}**` : undefined,
        `[Open tournament](${tournamentUrl})`,
      ]
        .filter(Boolean)
        .join('\n'),
    });
  }

  const response = await fetch(`${DISCORD_API_BASE}/channels/${channelId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${botToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      content: `${roleMention} New tournament imported!`,
      embeds,

      // Important: only allow this specific role to be pinged.
      allowed_mentions: {
        roles: [roleId],
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Discord message failed: ${response.status} ${body}`);
  }

  return response.json();
}
```

The key part is this:

```ts
allowed_mentions: {
  roles: [roleId],
}
```

That prevents accidental `@everyone`, user pings, or other role pings. Discord validates allowed mentions against the actual visible mention in the message content. ([docs.discord.com][1])

---

## 5. Call it after tournament import succeeds

For example:

```ts
await sendTournamentImportedMessage({
  tournamentName: tournament.name,
  tournamentUrl: `https://swubase.com/tournaments/${tournament.id}`,
  players: tournament.playerCount,
  screenshotUrls: [
    `https://images.swubase.com/tournaments/${tournament.id}/meta.png`,
    `https://images.swubase.com/tournaments/${tournament.id}/leaders.png`,
  ],
});
```

Do this only **after**:

1. tournament import is committed to DB,
2. screenshots are generated,
3. screenshots are uploaded to R2,
4. public R2 URLs are available.

That way the Discord message never links to missing images.

---

## 6. Recommended message style

Something like this usually works well:

```txt
@Tournament Imports New tournament imported!

Planetary Qualifier — Prague
Players: 128
Winner: Han2 Blue
Top cut: available

Open tournament:
https://swubase.com/tournaments/...
```

With screenshots as embed images.

For multiple screenshots, you have two good options:

### Option A — multiple embeds

Best for your use case.

```ts
embeds: [
  {
    title: 'PQ Prague imported',
    url: tournamentUrl,
    image: { url: metaScreenshotUrl },
  },
  {
    image: { url: top8ScreenshotUrl },
  },
]
```

### Option B — one embed with one main image

Cleaner if you only want one thumbnail/preview.

```ts
embeds: [
  {
    title: 'PQ Prague imported',
    url: tournamentUrl,
    description: '128 players\nWinner: Han2 Blue',
    image: { url: screenshotUrl },
  },
]
```

---

## 7. Bot vs webhook

For this first use case, a **Discord webhook** would actually be even simpler: no bot token, no app invite complexity, just POST to a webhook URL. Discord webhooks also support `content`, `embeds`, `allowed_mentions`, files, and components. ([docs.discord.com][2])

But since you already know you want this to become a wider bot later, I would use a **real bot token + REST API** now. That gives you a better path toward slash commands, moderation, role-based subscriptions, and interactive buttons later.

---

## Future ideas for SWU Base bot

A few useful ones:

**Tournament alerts**
Users can subscribe to imported tournaments, PQs, store showdowns, specific countries, or minimum player counts.

**Deck watch**
A user could subscribe to “notify me when Boba Yellow tops a tournament” or “notify me when a deck with this leader appears.”

**Meta summaries**
Post weekly automated meta snapshots:

```txt
This week’s SWU Base meta:
Sabine ECL: 14.2%
Han2 Blue: 11.8%
Boba Yellow: 9.7%
```

**Slash commands**

```txt
/swu tournament latest
/swu deck leader Sabine
/swu meta last_14_days
/swu card price "Darth Vader"
```

**Import status**
When you import a big event:

```txt
Import started
Rounds imported: 7/9
Top cut imported
Decklists imported: 64/128
Import complete
```

**Discord buttons**
Messages can have buttons like:

```txt
[Open Tournament] [View Top 8] [View Meta Breakdown]
```

You can add this later with Discord message components/interactions. Discord’s interaction system is what powers slash commands and button responses. ([docs.discord.com][3])

---

For your current architecture, I would start with the REST-only bot service above. It fits nicely into your Bun backend, does not require an extra process, and works well with Coolify env vars.

[1]: https://docs.discord.com/developers/resources/message?utm_source=chatgpt.com "Message Resource - Documentation"
[2]: https://docs.discord.com/developers/resources/webhook?utm_source=chatgpt.com "Webhook Resource - Documentation"
[3]: https://docs.discord.com/developers/interactions/receiving-and-responding?utm_source=chatgpt.com "Receiving and Responding to Interactions - Documentation"
 
