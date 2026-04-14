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
- see a section with a simple pie chart showing the classic meta stuff from finished tournaments this weekend (this will be done through the already existing tournament_group_leader_base stats)

### Database changes
Im not exactly sure, what new tables will be needed, but in my mind it looks something like this:

- Table `tournament_weekend`
   - id (uuid)
   - name (this would be probably just the same as tournament_group of given week, for example `PQ Week 1`)
   - date (saturday date) (indexed)
   - is_live (only one - the current one - can be set to true)
   - tournaments_upcoming (int)
   - tournaments_running (int)
   - tournaments_finished (int)
   - tournaments_unknown (int)
- Table `tournament_weekend_tournament_group` - one weekend can have multiple groups, based on format/meta
  - tournament_weekend_id
  - tournament_group_id
  - format_id
  - meta_id
- Table `tournament_weekend_tournament` - other important info about tournaments will be taken from `tournament` table, so it should be basically always joined to it 
  - id
  - tournament_weekend_id
  - tournament_id
  - status (upcoming / running / finished / unknown)
  - round_number (int - just numeric round number)
  - round_name (string - current live round, can be `Round 1` or `Quarterfinals`, etc.)
  - matches_total (int - match count in this round)
  - matches_remaining (int - remaining matches in this round)
  - exact_start (datetime - when tournament officially starts - parsed from melee tournament detail)
- Table `players` - this will be player info from melee - im currently missing this table and it would be useful
  - id (int, not auto increment - from melee)
  - display_name (string)
  - user_id (nullable - users verify that they are this player - still unsure how, for now the field gonna be there, but not used)
- Table `tournament_standing` - from melee endpoint `/Standing/GetRoundStandings`
  - player_id 
  - tournament_id
  - round_number
  - rank (int)
  - points (int)
  - game_record (string: format 2-0-0)
  - match_record (string: format 2-0-0)
- Table `tournament_weekend_match` - will contain only info about matches in top cut, so quarters/semis/finals
  - tournament_id
  - round_number
  - player_id_1
  - player_id_2
  - leader_card_id_1 (nullable) 
  - base_card_key_1 (nullable)
  - leader_card_id_2 (nullable) 
  - base_card_key_2 (nullable) 
  - player_1_game_win (nullable)
  - player_2_game_win (nullable)
  - updated_at (datetime, nullable - our time of updated results)
- Table `tournament_weekend_resource` - list of streams/videos from the tournament - users will be able to send links, that admins need to approve before they are displayed
  - ...all columns from `entity_resource` table, except `entityType` and `entityId`. Also, takling about `entity_resource`, this table should have new indexes on `entityType`, `entityId` and `resourceType`
  - tournament_id
  - user_id (nullable - used id of the user that submitted it)
  - approved (default false)
- Table `player_watch` - user can "watch" or "follow" some players - these will be displayed on the homepage, if they are playing
  - user_id
  - player_id
- Table `tournament_import` - for tournament to get into this table, its final round needs to be finished and decklists published
  - tournament_id
  - created_at (when was this row added)
  - started_at (when import started)
  - finished_at (when import finished)

Thats probably all from DB changes - make good indexes, but make sure indexes don't have long name - that can cause problems while migrating.

### Discord bot
This is probably a separate thing, but I'd like to create a Discord bot, which would notify users with some special role in my discord server. Not needed to do it right now, but keep that in mind when planning this task. 