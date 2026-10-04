import { randomUUID } from 'node:crypto';
import { and, eq, inArray, or, sql } from 'drizzle-orm';
import { db } from '../../db';
import { user } from '../../db/schema/auth-schema.ts';
import { meleeConnection } from '../../db/schema/melee_connection.ts';
import {
  userMeleeTournaments,
  userMeleeTournamentSync,
} from '../../db/schema/user_melee_tournaments.ts';
import { tournament } from '../../db/schema/tournament.ts';
import { tournamentType } from '../../db/schema/tournament_type.ts';
import { tournamentDeck } from '../../db/schema/tournament_deck.ts';
import { deck } from '../../db/schema/deck.ts';
import { format } from '../../db/schema/format.ts';
import type {
  UserMeleeTournament,
  UserMeleeTournamentsResponse,
} from '../../../shared/types/UserMeleeTournaments.ts';
import { fetchMeleeResults } from './results.ts';
import { MeleeConnectionError } from './profile.ts';
import { summarizeTournaments, tournamentAchievements } from './tournamentStats.ts';
import { findTournamentDeck } from './tournamentDeck.ts';

const COOLDOWN_MS = 60_000;
const LEASE_MS = 120_000;

export function createMeleeTournamentService(
  database: typeof db,
  fetchResults = fetchMeleeResults,
  now = () => new Date(),
) {
  async function matchingTournaments(meleeIds: number[]) {
    const matches = meleeIds.length
      ? await database
          .select({ tournament, typeName: tournamentType.name, formatName: format.name })
          .from(tournament)
          .innerJoin(tournamentType, eq(tournament.type, tournamentType.id))
          .innerJoin(format, eq(tournament.format, format.id))
          .where(inArray(tournament.meleeId, meleeIds.map(String)))
      : [];
    // An ambiguous catalog match must not award duplicate achievements or the wrong deck.
    const grouped = new Map<string, typeof matches>();
    for (const match of matches) {
      const key = match.tournament.meleeId!;
      grouped.set(key, [...(grouped.get(key) ?? []), match]);
    }
    return new Map(
      [...grouped].filter(([, rows]) => rows.length === 1).map(([id, rows]) => [id, rows[0]!]),
    );
  }

  async function get(userId: string): Promise<UserMeleeTournamentsResponse> {
    const [owner] = await database.select({ id: user.id }).from(user).where(eq(user.id, userId));
    if (!owner) throw new MeleeConnectionError('User not found.', 404);
    const [connection] = await database
      .select()
      .from(meleeConnection)
      .where(eq(meleeConnection.userId, userId));
    const [sync] = connection
      ? await database
          .select()
          .from(userMeleeTournamentSync)
          .where(eq(userMeleeTournamentSync.userId, userId))
      : [];
    const saved = connection
      ? await database
          .select()
          .from(userMeleeTournaments)
          .where(eq(userMeleeTournaments.userId, userId))
      : [];
    // Hide removed/ambiguous catalog entries, including unmatched rows saved by older versions.
    const matches = await matchingTournaments(saved.map(row => row.meleeId));
    const matchedRows = saved.filter(row => matches.has(String(row.meleeId)));
    const tournamentIds = [...matches.values()].map(row => row.tournament.id);
    const placementConditions = matchedRows
      .filter(row => row.status === 4 && row.meleePlacement !== null && row.meleePlacement > 0)
      .map(row =>
        and(
          eq(tournamentDeck.tournamentId, matches.get(String(row.meleeId))!.tournament.id),
          eq(tournamentDeck.placement, row.meleePlacement!),
        ),
      );
    const decks =
      connection && tournamentIds.length
        ? await database
            .select({
              tournamentId: tournamentDeck.tournamentId,
              id: deck.id,
              name: deck.name,
              username: tournamentDeck.meleePlayerUsername,
              placement: tournamentDeck.placement,
              visibility: deck.public,
            })
            .from(tournamentDeck)
            .innerJoin(deck, eq(tournamentDeck.deckId, deck.id))
            .where(
              and(
                inArray(tournamentDeck.tournamentId, tournamentIds),
                or(
                  sql`lower(${tournamentDeck.meleePlayerUsername}) = ${connection.username.toLowerCase()}`,
                  ...placementConditions,
                ),
              ),
            )
        : [];
    const tournaments: UserMeleeTournament[] = matchedRows
      .map(row => {
        const match = matches.get(String(row.meleeId))!;
        const local = match.tournament;
        const availableDecks = decks.filter(candidate => candidate.tournamentId === local.id);
        const completed = row.status === 4;
        return {
          meleeId: row.meleeId,
          tournamentId: local.id,
          name: local.name,
          type: local.type,
          typeName: match.typeName,
          date: local.date.toISOString().slice(0, 10),
          format: match.formatName ?? row.format,
          attendance: local.attendance,
          placement: row.meleePlacement,
          record: row.record,
          completed,
          ...tournamentAchievements({
            type: local.type,
            days: local.days,
            dayTwoPlayerCount: local.dayTwoPlayerCount,
            placement: row.meleePlacement,
            completed,
          }),
          deck: findTournamentDeck(
            availableDecks,
            connection!.username,
            completed ? row.meleePlacement : null,
          ),
          meleeDecklistId: row.decklistId,
          meleeDecklistName: row.decklistName,
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.meleeId - a.meleeId);
    return {
      connected: !!connection,
      lastRefreshedAt: sync?.lastRefreshedAt?.toISOString() ?? null,
      nextRefreshAt: sync?.lastAttemptAt
        ? new Date(
            sync.lastAttemptAt.getTime() + (sync.refreshToken ? LEASE_MS : COOLDOWN_MS),
          ).toISOString()
        : null,
      tournaments,
      stats: summarizeTournaments(tournaments),
    };
  }

  return {
    get,
    async refresh(userId: string) {
      const token = randomUUID();
      const connection = await database.transaction(async tx => {
        // Same owner lock as Melee linking/disconnection. Never hold it during HTTP requests.
        await tx.select({ id: user.id }).from(user).where(eq(user.id, userId)).for('update');
        const [connection] = await tx
          .select()
          .from(meleeConnection)
          .where(eq(meleeConnection.userId, userId));
        if (!connection)
          throw new MeleeConnectionError(
            'Connect your Melee account in Settings before refreshing.',
            409,
          );
        const [previous] = await tx
          .select()
          .from(userMeleeTournamentSync)
          .where(eq(userMeleeTournamentSync.userId, userId));
        const attemptedAt = now();
        if (
          previous?.lastAttemptAt &&
          attemptedAt.getTime() - previous.lastAttemptAt.getTime() <
            (previous.refreshToken ? LEASE_MS : COOLDOWN_MS)
        ) {
          throw new MeleeConnectionError(
            'A refresh was recently requested. Please wait a minute and try again.',
            429,
          );
        }
        await tx
          .insert(userMeleeTournamentSync)
          .values({ userId, lastAttemptAt: attemptedAt, refreshToken: token })
          .onConflictDoUpdate({
            target: userMeleeTournamentSync.userId,
            set: { lastAttemptAt: attemptedAt, refreshToken: token },
          });
        return connection;
      });
      try {
        const results = await fetchResults(connection.username);
        const matches = await matchingTournaments(results.map(row => row.TournamentId));
        // Only SWUBASE catalog tournaments belong in profile history.
        const matchedResults = results.filter(row => matches.has(String(row.TournamentId)));
        await database.transaction(async tx => {
          await tx.select({ id: user.id }).from(user).where(eq(user.id, userId)).for('update');
          // Cascading deletion clears the claim on unlink; a reconnected account gets a new claim.
          const [claim] = await tx
            .select()
            .from(userMeleeTournamentSync)
            .where(
              and(
                eq(userMeleeTournamentSync.userId, userId),
                eq(userMeleeTournamentSync.refreshToken, token),
              ),
            );
          if (!claim)
            throw new MeleeConnectionError(
              'Your Melee connection changed during refresh. Please refresh again.',
              409,
            );
          const refreshedAt = now();
          await tx.delete(userMeleeTournaments).where(eq(userMeleeTournaments.userId, userId));
          // Bound parameter counts for profiles with long histories.
          for (let offset = 0; offset < matchedResults.length; offset += 500) {
            await tx.insert(userMeleeTournaments).values(
              matchedResults.slice(offset, offset + 500).map(row => ({
                userId,
                meleeId: row.TournamentId,
                tournamentId: matches.get(String(row.TournamentId))!.tournament.id,
                meleePlacement: row.Rank && row.Rank > 0 ? row.Rank : null,
                name: row.TournamentName,
                date: new Date(row.TournamentStartDate),
                format: row.FormatDescription ?? row.Format,
                attendance: row.ParticipatingCount,
                record: row.Record === '-' ? null : row.Record,
                decklistId: row.DecklistId && row.DecklistId > 0 ? row.DecklistId : null,
                decklistName: row.DecklistName,
                status: row.TournamentStatus,
                refreshedAt,
              })),
            );
          }
          await tx
            .update(userMeleeTournamentSync)
            .set({ lastRefreshedAt: refreshedAt, refreshToken: null })
            .where(
              and(
                eq(userMeleeTournamentSync.userId, userId),
                eq(userMeleeTournamentSync.refreshToken, token),
              ),
            );
        });
      } catch (error) {
        await database
          .update(userMeleeTournamentSync)
          .set({ refreshToken: null })
          .where(
            and(
              eq(userMeleeTournamentSync.userId, userId),
              eq(userMeleeTournamentSync.refreshToken, token),
            ),
          );
        throw error;
      }
      return get(userId);
    },
  };
}

export const meleeTournamentService = createMeleeTournamentService(db);
