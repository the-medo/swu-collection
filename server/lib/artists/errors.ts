export class ArtistTransferError extends Error {
  constructor(
    message: string,
    public readonly status: 400 | 404 | 409 | 413 | 502 | 503,
  ) {
    super(message);
    this.name = 'ArtistTransferError';
  }
}
