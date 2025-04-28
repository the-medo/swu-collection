import { parseHTML } from 'linkedom';
import type { TournamentDeck } from '../../db/schema/tournament_deck.ts';
import { delay } from '../../../lib/swu-resources/lib/delay.ts';
import type { TournamentMatchInsert } from '../../db/schema/tournament_match.ts';
import type { Tournament } from '../../db/schema/tournament.ts';

const basicHeaders = {
  cookie: process.env.TOURNAMENT_COOKIE ?? '',
  'sec-ch-ua': '"Chromium";v="134", "Not:A-Brand";v="24", "Google Chrome";v="134"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-origin',
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
  'x-requested-with': 'XMLHttpRequest',
  origin: process.env.TOURNAMENT_ORIGIN ?? '',
};

const formPostHeaders = {
  ...basicHeaders,
  'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
};

export async function fetchTournamentView(
  tournamentId: string | number,
): Promise<number | undefined> {
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
      throw new Error(`Failed to fetch tournament view: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    const { document } = parseHTML(html);
    const button = document.querySelector(
      '#standings-round-selector-container button.round-selector:last-of-type',
    );

    const finalRoundId = button?.getAttribute('data-id') ?? null;

    if (finalRoundId) {
      console.log('Final Round ID:', finalRoundId);
      return parseInt(finalRoundId);
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

export const parseStandingsToTournamentDeck = (
  standing: any,
  tournament: Tournament,
  availableDecks: TournamentDeck[],
): { tournamentDeck: TournamentDeck; decklistName: string; exists: boolean } => {
  const decklistInfo = standing.Decklists[0];
  const placement = standing.Rank;
  const meleeDecklistGuid = decklistInfo?.DecklistId;
  const meleePlayerUsername = standing.Team.Players[0].DisplayName;

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
  };

  console.log(`Parsed ${result.exists ? 'existing' : 'new'} decklist: ${result.decklistName}`);

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
