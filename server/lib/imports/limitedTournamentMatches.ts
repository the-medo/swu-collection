import type { TournamentMatchInsert } from '../../db/schema/tournament_match.ts';

type MeleeCompetitor = {
  Team?: { Players?: { DisplayName?: string; Username?: string }[] };
  GameWins?: number;
  GameWinsAndGameByes?: number;
  GameByes?: number;
};

export type LimitedMeleeMatch = {
  Competitors?: MeleeCompetitor[];
  ResultString?: string;
  GameDraws?: number;
};

const playerName = (competitor: MeleeCompetitor | undefined) => {
  const player = competitor?.Team?.Players?.[0];
  return player?.DisplayName || player?.Username || null;
};

/**
 * Round results are independent of decklists. Keep scores in player one's
 * orientation and accumulate pre-round points for both players exactly once.
 */
export function buildLimitedTournamentMatches(
  tournamentId: string,
  rounds: { number: number; matches: LimitedMeleeMatch[] }[],
): TournamentMatchInsert[] {
  const points = new Map<string, number>();
  const matches: TournamentMatchInsert[] = [];
  const seen = new Set<string>();

  for (const round of [...rounds].sort((a, b) => a.number - b.number)) {
    for (const raw of round.matches) {
      const [p1, p2] = raw.Competitors ?? [];
      const p1Username = playerName(p1);
      const p2Username = playerName(p2);
      const description = raw.ResultString?.trim() ?? '';
      if (!p1Username || (p2 && !p2Username)) {
        throw new Error(`Missing player in round ${round.number}`);
      }
      const key = JSON.stringify([round.number, [p1Username, p2Username ?? ''].sort()]);
      if (seen.has(key)) continue;
      seen.add(key);

      const isBye = !p2Username && /bye/i.test(description);
      let gameWin = 0;
      let gameLose = 0;
      let gameDraw = 0;
      let result: number;
      let opponentResult: number;
      const win = description.match(/^(.*) won (\d+)-(\d+)(?:-(\d+))?\.?$/);

      if (isBye) {
        gameWin = p1?.GameByes || 2;
        result = 3;
        opponentResult = 0;
      } else if (!p2Username) {
        throw new Error(`Missing opponent in round ${round.number}: ${description}`);
      } else if (win && (win[1] === p1Username || win[1] === p2Username)) {
        const firstWon = win[1] === p1Username;
        gameWin = Number(win[firstWon ? 2 : 3]);
        gameLose = Number(win[firstWon ? 3 : 2]);
        gameDraw = Number(win[4] ?? 0);
        result = firstWon ? 3 : 0;
        opponentResult = firstWon ? 0 : 3;
      } else if (/\bDraw$/i.test(description)) {
        gameWin = p1?.GameWinsAndGameByes ?? p1?.GameWins ?? 0;
        gameLose = p2?.GameWinsAndGameByes ?? p2?.GameWins ?? 0;
        gameDraw = raw.GameDraws ?? (gameWin + gameLose === 0 ? 3 : 0);
        result = opponentResult = 1;
      } else if (description === 'Players forfeited the match') {
        // Both players receive a loss, with no game wins awarded to either.
        result = opponentResult = 0;
      } else if (
        description === `${p1Username} forfeited the match` ||
        description === `${p2Username} forfeited the match`
      ) {
        const firstLost = description === `${p1Username} forfeited the match`;
        result = firstLost ? 0 : 3;
        opponentResult = firstLost ? 3 : 0;
        gameWin = firstLost ? 0 : 2;
        gameLose = firstLost ? 2 : 0;
      } else {
        // Never turn an unavailable or unrecognized result into a player-two win.
        throw new Error(`Unrecognized result in round ${round.number}: ${description}`);
      }

      matches.push({
        tournamentId,
        round: round.number,
        p1Username,
        p2Username,
        p1DeckId: null,
        p2DeckId: null,
        p1Points: points.get(p1Username) ?? 0,
        p2Points: p2Username ? (points.get(p2Username) ?? 0) : null,
        gameWin,
        gameLose,
        gameDraw,
        result,
        isBye,
      });
      points.set(p1Username, (points.get(p1Username) ?? 0) + result);
      if (p2Username) {
        points.set(p2Username, (points.get(p2Username) ?? 0) + opponentResult);
      }
    }
  }

  return matches;
}
