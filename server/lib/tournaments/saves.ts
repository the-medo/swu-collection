import { and, asc, eq, sql } from 'drizzle-orm';
import { db } from '../../db';
import { tournament } from '../../db/schema/tournament.ts';
import { userTournamentSave } from '../../db/schema/user_tournament_save.ts';
import { tournamentMapColumns } from './mapProjection.ts';
import type { SavedTournament, TournamentSaveStatus } from '../../../types/UserTournamentSave.ts';

const columns = {
  tournamentId: userTournamentSave.tournamentId,
  status: userTournamentSave.status,
  additionalInfo: userTournamentSave.additionalInfo,
  createdAt: userTournamentSave.createdAt,
  updatedAt: userTournamentSave.updatedAt,
  tournament: tournamentMapColumns,
};

export const tournamentSaveService = {
  async list(userId: string): Promise<SavedTournament[]> {
    return db
      .select(columns)
      .from(userTournamentSave)
      .innerJoin(tournament, eq(tournament.id, userTournamentSave.tournamentId))
      .where(eq(userTournamentSave.userId, userId))
      .orderBy(asc(tournament.date), asc(tournament.name), asc(tournament.id));
  },
  async save(
    userId: string,
    tournamentId: string,
    status: TournamentSaveStatus,
  ): Promise<SavedTournament | null> {
    return db.transaction(async tx => {
      // Keep a concurrent tournament deletion from racing the foreign-key insert.
      const [exists] = await tx
        .select({ id: tournament.id })
        .from(tournament)
        .where(eq(tournament.id, tournamentId))
        .for('key share');
      if (!exists) return null;
      await tx
        .insert(userTournamentSave)
        .values({ userId, tournamentId, status })
        .onConflictDoUpdate({
          target: [userTournamentSave.userId, userTournamentSave.tournamentId],
          set: { status, updatedAt: sql`now()` },
        });
      const [saved] = await tx
        .select(columns)
        .from(userTournamentSave)
        .innerJoin(tournament, eq(tournament.id, userTournamentSave.tournamentId))
        .where(
          and(
            eq(userTournamentSave.userId, userId),
            eq(userTournamentSave.tournamentId, tournamentId),
          ),
        );
      return saved;
    });
  },
  async remove(userId: string, tournamentId: string) {
    await db
      .delete(userTournamentSave)
      .where(
        and(
          eq(userTournamentSave.userId, userId),
          eq(userTournamentSave.tournamentId, tournamentId),
        ),
      );
  },
};
