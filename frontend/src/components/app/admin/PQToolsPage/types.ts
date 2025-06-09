// Define the structure of a PQ tournament entry
export interface PQTournament {
  location: string; // Country code (e.g., "US", "FR")
  continent: string; // Continent name (e.g., "North America", "Europe")
  name: string; // Tournament name in the format "PQ - City - State, CountryCode" or "PQ - City, CountryCode"
  date: string; // ISO date string
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
