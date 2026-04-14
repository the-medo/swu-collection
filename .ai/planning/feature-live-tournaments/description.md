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
   - name (this would be probably just the same as tournament_group of given week, for example `PQ Week 1` or `Weekend 4-5th April`)
   - date (saturday date) (indexed)
   - is_live (only one - the current one - can be set to true)
   - tournaments_upcoming (int)
   - tournaments_running (int)
   - tournaments_finished (int)
   - tournaments_unknown (int)
- Table `tournament_weekend_tournament_group` - optional tournament groups for a weekend, one weekend can have multiple groups, based on format/meta - data from these groups will be then used to display the pie chart of meta
  - tournament_weekend_id
  - tournament_group_id
  - format_id
  - meta_id
- Table `tournament_weekend_tournament` - other important info about tournaments will be taken from `tournament` table, so it should be basically always joined to it 
  - tournament_weekend_id
  - tournament_id
  - status (upcoming / running / finished / unknown)
  - has_decklists
  // all columns below are nullable, sometimes we don't have melee id for example, so we cant get this data
  - additional_data (string)
  - round_number (int - just numeric round number)
  - round_name (string - current live round, can be `Round 1` or `Quarterfinals`, etc.)
  - matches_total (int - match count in this round)
  - matches_remaining (int - remaining matches in this round)
  - exact_start (datetime - when tournament officially starts - parsed from melee tournament detail)
  - last_updated_at (datetime - when was the last time data from this tournament was checked)
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
- Table `tournament_weekend_match`
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
  - updated_at (datetime, nullable - our time of updated results, empty until the match is finished)
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

### Feature flow
This feature will be displayed on the homepage:
- by default when `application_configuration` mode is set to `weekend`
- when logged user has this mode in his user settings (will be new user setting)

Weekly preparation - admin dashboard
- data for these "tournament weekends" should be prepared by an admin in a new tab in admin dashboard called "Tournament Weekends"
  - it will display list of tournament weekends, newest first, in a table
    - it will be able to "toggle" the `is_live` value of these weeks (always just 0 or 1 weeks can be live!)
    - it will be possible to expand a row and manage tournament groups of this weekend - just simple add (from select) or remove is sufficient
  - it will be able to create new week - "saturday date" and name is needed 
    - it will automatically fill the `tournament_weekend_tournament` with all tournaments for given weekend, but with blank data - not only PQ tournaments, all types of them

At this point, we should have the weekend tournaments prepared, but data are missing.

On the backend - we will get to HOW to get the data mentioned below a bit later, i just want to mention WHAT we want to get:
- there should be a function "liveTournamentCheck(meleeId)" (will be called from new admin endpoint and some script file, through cron) that will check a basic data for tournaments with melee id
  - first, it should check `exact start`, `status` and `has_decklists` of the tournament and fill this information
  - if it is running already, another function "tournamentProgressCheck" should be called
  - if it is finished and has decklists, it should be added to `tournament_import` table for further processing
- function "liveTournamentProgressCheck(meleeId)" will:
  - check for tournament_weekend_tournament - status, round data, match data
  - if round changed, it will insert new standings into `tournament_standing`
  - it will update game wins / insert new matches into `tournament_weekend_match`
  
Some scheduled jobs will be on the background:
- every hour, tournaments are going to be checked, if none of them are missing from the weekend (for example, its created, but not assigned to tournament_weekend_tournament table) - if some mismatch is found, send a warning to sentry
- every 3 minutes, a script will run, that will:
  - iterate over weekend's tournaments and run liveTournamentCheck(meleeId) on the ones that are not finished yet
- every minute, it will check `tournament_import` table and start import if needed

Websockets or tanstack query cache invalidation?
- im not entirely sure on this, but my current plan is to connect logged-in users to websocket of given tournament_weekend_id, where i would push all the updates that are made, for example:
  - remaining matches
  - running tournaments
  - standings for new round

### Discord bot
This is probably a separate thing, but I'd like to create a Discord bot, which would notify users with some special role in my discord server. Not needed to do it right now, but keep that in mind when planning this task. 