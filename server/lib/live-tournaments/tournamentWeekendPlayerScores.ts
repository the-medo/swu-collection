import { sql } from 'drizzle-orm';
import { db } from '../../db';

export async function recomputeTournamentWeekendPlayerScores(tournamentId: string) {
  await db.execute(sql`
    WITH score_rows AS (
      SELECT
        twp.tournament_id,
        twp.player_display_name,
        COALESCE(twm.player_1_game_win, 0) AS game_wins,
        COALESCE(twm.player_2_game_win, 0) AS game_losses,
        CASE
          WHEN twm.player_display_name_2 IS NULL
            OR twm.player_1_game_win > twm.player_2_game_win
            THEN 1
          ELSE 0
        END AS match_wins,
        CASE
          WHEN twm.player_display_name_2 IS NOT NULL
            AND twm.player_1_game_win < twm.player_2_game_win
            THEN 1
          ELSE 0
        END AS match_losses,
        CASE
          WHEN twm.player_display_name_2 IS NOT NULL
            AND twm.player_1_game_win = twm.player_2_game_win
            THEN 1
          ELSE 0
        END AS match_draws
      FROM tournament_weekend_player twp
        JOIN tournament_weekend_match twm
          ON twp.tournament_id = twm.tournament_id
          AND twm.player_display_name_1 = twp.player_display_name
      WHERE
        twp.tournament_id = ${tournamentId}
        AND (
          twm.player_display_name_2 IS NULL
          OR (
            twm.updated_at IS NOT NULL
            AND twm.player_1_game_win IS NOT NULL
            AND twm.player_2_game_win IS NOT NULL
          )
        )

      UNION ALL

      SELECT
        twp.tournament_id,
        twp.player_display_name,
        twm.player_2_game_win AS game_wins,
        twm.player_1_game_win AS game_losses,
        CASE
          WHEN twm.player_2_game_win > twm.player_1_game_win THEN 1
          ELSE 0
        END AS match_wins,
        CASE
          WHEN twm.player_2_game_win < twm.player_1_game_win THEN 1
          ELSE 0
        END AS match_losses,
        CASE
          WHEN twm.player_2_game_win = twm.player_1_game_win THEN 1
          ELSE 0
        END AS match_draws
      FROM tournament_weekend_player twp
        JOIN tournament_weekend_match twm
          ON twp.tournament_id = twm.tournament_id
          AND twm.player_display_name_2 = twp.player_display_name
      WHERE
        twp.tournament_id = ${tournamentId}
        AND twm.updated_at IS NOT NULL
        AND twm.player_1_game_win IS NOT NULL
        AND twm.player_2_game_win IS NOT NULL
    ),
    scores AS (
      SELECT
        tournament_id,
        player_display_name,
        SUM(game_wins) AS game_wins,
        SUM(game_losses) AS game_losses,
        SUM(match_wins) AS match_wins,
        SUM(match_losses) AS match_losses,
        SUM(match_draws) AS match_draws
      FROM score_rows
      GROUP BY tournament_id, player_display_name
    )
    INSERT INTO tournament_weekend_player (
      tournament_id,
      player_display_name,
      match_score,
      game_score
    )
    SELECT
      twp.tournament_id,
      twp.player_display_name,
      CONCAT(
        COALESCE(scores.match_wins, 0),
        '-',
        COALESCE(scores.match_losses, 0),
        '-',
        COALESCE(scores.match_draws, 0)
      ),
      CONCAT(
        COALESCE(scores.game_wins, 0),
        '-',
        COALESCE(scores.game_losses, 0)
      )
    FROM tournament_weekend_player twp
      LEFT JOIN scores
        ON scores.tournament_id = twp.tournament_id
        AND scores.player_display_name = twp.player_display_name
    WHERE twp.tournament_id = ${tournamentId}
    ON CONFLICT (tournament_id, player_display_name) DO UPDATE SET
      match_score = EXCLUDED.match_score,
      game_score = EXCLUDED.game_score,
      updated_at = NOW()
  `);
}
