export class DeckVersionError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'DECK_NOT_FOUND'
      | 'VERSION_NOT_FOUND'
      | 'VERSION_PARENT_MISMATCH'
      | 'LIMITED_DECK_UNSUPPORTED'
      | 'INVALID_VERSION_HISTORY'
      | 'NO_VERSION_CHANGES'
      | 'STALE_DECK',
  ) {
    super(message);
    this.name = 'DeckVersionError';
  }
}
