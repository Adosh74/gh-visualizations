import type { CommitDao } from './DAOs/commit-dao';
import type { PullRequestDao } from './DAOs/pull-request-dao';
import type { RepositoryDao } from './DAOs/repository-dao';

import { SqlDatastore } from './sql/index.sql';

export interface Datastore extends CommitDao, PullRequestDao, RepositoryDao {}

let _db: Datastore;

export function getDb(): Datastore {
  if (!_db)
    throw new Error('Database not initialized.');
  return _db;
}

export async function initDb() {
  _db = await new SqlDatastore().openDb();
}
