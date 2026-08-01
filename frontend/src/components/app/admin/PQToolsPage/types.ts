// Define the structure of a PQ tournament entry
import { TournamentData } from '../../../../../../types/Tournament.ts';

export const PQ_FORMATS = ['Premier', 'Sealed play', 'Eternal'] as const;

export type PQFormat = (typeof PQ_FORMATS)[number];

export const PQ_FORMAT_IDS: Record<PQFormat, number> = {
  Premier: 1,
  'Sealed play': 3,
  Eternal: 6,
};

export const isPQFormat = (value: unknown): value is PQFormat =>
  typeof value === 'string' && (PQ_FORMATS as readonly string[]).includes(value);

export interface PQTournament {
  location: string; // Country code (e.g., "US", "FR")
  continent: string; // Continent name (e.g., "North America", "Europe")
  name: string; // Tournament name in the format "PQ - City - State, CountryCode" or "PQ - City, CountryCode"
  date: string; // ISO date string
  format: PQFormat;
  link?: string; // Optional URL to the tournament
}

// Props for the PqDataRow component
export interface PQDataRowProps {
  data: PQTournament;
  index: number;
  onSave: (index: number, data: PQTournament) => void;
  onRemove: (index: number) => void;
}

// Local storage key for PQ data
export const LOCAL_STORAGE_KEY = 'pq_data_parser';

export interface WeekData {
  weekNumber: number;
  startDate: Date;
  endDate: Date;
  tournaments: TournamentData[];
}
