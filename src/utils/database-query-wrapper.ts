import { DatabaseError } from '../errors/database-error';

interface SqliteError extends Error {
  code: string;
  errno: number;
}

function isSqliteError(err: unknown): err is SqliteError {
  return err instanceof Error && 'code' in err;
}

function parseSqliteError(err: unknown): DatabaseError | null {
  if (!isSqliteError(err))
    return null;

  if (err.code === 'SQLITE_CONSTRAINT') {
    if (err.message.includes('NOT NULL constraint failed')) {
      const field = err.message.split('.').pop() ?? 'unknown field';
      return new DatabaseError(`${field} is required`, field);
    }

    if (err.message.includes('UNIQUE constraint failed')) {
      const field = err.message.split('.').pop() ?? 'unknown field';
      return new DatabaseError(`${field} already exists`, field);
    }

    if (err.message.includes('FOREIGN KEY constraint failed')) {
      return new DatabaseError('Referenced resource does not exist');
    }
  }

  return null;
}

export async function databaseQueryWrapper<T>(
  operation: () => Promise<T>,
): Promise<T> {
  try {
    return await operation();
  }
  catch (err) {
    const dbError = parseSqliteError(err);
    if (dbError)
      throw dbError;
    throw err;
  }
}
