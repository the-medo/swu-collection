/** Temporary Melee availability, detected before any imported data is changed. */
export class TournamentImportNotReadyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TournamentImportNotReadyError';
  }
}
