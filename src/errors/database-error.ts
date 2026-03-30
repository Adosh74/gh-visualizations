import { CustomError } from './custom-error';

export class DatabaseError extends CustomError {
  statusCode = 400;

  constructor(
    public message: string,
    public field?: string,
  ) {
    super(message);
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }

  serializeErrors() {
    return [{ message: this.message, field: this.field }];
  }
}
