** Card statistics in meta and tournaments **

I want to create statistics page for cards. I was thinking about these stat tables: 

card_stat_meta
- meta_id PK
- card_id PK
- count_md
- count_sb
- deck_count
- match_win
- match_lose

card_stat_meta_leader
- meta_id PK
- leader_card_id PK
- card_id PK
- count_md
- count_sb
- deck_count
- match_win
- match_lose

card_stat_meta_leader_base
- meta_id PK
- leader_card_id PK
- base_card_id PK
- card_id PK
- count_md
- count_sb
- deck_count
- match_win
- match_lose

card_stat_tournament
- tournament_id PK
- card_id PK
- count_md
- count_sb
- deck_count
- match_win
- match_lose

card_stat_tournament_leader
- tournament_id PK
- leader_card_id PK
- card_id PK
- count_md
- count_sb
- deck_count
- match_win
- match_lose

card_stat_tournament_leader_base
- tournament_id PK
- leader_card_id PK
- base_card_id PK
- card_id PK
- count_md
- count_sb
- deck_count
- match_win
- match_lose

--------------
Do you think something is missing in my card statistics?

-----
First - create my drizzle schema - as you can see, i have tables for tournaments and meta, so use foreign key.

Second - Then, we need to somehow compute the statistics!
IMPORTANT - cards themselves are always in deck_card table. Then its just a way where and how to compute stats from them.
- to recompute tournament statistics, you always get tournament_id
- To recompute meta statistics, you always get meta_id... its basically collecting statistics from multiple tournaments (based on tournament meta id), so you can just sum up counts from tournament statistic tables of given meta

When computing tournament card statistics, you need to:
- get tournament_deck rows - here you get "real" deck_id and win/lose counts (for computing winrates)
- get decks (based on deck_id from tournament_deck) 
  - here you get leader_card_id_1 (take only the first leader cards, there are two columns!)
  - and base_card_id - you will use these in certain stats (they are PKs)
- get deck_cards - here you can finally get card_id and quantity - board 1 means maindeck and board 2 means sideboard, so 1 will go to "count_md", and 2 will go to "count_sb"... board 3 should be ignored

Additional requirements:
- take only decks with valid leaders and bases (sometimes they can be null, thats not a valid deck)
- get all this data to memory from drizzle and compute it in memory - thats going to be a lot cleaner than making complicated insert/select, especially when all three card stat tournament tables can be computed from the same data
- make it a function that i will just call from inside of endpoint
- always truncate the data we are computing (no update)

Third - create endpoints and frontend api hooks for calling recomputation
- i would prefer to have single parametrized endpoint, which would take data from needed table, for example with these arguments (query key):
  - one of: meta_id or tournament_id
  - leader_card_id
  - base_card_id (only when leader_card_id is present) (!careful about basic bases!)
- then, there would be something like CardStat interface which i would use, with this data (which is in every table):
  - card_id
  - count_md
  - count_sb
  - deck_count
  - match_win
  - match_lose
- i would use array of CardStat objects in my components and display the card statistics for given "filter"

There would be these four "subpages" of card stats:
- overall stats
- most played in aspect
- most played by leader
- most played by leader/base combination

-----------------

Another page that would be cool is "average deck" in leader/base combination
- the same view as normal "deck"

That reminds me of that: 
- i still dont have "group by" option in deck detail (currently only grouped by card type)
  - card type (current)
  - cost
  - aspect
- aspects in pie graph / bar chart
- costs in pie graph / bar chart
