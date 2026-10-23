import { db } from '../../db';
import { createTournamentReportService } from './tournamentReportCore.ts';
export { createTournamentReportService } from './tournamentReportCore.ts';
export const tournamentReportService = createTournamentReportService(db);
