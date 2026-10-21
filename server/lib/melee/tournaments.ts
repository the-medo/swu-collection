import { db } from '../../db';
import { createMeleeTournamentService } from './tournamentsCore.ts';
export { createMeleeTournamentService } from './tournamentsCore.ts';
export const meleeTournamentService = createMeleeTournamentService(db);
