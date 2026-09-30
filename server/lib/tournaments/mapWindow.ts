import { fourMonthWindow } from '../../../shared/lib/tournamentMapDates.ts';

// Homeworlds release. Change this date when the map moves to the next season.
export const tournamentMapStartDate = '2026-10-02';
export const tournamentMapWindow = fourMonthWindow(tournamentMapStartDate);
