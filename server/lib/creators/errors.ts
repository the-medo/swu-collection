export class CreatorError extends Error {
  constructor(
    message: string,
    public status: 400 | 401 | 403 | 404 | 409 | 429 | 503 = 400,
  ) {
    super(message);
  }
}
