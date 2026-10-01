import { z } from 'zod';
import type { MapTournament } from './TournamentMap.ts';
import type { TournamentSaveStatus } from './UserTournamentSave.ts';

export const calendarPrivacyValues = ['private', 'unlisted', 'public'] as const;
export const calendarPrivacySchema = z.enum(calendarPrivacyValues);
export type CalendarPrivacy = z.infer<typeof calendarPrivacySchema>;
export const calendarPrivacyInput = z.object({ privacy: calendarPrivacySchema }).strict();

export interface SharedCalendarEvent {
  tournamentId: string;
  tournament: MapTournament;
  status: TournamentSaveStatus;
}

export interface SharedTournamentCalendar {
  owner: { id: string; displayName: string };
  events: SharedCalendarEvent[];
}

export interface TeamCalendarEvent {
  tournament: MapTournament;
  members: {
    userId: string;
    displayName: string;
    image: string | null;
    status: TournamentSaveStatus;
  }[];
}
