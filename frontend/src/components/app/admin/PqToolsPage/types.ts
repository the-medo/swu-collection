// Define the structure of a PQ tournament entry
export interface PqTournament {
  location: string; // Country code (e.g., "US", "FR")
  continent: string; // Continent name (e.g., "North America", "Europe")
  name: string; // Tournament name in the format "PQ - City - State, CountryCode" or "PQ - City, CountryCode"
  date: string; // ISO date string
  link?: string; // Optional URL to the tournament
}

// Props for the PqDataRow component
export interface PqDataRowProps {
  data: PqTournament;
  index: number;
  onSave: (index: number, data: PqTournament) => void;
}

// Local storage key for PQ data
export const LOCAL_STORAGE_KEY = 'pq_data_parser';
