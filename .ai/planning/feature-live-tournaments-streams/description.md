Id like to make the full "streams" feature.

- stream youtube iframes will be displayed in StreamsSection - i've asked chatGPT before, and in file `stream-embeddings.md` you can see the response about best practices. DO ONLY YOUTUBE!
- users will be able to send stream links (for review by admin) in a dialog - create this dialog!
- in the dialog, "tournament selector" will be displayed, with list of all weekend's tournaments (with country flags too!) and an input for stream link and input for melee ID (both are optional, melee ID input is visible only if the tournament has no melee ID yet) => both meleeID and stream links will create separate resource! you can see example of resource usage in `StreamSubmissionPrompt` (obsolete component, but good example)
- users will be able to open this dialog from two places:
1. from the tournament card dropdown menu `TournamentCardActionsMenu` (this opens the dialog and PRESELECTS the tournament in it!)
2. from the StreamsSection, there should be a "plus" button instead of the `count={resources.length}` in section header
- after submitting,  a green checkmark needs to replace content of the dialog so the user will know that it was successful

Create a "TournamentWeekendResourceTable" component, that will display simple table with resource types. It should contain related tournament name+flag, link to melee (if melee id) or embedded youtube stream video and a name of the submitter. If the user seeing this table is an admin, it should also display an "approve" and "delete" buttons.
- This will require new "delete" endpoint + FE api hook for it
- when approving, if meleeId was approved, you need to also set the melee ID property into `tournament` table `meleeId` property

Admins should also see a blue ALERT, when some resource is waiting for approval. For this, new "GET" endpoint for tournamentWeekendResource is needed (+FE api hook)