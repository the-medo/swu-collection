export class IntegrationAppError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 401 | 403 | 404 | 409 | 429 = 400,
  ) {
    super(message);
  }
}
