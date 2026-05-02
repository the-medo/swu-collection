I'd like you to create a new feature under `server/screenshotter`.

It will be a small wrapper around playwright package, that will open the app, go to desired location, make some screenshots and uploads them to R2 bucket under `screenshots/...`

I'd like you to try these routes:
- tournament bracket - `http://localhost:5173/tournaments/${tournamentId}/details`, but only element that contains the bracket and top8 list of players
- meta analysis for whole tournament - `http://localhost:5173/tournaments/${tournamentId}/meta?maMetaInfo=leadersAndBase` - element that contains the options (chart/table, all decks/top8/champions,...) and the charts (its the previous page, but clicked on "Meta Analysis" and the chose "Leaders & Bases" as meta info
- same as before, but for top8 -  `http://localhost:5173/tournaments/${tournamentId}/meta?maMetaPart=top8&maMetaInfo=leadersAndBase` (switched from "All Decks" (default) to "Top 8")
- winning deck image - go to the Bracket again, click on first deck in the list => that opens decklist, which contains "Image" button that opens dialog => this dialog generates and loads a full image of the deck, and i'd like this image to be uploaded

First, make a plan into `.ai/planning/feature-screenshotter` and let me review how you would approach it.