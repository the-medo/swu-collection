i want some improvements to my `Matchups` page. it has two parts:

## 1. adding new filter on the top to the existing filters - contain only "top 8" matches - this filters the matches incoming into the table

This should be easy, there are already existing filters for matches, just add something in there

## 2. adding filters to the actual matchup table (for now, there is just a simple input) - this filters the rows and columns of the table (currently actually only rows)

This will probably be a bit more complicated.
For now, we have just a simple input for filtering rows by text. 
I'd want to add these things:
- keep the input where it is, for fast filtering
- add "filter" icon, that opens popover
- in the popover, there should be:
  - checkbox to "lock" the same configurations for rows and columns (unlocked by default)
  - if it is "locked", only single column of filters will be available (and applied to both rows and columns); if it is unlocked, there will be two columns of filters (one for rows, one for columns)
  - for now, only these filters will be available in each of the columns:
    - input for text search (like now, mirroring the value in thats visible without the popover)
    - AspectFilters, where user will be able to select multiple aspects to filter by
  - if user is signed in, there will be a "save" button, that will save the current filters to some new table in the database
- if filter is selected, the cell that contains this popover and input will be highlighted with a "cancel filters" cross button 
- if user is signed in, small "arrow down" button will be displayed, that will open a popover with a list of saved filters for given "format" (loaded at the time of opening the popover) 

### Saving the configs
New table, something like this:
- user_id
- format
- is_mirrored (true/false)
- row_filters (json) (nullable)
- column_filters (json) (nullable)

### This all requires:
- migrations
- endpoints for save/load
- frontend api hooks
- implement frontend part of the filtering (everything is actually filtered only on FE) 

### Related
Most of the stuff should be found here:
- frontend/src/components/app/tournaments/TournamentMatchups
- frontend/src/components/app/tournaments/TournamentTabs/MatchupsTab.tsx
- frontend/src/components/app/tournaments/TournamentMeta/useTournamentMetaStore.ts