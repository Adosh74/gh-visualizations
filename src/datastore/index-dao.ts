import type { CommitDao } from './DAOs/commit-dao';
import type { PullRequestDao } from './DAOs/pull-request-dao';
import type { RepositoryDao } from './DAOs/repository-dao';

import { SqlDatastore } from './sql/index.sql';

export interface Datastore extends CommitDao, PullRequestDao, RepositoryDao {}

let _db: SqlDatastore | undefined;

export function getDb(): Datastore {
  if (!_db)
    throw new Error('Database not initialized.');
  return _db;
}

/**
 * @param filename Overrides the on-disk database file. Tests pass `:memory:`.
 */
export async function initDb(filename?: string) {
  _db = await new SqlDatastore().openDb(filename);
  return _db;
}

export async function closeDb() {
  if (_db) {
    await _db.closeDb();
    _db = undefined;
  }
}
