export type SnapshotContext = {
  // YYYY-MM-DD string for the snapshot date
  date: string;
  // Optional tournament group id for which the snapshot is prepared
  tournamentGroupId: string | null;
};

// Dummy preparation that would normally figure out what tournament group/date to process
export const prepareTournamentGroup = async (): Promise<SnapshotContext> => {
  const today = new Date();
  const dateOnly = today.toISOString().slice(0, 10);

  // Placeholder UUID; in real code, this would be selected from DB
  const dummyTournamentGroupId = null; // or '00000000-0000-0000-0000-000000000000'

  return {
    date: dateOnly,
    tournamentGroupId: dummyTournamentGroupId,
  };
};

export default prepareTournamentGroup;
