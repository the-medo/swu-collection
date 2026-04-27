## Part 1 - analysis

Analyze my `tournamentWeekendsLiveGetRoute` endpoint and "live" homepage to see, what data is actually being used and needed. Currently, for 32 tournament weekend, it actually returns 2MB of data and that is really too much. For example:
1. full matches and standings are not really needed - only matches from last 3 rounds are needed for "top 8 bracket", but even that is displayed from dialog, where it could be fetched from separate component
2. every standings has `tournamentPlayer` and `player` properties, while `player` is not really needed - no interesting info is shown
3. this is the match object:
```
{
                        "match": {
                            "id": "353a14c3-b301-481f-bc80-c2f4e36ff615",
                            "tournamentId": "dee47704-bfae-42f7-be4f-f59337f84386",
                            "roundNumber": 3,
                            "matchKey": "2675be98-ebb5-47e6-ad04-b42a00a1a098",
                            "playerDisplayName1": "CS_Batbatch",
                            "playerDisplayName2": "CS_LeDoc16",
                            "player1GameWin": 1,
                            "player2GameWin": 2,
                            "createdAt": "2026-04-22 20:29:20.75349",
                            "updatedAt": "2026-04-12 10:22:25"
                        },
                        "player1": {
                            "displayName": "CS_Batbatch",
                            "userId": null,
                            "createdAt": "2026-04-22 20:28:45.960739",
                            "updatedAt": "2026-04-22 20:29:20.680057"
                        },
                        "player2": {
                            "displayName": "CS_LeDoc16",
                            "userId": null,
                            "createdAt": "2026-04-22 20:29:20.680057",
                            "updatedAt": "2026-04-22 20:29:20.680057"
                        },
                        "tournamentPlayer1": {
                            "tournamentId": "dee47704-bfae-42f7-be4f-f59337f84386",
                            "playerDisplayName": "CS_Batbatch",
                            "leaderCardId": "luke-skywalker--hero-of-yavin",
                            "baseCardKey": "data-vault",
                            "matchScore": "3-3-0",
                            "gameScore": "7-8",
                            "createdAt": "2026-04-22 20:29:20.686085",
                            "updatedAt": "2026-04-22 20:29:20.81414"
                        },
                        "tournamentPlayer2": {
                            "tournamentId": "dee47704-bfae-42f7-be4f-f59337f84386",
                            "playerDisplayName": "CS_LeDoc16",
                            "leaderCardId": "obi-wan-kenobi--courage-makes-heroes",
                            "baseCardKey": "vergence-temple",
                            "matchScore": "3-3-0",
                            "gameScore": "7-9",
                            "createdAt": "2026-04-22 20:29:20.686085",
                            "updatedAt": "2026-04-22 20:29:20.81414"
                        }
                    },
```
If tournament has 7 rounds of swiss, every player & tournament player is there at least 7 times... would be much better to take them out to separate object that can be reused (but i think matches are not needed there anyways).
4. same applies to "watched" players, a lot of duplicated info and also just the last match is important


These were just examples i found, you will probably find more. Keep in mind that some of the data will be sent through websockets too - dont overcomplicate it, if it would make websockets a lot harder, don't go for it. 

## Part 2 - data type improvements

- Based on findings in part 1, update endpoints / scripts / FE components to work with your recommendations
- i'd also probably like to cache responses from the `live` endpoint for like 15-20-30 seconds or so, because a lot of DB requests are being made - will be much faster when cached.. now when i think about it, it would actually be the best to keep it cached until some "live tournament check" happens and updates something

## Part 3 - websockets

- prepare websocket endpoint(s)
- connect logged in users to the websockets on homepage
- update cached data based on some query key
- you can see some older plan about these websockets here: [plan.md](../feature-live-tournaments/plan.md) - they are probably no longer accurate, so update this file with your new websocket plan (they were not implemented yet anyways)