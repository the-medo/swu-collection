import { parseHTML } from 'linkedom';
import type { TournamentDeck } from '../../db/schema/tournament_deck.ts';
import { delay } from '../../../lib/swu-resources/lib/delay.ts';
import type { TournamentMatchInsert } from '../../db/schema/tournament_match.ts';
import type { Tournament } from '../../db/schema/tournament.ts';

export type TIBasicDecklistInfo = {
  id?: string;
  name?: string;
};

export type TIPlayerDataWithDecklists = {
  decklists: TIBasicDecklistInfo[];
};

export type TIUserDecklistMap = Record<number, TIBasicDecklistInfo | undefined>;

const basicHeaders = {
  cookie: process.env.TOURNAMENT_COOKIE ?? '',
  'sec-ch-ua': '"Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'sec-fetch-dest': 'document',
  'sec-fetch-mode': 'navigate',
  'sec-fetch-site': 'cross-site',
  'sec-fetch-user': '?1',
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
  'x-requested-with': 'XMLHttpRequest',
  origin: process.env.TOURNAMENT_ORIGIN ?? '',
  accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'accept-encoding': 'gzip, deflate, br, zstd',
  'accept-language': 'en,sk;q=0.9,cs;q=0.8,pt;q=0.7',
};

const formPostHeaders = {
  ...basicHeaders,
  'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
};

export interface TournamentViewResult {
  finalRoundId: number | null;
  allRoundIds: number[];
}

export async function fetchTournamentView(
  tournamentId: string | number,
): Promise<TournamentViewResult | undefined> {
  try {
    await delay(500);
    const url = `https://melee.gg/Tournament/View/${tournamentId}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...basicHeaders,
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch tournament view: ${response.status} ${response.statusText} ${response}`,
      );
    }

    const html = await response.text();
    const { document } = parseHTML(html);

    // Get all round buttons
    const allButtons = document.querySelectorAll(
      '#standings-round-selector-container button.round-selector',
    );

    // Get the last button for final round ID
    const finalButton = document.querySelector(
      '#standings-round-selector-container button.round-selector:last-of-type',
    );

    const finalRoundId = finalButton?.getAttribute('data-id') ?? null;

    // Extract all round IDs
    const allRoundIds: number[] = [];
    allButtons.forEach(button => {
      const roundId = button.getAttribute('data-id');
      if (roundId) {
        allRoundIds.push(parseInt(roundId));
      }
    });

    if (finalRoundId) {
      console.log('Final Round ID:', finalRoundId);
      console.log('All Round IDs:', allRoundIds);
      return {
        finalRoundId: parseInt(finalRoundId),
        allRoundIds,
      };
    }

    console.log('Final Round Button not found!');
    return undefined;
  } catch (error) {
    console.error('Error fetching tournament view:', error);
    throw error;
  }
}

export async function fetchRoundStandings(roundId: number) {
  let recordsTotal = -1;
  const data = [];
  const url = 'https://melee.gg/Standing/GetRoundStandings';

  try {
    let start = 0;

    while (recordsTotal === -1 || data.length < recordsTotal) {
      await delay(500);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...formPostHeaders,
        },
        body: `draw=4&columns%5B0%5D%5Bdata%5D=Rank&columns%5B0%5D%5Bname%5D=Rank&columns%5B0%5D%5Bsearchable%5D=true&columns%5B0%5D%5Borderable%5D=true&columns%5B0%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B0%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B1%5D%5Bdata%5D=Player&columns%5B1%5D%5Bname%5D=Player&columns%5B1%5D%5Bsearchable%5D=false&columns%5B1%5D%5Borderable%5D=false&columns%5B1%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B1%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B2%5D%5Bdata%5D=Decklists&columns%5B2%5D%5Bname%5D=Decklists&columns%5B2%5D%5Bsearchable%5D=false&columns%5B2%5D%5Borderable%5D=false&columns%5B2%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B2%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B3%5D%5Bdata%5D=MatchRecord&columns%5B3%5D%5Bname%5D=MatchRecord&columns%5B3%5D%5Bsearchable%5D=false&columns%5B3%5D%5Borderable%5D=false&columns%5B3%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B3%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B4%5D%5Bdata%5D=GameRecord&columns%5B4%5D%5Bname%5D=GameRecord&columns%5B4%5D%5Bsearchable%5D=false&columns%5B4%5D%5Borderable%5D=false&columns%5B4%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B4%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B5%5D%5Bdata%5D=Points&columns%5B5%5D%5Bname%5D=Points&columns%5B5%5D%5Bsearchable%5D=true&columns%5B5%5D%5Borderable%5D=true&columns%5B5%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B5%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B6%5D%5Bdata%5D=OpponentMatchWinPercentage&columns%5B6%5D%5Bname%5D=OpponentMatchWinPercentage&columns%5B6%5D%5Bsearchable%5D=false&columns%5B6%5D%5Borderable%5D=true&columns%5B6%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B6%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B7%5D%5Bdata%5D=TeamGameWinPercentage&columns%5B7%5D%5Bname%5D=TeamGameWinPercentage&columns%5B7%5D%5Bsearchable%5D=false&columns%5B7%5D%5Borderable%5D=true&columns%5B7%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B7%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B8%5D%5Bdata%5D=OpponentGameWinPercentage&columns%5B8%5D%5Bname%5D=OpponentGameWinPercentage&columns%5B8%5D%5Bsearchable%5D=false&columns%5B8%5D%5Borderable%5D=true&columns%5B8%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B8%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B9%5D%5Bdata%5D=FinalTiebreaker&columns%5B9%5D%5Bname%5D=FinalTiebreaker&columns%5B9%5D%5Bsearchable%5D=false&columns%5B9%5D%5Borderable%5D=true&columns%5B9%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B9%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B10%5D%5Bdata%5D=OpponentCount&columns%5B10%5D%5Bname%5D=OpponentCount&columns%5B10%5D%5Bsearchable%5D=true&columns%5B10%5D%5Borderable%5D=true&columns%5B10%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B10%5D%5Bsearch%5D%5Bregex%5D=false&order%5B0%5D%5Bcolumn%5D=0&order%5B0%5D%5Bdir%5D=asc&start=${start}&length=500&search%5Bvalue%5D=&search%5Bregex%5D=false&roundId=${roundId}`,
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch round standings: ${response.status} ${response.statusText}`,
        );
      }

      // Return the JSON response
      const res = await response.json();
      data.push(...res.data);
      recordsTotal = res.recordsTotal;
      start += 500;
    }

    return data;
  } catch (error) {
    console.error('Error fetching round standings:', error);
    throw error;
  }
}

export async function fetchPlayerDetails(playerId: number): Promise<TIPlayerDataWithDecklists> {
  try {
    await delay(300);
    const url = `https://melee.gg/Player/GetPlayerDetails?id=${playerId}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...basicHeaders,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch player details: ${response.status} ${response.statusText}`);
    }
    console.log('Fetched player details:', playerId);

    return await response.json();
  } catch (error) {
    console.error('Error fetching tournament view:', error);
    throw error;
  }
}

export async function fetchDeckMatchesWithMeleeDeckIds(
  deckId: string,
  tournamentId: string,
  p1Username: string,
): Promise<TournamentMatchInsert[]> {
  console.log(`Fetching matches for ${p1Username} with deckId ${deckId}`);
  const url = `https://melee.gg/Decklist/GetTournamentViewData/${deckId}`;

  try {
    await delay(500);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...basicHeaders,
      },
    });

    if (!response.ok) {
      console.warn(`Failed to fetch deck matches: ${response.status} ${response.statusText}`);
      return [];
    }

    // Return the JSON response
    const res = await response.json();

    const matchesData = JSON.parse(res.Json).Matches;

    let points = 0;
    return matchesData.map((match: any) => {
      const pointsBefore = points;
      let isBye = false;
      let result = 0;
      let gameWin = 0,
        gameLose = 0,
        gameDraw = 0;
      if (match.Result.includes(' was assigned a bye')) {
        isBye = true;
      } else if (match.Result.endsWith(' Draw')) {
        gameDraw = 3;
        points += 1;
        result = 1;
      } else if (match.Result.includes(' forfeited the match')) {
        console.log(`Doing nothing - ${match.Result}`);
        //not sure if only one player or both of them - edge case, whatever
      } else {
        const matchResult = match.Result.split(' won ');
        const gameResult = matchResult.pop();
        const userName = matchResult.join(' won '); //just in case someone is named "Dude won the Potato"
        const results = gameResult.split('-');

        if (matchResult.length === 1 && results.length === 3) {
          if (userName === p1Username) {
            gameWin = results[0] ?? 0;
            gameLose = results[1] ?? 0;
            gameDraw = results[2] ?? 0;
            result = 3;
            points += 3;
          } else {
            gameWin = results[1] ?? 0;
            gameLose = results[0] ?? 0;
            gameDraw = results[2] ?? 0;
          }
        } else {
          console.log(
            `Not sure what to do, doing nothing: matchResult.length = ${matchResult.length}; results.length = ${results.length};`,
          );
        }
      }

      return {
        tournamentId,
        round: match.Round,
        p1Username,
        p1DeckId: deckId,
        p1Points: pointsBefore,
        p2Username: isBye ? null : (match.Opponent ?? ''), //There is also OpponentUsername, but we want display name
        p2DeckId: isBye ? null : (match.OpponentDecklistGuid ?? ''),
        p2Points: isBye ? null : pointsBefore, //this can be inaccurate and is updated later
        gameWin,
        gameLose,
        gameDraw,
        result,
        isBye,
      };
    });
  } catch (error) {
    console.error('Error fetching round standings:', error);
    throw error;
  }
}

/**
 * Fetches all matches for a specific round in a tournament.
 *
 * This function is an alternative to fetchDeckMatchesWithMeleeDeckIds when decklists
 * are not available. It fetches matches directly from the round endpoint and parses
 * them using the same logic.
 *
 * @param tournamentId - The ID of the tournament
 * @param roundId - The ID of the round to fetch matches from
 * @param playerInfo - A map of player usernames to their deck IDs and match data
 * @returns An array of TournamentMatchInsert objects
 */
export async function fetchMatchesFromRound(
  tournamentId: string,
  roundId: number,
  playerInfo: Record<
    string,
    {
      deckId: string;
      meleeDeckId: string;
      matches: TournamentMatchInsert[];
    }
  >,
): Promise<TournamentMatchInsert[]> {
  let recordsTotal = -1;
  const matchesData = [];
  console.log(`Fetching matches for round ${roundId} in tournament ${tournamentId}`);
  const url = `https://melee.gg/Match/GetRoundMatches/${roundId}`;

  try {
    let start = 0;

    while (recordsTotal === -1 || matchesData.length < recordsTotal) {
      await delay(500);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...formPostHeaders,
        },
        body: `draw=7&columns%5B0%5D%5Bdata%5D=TableNumber&columns%5B0%5D%5Bname%5D=TableNumber&columns%5B0%5D%5Bsearchable%5D=true&columns%5B0%5D%5Borderable%5D=true&columns%5B0%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B0%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B1%5D%5Bdata%5D=PodNumber&columns%5B1%5D%5Bname%5D=PodNumber&columns%5B1%5D%5Bsearchable%5D=true&columns%5B1%5D%5Borderable%5D=true&columns%5B1%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B1%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B2%5D%5Bdata%5D=Teams&columns%5B2%5D%5Bname%5D=Teams&columns%5B2%5D%5Bsearchable%5D=false&columns%5B2%5D%5Borderable%5D=false&columns%5B2%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B2%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B3%5D%5Bdata%5D=Decklists&columns%5B3%5D%5Bname%5D=Decklists&columns%5B3%5D%5Bsearchable%5D=false&columns%5B3%5D%5Borderable%5D=false&columns%5B3%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B3%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B4%5D%5Bdata%5D=ResultString&columns%5B4%5D%5Bname%5D=ResultString&columns%5B4%5D%5Bsearchable%5D=false&columns%5B4%5D%5Borderable%5D=false&columns%5B4%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B4%5D%5Bsearch%5D%5Bregex%5D=false&order%5B0%5D%5Bcolumn%5D=0&order%5B0%5D%5Bdir%5D=asc&start=${start}&length=500&search%5Bvalue%5D=&search%5Bregex%5D=false`,
      });

      if (!response.ok) {
        console.warn(`Failed to fetch round matches: ${response.status} ${response.statusText}`);
        return [];
      }

      const res = await response.json();
      matchesData.push(...res.data);
      recordsTotal = res.recordsTotal;
      start += 500;
    }

    const matches: TournamentMatchInsert[] = [];

    for (const match of matchesData) {
      // Skip matches without competitors
      if (!match.Competitors || match.Competitors.length === 0) continue;

      // Check if it's a bye
      let isBye = false;
      if (match.Competitors.length === 1 || match.ResultString.includes('was assigned a bye')) {
        isBye = true;
      }

      // Get player 1 info
      const p1 = match.Competitors[0];
      const p1Username = p1.Team.Players[0].DisplayName;

      // Get player 2 info (if not a bye)
      let p2Username = null;
      if (!isBye && match.Competitors.length > 1) {
        p2Username = match.Competitors[1].Team.Players[0].DisplayName;
      }

      // Parse match result
      let result = 0;
      let gameWin = 0,
        gameLose = 0,
        gameDraw = 0;
      let points = 0;
      const pointsBefore = points;

      if (isBye) {
        // Handle bye - player gets a win
        gameWin = p1.GameByes || 2;
        points += 3;
        result = 3;
      } else if (match.ResultString.endsWith(' Draw')) {
        // Handle draw
        gameDraw = match.GameDraws || 3;
        points += 1;
        result = 1;
      } else if (match.ResultString.includes(' forfeited the match')) {
        console.log(`Doing nothing - ${match.ResultString}`);
        // Forfeit handling could be added here if needed
      } else if (match.ResultString.includes(' won ')) {
        // Handle win/loss
        const matchResult = match.ResultString.split(' won ');
        const gameResult = matchResult.pop();
        const userName = matchResult.join(' won '); // Just in case someone is named "Dude won the Potato"

        if (gameResult && gameResult.includes('-')) {
          const results = gameResult.split('-');

          if (matchResult.length === 1 && results.length === 3) {
            if (userName === p1Username) {
              // Player 1 won
              gameWin = parseInt(results[0]) || 0;
              gameLose = parseInt(results[1]) || 0;
              gameDraw = parseInt(results[2]) || 0;
              result = 3;
              points += 3;
            } else if (userName === p2Username) {
              // Player 2 won
              gameWin = parseInt(results[1]) || 0;
              gameLose = parseInt(results[0]) || 0;
              gameDraw = parseInt(results[2]) || 0;
            } else {
              // Handle case where winner doesn't match either player
              console.log(
                `Winner ${userName} doesn't match either player: ${p1Username} or ${p2Username}`,
              );
            }
          } else {
            console.log(
              `Not sure what to do, doing nothing: matchResult.length = ${matchResult.length}; results.length = ${results.length};`,
            );
          }
        }
      }

      // Find deck IDs from playerInfo
      const p1DeckId = playerInfo[p1Username]?.deckId || '';
      const p2DeckId = p2Username ? playerInfo[p2Username]?.deckId || null : null;

      // Create match object
      matches.push({
        tournamentId,
        round: match.RoundNumber,
        p1Username,
        p1DeckId,
        p1Points: pointsBefore,
        p2Username,
        p2DeckId,
        p2Points: isBye ? null : pointsBefore, // This can be inaccurate and is updated later
        gameWin,
        gameLose,
        gameDraw,
        result,
        isBye,
      });
    }

    return matches;
  } catch (error) {
    console.error('Error fetching round matches:', error);
    throw error;
  }
}

export async function fetchDecklistView(decklistId: string) {
  const url = `https://melee.gg/Decklist/View/${decklistId}`;

  try {
    await delay(500);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...basicHeaders,
      },
    });

    if (!response.ok) {
      console.warn(`Failed to fetch deck view: ${response.status} ${response.statusText}`);
      return '';
    }

    const html = await response.text();
    const { document } = parseHTML(html);
    const decklist = document.querySelector('pre#decklist-swu-text')?.textContent;

    if (!decklist) {
      console.warn(`decklist-swu-text not found in ${url}`);
      return '';
    }

    return decklist;
  } catch (error) {
    console.error('Error fetching round standings:', error);
    throw error;
  }
}

export type ParsedStanding = {
  tournamentDeck: TournamentDeck;
  decklistName: string;
  exists: boolean;
  meleeUserId?: number;
};
export type ParseStandingsAdditionalInfo = {
  /**
   * sometimes melee has users with 0-0-0 matches very high up in the standings
   * - in that case, we need to skip them and change placements of all players after them
   */
  skippedStandings: ParsedStanding[];
};

export const parseStandingsToTournamentDeck = (
  standing: any,
  tournament: Tournament,
  availableDecks: TournamentDeck[],
  additionalInfo: ParseStandingsAdditionalInfo,
  userDecklistMap: TIUserDecklistMap | undefined, // in case of decklist only on "hover", we fetched data beforehand
): ParsedStanding | undefined => {
  let decklistInfo = standing.Decklists[0];

  const placement = standing.Rank - additionalInfo.skippedStandings.length;
  const meleePlayerUsername = standing.Team.Players[0].DisplayName;
  const meleeUserId = standing.Team.Players[0].ID;

  if (!decklistInfo && userDecklistMap) {
    if (userDecklistMap[meleeUserId]) {
      const dl = userDecklistMap[meleeUserId];
      decklistInfo = { DecklistId: dl.id, DecklistName: dl.name };
      console.log(`Found user decklist for ${meleePlayerUsername} in userDecklistMap`);
    } else {
      console.log(`No decklist info found for ${meleePlayerUsername} in userDecklistMap`);
    }
  }

  const meleeDecklistGuid = decklistInfo?.DecklistId;

  const exists = availableDecks.find(d => d.meleeDecklistGuid === meleeDecklistGuid);
  const decklistName = `#${placement} ${tournament.name} - ${meleePlayerUsername} [${decklistInfo?.DecklistName}]`;

  const result = {
    tournamentDeck: {
      tournamentId: tournament.id,
      deckId: exists ? exists.deckId : '',
      placement,
      topRelativeToPlayerCount: false,
      recordWin: standing.MatchWins,
      recordLose: standing.MatchLosses,
      recordDraw: standing.MatchDraws,
      points: standing.Points,
      meleeDecklistGuid,
      meleePlayerUsername,
    },
    decklistName,
    exists: !!exists,
    meleeUserId,
  };

  console.log(`Parsed ${result.exists ? 'existing' : 'new'} decklist: ${result.decklistName}`);

  if (standing.MatchRecord === '0-0-0') {
    additionalInfo.skippedStandings.push(result);
    return undefined;
  }
  return result;
};

export const parseStandingsToTournamentDeck2 = (
  standing: any,
  tournament: Tournament,
  availableDecks: TournamentDeck[],
): {
  meleeDecklistGuid?: string;
  meleePlayerUsername?: string;
  oldUsername?: string;
  exists: boolean;
  realDecklistId?: string;
} => {
  const decklistInfo = standing.Decklists[0];
  const meleeDecklistGuid = decklistInfo?.DecklistId;
  const meleePlayerUsername = standing.Team.Players[0].DisplayName;
  const oldUsername = standing.Team.Players[0].Username;

  const exists = availableDecks.find(d => d.meleeDecklistGuid === meleeDecklistGuid);

  return {
    meleeDecklistGuid,
    meleePlayerUsername,
    oldUsername,
    exists: !!exists,
    realDecklistId: exists?.deckId,
  };
};
