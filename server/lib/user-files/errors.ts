export class UserFileError extends Error {
  constructor(
    message: string,
    public status: 400 | 404 | 408 | 409 | 413 | 429 | 502 | 503,
  ) {
    super(message);
  }
}
