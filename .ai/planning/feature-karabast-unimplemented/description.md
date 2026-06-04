## Description

When a lot of cards get spoiled at once, they don't need to be implemented right away in Karabast. 
I'd like to show users in my deckbuilder / deck viewer, which cards are currently unimplemented, so they know that it won't work and save them some trouble.

They have this information under `https://api.karabast.net/api/get-unimplemented` endpoint, and here you can find example response: [response-example.json](response-example.json)

## My idea

1. new row to table "application_configuration" with key `karabast_unimplemented_datetime` with UTC string datetime value
2. new table to db called `karabast_unimplemented_cards` with these columns:
- title (`titleAndSubtitle` from the response) - Primary key
- card_id (this will be in swubase card id format!) NULLABLE, in case we can't find it
- data (JSON of the whole object in response)
3. in our `GET /cards` endpoint, add new property "karabast_unimplemented"
- it will be of type: Record<string (our card id), true>
- this list will be kept in memory on the backend, refreshed from the DB only if not available or after 15 minutes
- on the frontend, it will NOT be saved to indexed DB and the structure of indexed DB will NOT change in any way
- this endpoint is called in the `useCardList` hook, and i've added TODO item `//TODO: here add `karabast_unimplemented` property to the cards that are not implemented` - at this spot, you should add new optional property to these cards, when they are not implemented 
4. create a new CRON script, that will be called periodically every 60 minutes (ill set it up in coolify)
- it will fetch data from the endpoint and transform it to our format
- transformation will prioritize mapping by:
  - (1) setId.set and setId.number from response mapping onto `set` and `cardNo` properties of card variants (keep in mind we just need card_id anyways, not variant id) 
  - (2) ID from response mapping onto the `cardUid` property from card list
  - (3) transforming `titleAndSubtitle` property to our cardId format
  - (4) not possible to pair, NULL card Id
- if we successfully got the API response, it will empty the `karabast_unimplemented_cards` table and fill it with new data
- after that, it will update the `karabast_unimplemented_datetime` configuration row with the current UTC datetime
- it will also refresh our in-memory cache, that is used to return data in our GET `/cards` endpoint
5. display this information in our deckbuilder / deck viewer (cards will have the `karabast_unimplemented` property)
- in the text layout - small red exclamation mark warning needs to be visible next to the card name on the left
- in the image layout - small red exclamation mark warning needs to be visible next to the card amount
- it needs to be displayed also in the Leader selector and Base selector components, in the bottom left corner of the image (overlay in that part of the image)
- at the top above the deck contents / card list, there will be a bigger alert warning message, that will sum up the number of unimplemented cards (only in the main deck and sideboard)! 