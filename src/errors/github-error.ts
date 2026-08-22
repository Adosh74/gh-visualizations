import { CustomError } from './custom-error';

/**
 * Raised when GitHub cannot serve a request — a missing repository (404),
 * an exhausted rate limit (403), or an upstream failure (502).
 */
export class GitHubError extends CustomError {
  statusCode: number;

  constructor(
    public message: string,
    statusCode: number = 502,
  ) {
    super(message);
    this.statusCode = statusCode;

    Object.setPrototypeOf(this, GitHubError.prototype);
  }

  serializeErrors() {
    return [{ message: this.message }];
  }
}
