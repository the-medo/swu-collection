# New feature - "Live" homepage mode

Currently, homepage has no modes and displays just a dashboard - a meta snapshot for last two weeks.
This feature will change that - now, there will be multiple "subpages" called "modes" for the homepage. Default mode will be saved to ApplicationConfiguration table [application-configuration.ts](../../../server/routes/application-configuration.ts)

## Why new mode
Every new set provides new cards to play with - that happens once per 4 months. New cards mean new decks and meta change. Results from the tournaments are highly anticipated by the players.
First month is usually free, but then PQ (Planetary Qualifier) season starts - each is attended by tens of players, top8 get nice prizes and winner qualifies for the galactic championship!
There is more than 200 PQs every set - some weekends can have over 30 of them! And I would like to have a space, where i can see all changes and ongoing tournaments live.

What would that mean for me:
- i'd know all PQs happening this weekend
- have access to all PQs happening TODAY (and next/previous day)
- see currently running PQs with bonus information, like: 
  - number of players
  - country
  - current round
  - if not top 8 yet - undefeated players so far (only in higher rounds 4+)
  - if top 8 started - simple bracket with quarterfinals / semis / finals info 
  - link back to melee.gg (website where all tournaments are run, with all standing/match/player information)
  - link to a stream (only youtube and twitch links allowed)
- see recently finished PQs with bonus information, like:
  - number of players
  - country
  - simple bracket with quarterfinals / semis / finals info
  - link back to melee.gg (website where all tournaments are run, with all standing/match/player information)
  - link to a stream (only youtube and twitch links allowed)
  - winning leader + base combination needs to be clearly visible, if available
- see PQs that didn't start yet (or have no info, like no melee ID to know the status)
  - country
  - link back to melee.gg (website where all tournaments are run, with all standing/match/player information)
  - link to a stream (only youtube and twitch links allowed) + possibility for players to submit  
  - if no melee ID is available, ask players for it (they can submit it)
- see a section with running / prepared live streams
- see a section with "Watched players"
  - players should be able to save players (melee name or id?) to their watchlist - they will be displayed in this section afterwards
- see a section with a simple pie chart showing the classic meta stuff from finished tournaments this weekend