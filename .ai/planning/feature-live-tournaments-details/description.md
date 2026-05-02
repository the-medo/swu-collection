## Part 1 - improve bracket dialog
Few improvements:
- dialog should be wider, and contain list of top 8 players in their current standing on the right (in the same style as in the bracket, so with background decoration etc.)
- on click (in the bracket or right panel), open decklist detail, if available 
- overall should be similar to DetailAndBracketTab component `frontend/src/components/app/tournaments/TournamentTabs/DetailAndBracketTab.tsx`


## Part 2 - create tournament detail dialog
- for imported tournaments, new "button" next to "top 8 bracket" should appear called "Detail" (with pie graph icon)
- dialog should cover almost all page, just small area around should be empty (users should see that its dialog)
- make it global - not limited to live page; add URL param called `dialogTournamentId` and if its filled, open the tournament in a dialog - should be in some global component, check for similar in other stuff
- display TournamentDetailContent component in that dialog 