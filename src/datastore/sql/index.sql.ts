import type { Database } from 'sqlite';

import path from 'node:path';
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';

import type {
  AuthorStat,
  Commit,
  PullRequest,
  Repository,
  TimeSeriesPoint,
} from '../../types';
import type { ListOptions } from '../DAOs/commit-dao';
import type { RepositorySyncUpdate } from '../DAOs/repository-dao';
import type { Datastore } from '../index-dao';

import { LOGGER } from '../../logging';
import { databaseQueryWrapper } from '../../utils/database-query-wrapper';

/**
 * Columns are snake_case in SQLite but camelCase in the domain types, so every
 * SELECT aliases explicitly instead of using `SELECT *`.
 */
const REPOSITORY_COLUMNS = `
  id,
  owner,
  name,
  url,
  description,
  default_branch AS defaultBranch,
  synced_branch AS syncedBranch,
  last_synced_at AS lastSyncedAt
`;

const COMMIT_COLUMNS = `
  id,
  repo_id AS repoId,
  sha,
  message,
  author_name AS authorName,
  author_email AS authorEmail,
  committed_at AS committedAt,
  url,
  branch
`;

const PULL_REQUEST_COLUMNS = `
  id,
  repo_id AS repoId,
  pr_number AS prNumber,
  title,
  author,
  body,
  state,
  created_at AS createdAt,
  merged_at AS mergedAt,
  url
`;

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

function page(options?: ListOptions) {
  const limit = Math.min(Math.max(options?.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  const offset = Math.max(options?.offset ?? 0, 0);
  return { limit, offset };
}

export class SqlDatastore implements Datastore {
  private db!: Database<sqlite3.Database, sqlite3.Statement>;

  /**
   * @param filename Overrides the on-disk database. Tests pass `:memory:`.
   */
  public async openDb(filename?: string) {
    this.db = await open({
      filename: filename ?? path.join(process.cwd(), 'ghvisualization.sqlite'),
      driver: sqlite3.Database,
    });

    await this.db.run('PRAGMA foreign_keys = ON;');

    await this.db.migrate({
      migrationsPath: path.join(process.cwd(), 'migrations'),
    });
    LOGGER.info('Database initialized');
    return this;
  }

  public async closeDb() {
    await this.db.close();
  }

  // ---------------------------------------------------------------- commits

  async upsertCommit(commit: Commit): Promise<void> {
    await databaseQueryWrapper(() =>
      this.db.run(
        `INSERT INTO commits (id, repo_id, sha, message, author_name, author_email, committed_at, url, branch)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (repo_id, sha) DO UPDATE SET
           message = excluded.message,
           author_name = excluded.author_name,
           author_email = excluded.author_email,
           committed_at = excluded.committed_at,
           url = excluded.url,
           branch = excluded.branch`,
        commit.id,
        commit.repoId,
        commit.sha,
        commit.message,
        commit.authorName,
        commit.authorEmail,
        commit.committedAt,
        commit.url,
        commit.branch ?? null,
      ));
  }

  async listRepoCommits(repoId: string, options?: ListOptions): Promise<Commit[]> {
    const { limit, offset } = page(options);
    return await databaseQueryWrapper(() =>
      this.db.all<Commit[]>(
        `SELECT ${COMMIT_COLUMNS} FROM commits
         WHERE repo_id = ?
         ORDER BY committed_at DESC
         LIMIT ? OFFSET ?`,
        repoId,
        limit,
        offset,
      ),
    );
  }

  async listRecentCommits(options?: ListOptions): Promise<Commit[]> {
    const { limit, offset } = page(options);
    return await databaseQueryWrapper(() =>
      this.db.all<Commit[]>(
        `SELECT ${COMMIT_COLUMNS} FROM commits
         ORDER BY committed_at DESC
         LIMIT ? OFFSET ?`,
        limit,
        offset,
      ),
    );
  }

  async countRepoCommits(repoId: string): Promise<number> {
    const row = await databaseQueryWrapper(() =>
      this.db.get<{ count: number }>('SELECT COUNT(*) AS count FROM commits WHERE repo_id = ?', repoId),
    );
    return row?.count ?? 0;
  }

  async commitsPerDay(repoId: string, days: number): Promise<TimeSeriesPoint[]> {
    return await databaseQueryWrapper(() =>
      this.db.all<TimeSeriesPoint[]>(
        `SELECT date(committed_at / 1000, 'unixepoch') AS date, COUNT(*) AS count
         FROM commits
         WHERE repo_id = ?
           AND committed_at >= (strftime('%s', 'now', ?) * 1000)
         GROUP BY date
         ORDER BY date ASC`,
        repoId,
        `-${days} days`,
      ),
    );
  }

  async commitsPerAuthor(repoId: string): Promise<AuthorStat[]> {
    return await databaseQueryWrapper(() =>
      this.db.all<AuthorStat[]>(
        `SELECT author_name AS author, COUNT(*) AS count
         FROM commits
         WHERE repo_id = ?
         GROUP BY author_name
         ORDER BY count DESC, author ASC`,
        repoId,
      ),
    );
  }

  // --------------------------------------------------------- pull requests

  async upsertPullRequest(pr: PullRequest): Promise<void> {
    await databaseQueryWrapper(() =>
      this.db.run(
        `INSERT INTO pull_requests (id, repo_id, pr_number, title, author, body, state, created_at, merged_at, url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (repo_id, pr_number) DO UPDATE SET
           title = excluded.title,
           author = excluded.author,
           body = excluded.body,
           state = excluded.state,
           created_at = excluded.created_at,
           merged_at = excluded.merged_at,
           url = excluded.url`,
        pr.id,
        pr.repoId,
        pr.prNumber,
        pr.title,
        pr.author,
        pr.body ?? null,
        pr.state,
        pr.createdAt,
        pr.mergedAt ?? null,
        pr.url,
      ),
    );
  }

  async listPullRequests(options?: ListOptions): Promise<PullRequest[]> {
    const { limit, offset } = page(options);
    return await databaseQueryWrapper(() =>
      this.db.all<PullRequest[]>(
        `SELECT ${PULL_REQUEST_COLUMNS} FROM pull_requests
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
        limit,
        offset,
      ),
    );
  }

  async listRepoPullRequests(repoId: string, options?: ListOptions): Promise<PullRequest[]> {
    const { limit, offset } = page(options);
    return await databaseQueryWrapper(() =>
      this.db.all<PullRequest[]>(
        `SELECT ${PULL_REQUEST_COLUMNS} FROM pull_requests
         WHERE repo_id = ?
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
        repoId,
        limit,
        offset,
      ),
    );
  }

  async countRepoPullRequests(repoId: string): Promise<number> {
    const row = await databaseQueryWrapper(() =>
      this.db.get<{ count: number }>('SELECT COUNT(*) AS count FROM pull_requests WHERE repo_id = ?', repoId),
    );
    return row?.count ?? 0;
  }

  async pullRequestsPerAuthor(repoId: string): Promise<AuthorStat[]> {
    return await databaseQueryWrapper(() =>
      this.db.all<AuthorStat[]>(
        `SELECT author, COUNT(*) AS count
         FROM pull_requests
         WHERE repo_id = ?
         GROUP BY author
         ORDER BY count DESC, author ASC`,
        repoId,
      ),
    );
  }

  // ----------------------------------------------------------- repositories

  async createRepository(repository: Repository): Promise<void> {
    await databaseQueryWrapper(() =>
      this.db.run(
        `INSERT INTO repositories (id, owner, name, url, description, default_branch)
         VALUES (?, ?, ?, ?, ?, ?)`,
        repository.id,
        repository.owner,
        repository.name,
        repository.url,
        repository.description ?? null,
        repository.defaultBranch ?? null,
      ),
    );
  }

  async listRepositories(): Promise<Repository[]> {
    return await databaseQueryWrapper(() =>
      this.db.all<Repository[]>(
        `SELECT ${REPOSITORY_COLUMNS} FROM repositories ORDER BY owner ASC, name ASC`,
      ),
    );
  }

  async getRepositoryById(id: string): Promise<Repository | undefined> {
    return await databaseQueryWrapper(() =>
      this.db.get<Repository>(`SELECT ${REPOSITORY_COLUMNS} FROM repositories WHERE id = ?`, id),
    );
  }

  async getRepositoryByOwnerAndName(owner: string, name: string): Promise<Repository | undefined> {
    return await databaseQueryWrapper(() =>
      this.db.get<Repository>(
        `SELECT ${REPOSITORY_COLUMNS} FROM repositories WHERE owner = ? AND name = ?`,
        owner,
        name,
      ),
    );
  }

  async deleteRepository(id: string): Promise<void> {
    await databaseQueryWrapper(() =>
      this.db.run('DELETE FROM repositories WHERE id = ?', id),
    );
  }

  async updateRepositorySync(id: string, update: RepositorySyncUpdate): Promise<void> {
    await databaseQueryWrapper(() =>
      this.db.run(
        `UPDATE repositories SET
           last_synced_at = ?,
           synced_branch = COALESCE(?, synced_branch),
           default_branch = COALESCE(?, default_branch),
           description = COALESCE(?, description)
         WHERE id = ?`,
        update.lastSyncedAt,
        update.syncedBranch ?? null,
        update.defaultBranch ?? null,
        update.description ?? null,
        id,
      ),
    );
  }
}
