Currently, all cards in `card-list.json` are added through scripts, that download data from the official database. This official database is sometimes veeeeery slow to add them, and that is especially bad when people want to make a decks with new cards and also test them on Karabast (online platform to play).

So, I'd like some elegant solution, to temporarily add cards also from the spoilers, that are not in official database. This requires:
- card name (full name, with title)
- image (possible to upload to our R2 bucket)
- maybe possible to add all properties, like on normal card in card-list (? not sure about this one, looks like too much work, but would be helpful for card filtering when building a deck etc.)

I'm not sure how to do it yet, but maybe some additional .json file, that will contain spoilers only and would get merged with the existing card list? Or DB table with spoiled cards as rows, that would also be available, and users would fetch only new ones once it gets saved to their Indexed DB?

Go through the repo, and together with claude code (long timeout, it can take a lot of time) brainstorm about possible solutions. Im usually very client-first, so i save stuff to theeir indexed db so i don't need to call API when not needed.

Create a `plan.md` file in this folder, where you will go through your findings, and create an implementation plan how to approach and implement this feature.