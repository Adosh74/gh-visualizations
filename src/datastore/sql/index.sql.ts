import type { Database } from 'sqlite';

import path from 'node:path';
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';

import type { Commit, PullRequest, Repository } from '../../types';
import type { Datastore } from '../index-dao';

import { LOGGER } from '../../logging';

export class SqlDatastore implements Datastore {
  private db!: Database<sqlite3.Database, sqlite3.Statement>;

  public async openDb() {
    this.db = await open({
      filename: path.join(process.cwd(), 'ghvisualization.sqlite'),
      driver: sqlite3.Database,
    });

    this.db.run('PRAGMA foreign_keys = ON;');

    await this.db.migrate({
      migrationsPath: path.join(process.cwd(), 'migrations'),
    });
    LOGGER.info('Database initialized');
    return this;
  }

  async createCommit(commit: Commit): Promise<void> {
    await this.db.run('INSERT INTO commits (id, repo_id, sha, message , author_name, author_email, committed_at, url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', commit.id, commit.repoId, commit.sha, commit.message, commit.authorName, commit.authorEmail, commit.committedAt, commit.url,
    );
  }

  async listRepoCommit(repoId: string): Promise<Commit[]> {
    return await this.db.all<Commit[]>('SELECT * FROM commits WHERE repo_id=?', repoId);
  }

  async createPullRequest(pr: PullRequest): Promise<void> {
    await this.db.run('INSERT INTO pull_requests (id, repo_id, pr_number, title, author, body, merged_at, url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', pr.id, pr.repoId, pr.prNumber, pr.title, pr.author, pr.body, pr.mergedAt, pr.url,
    );
  }

  async listPullRequests(): Promise<PullRequest[]> {
    return await this.db.all<PullRequest[]>('SELECT * FROM pull_requests');
  }

  async listRepoPullRequests(repoId: string): Promise<PullRequest[]> {
    return await this.db.all<PullRequest[]>('SELECT * FROM pull_requests WHERE repo_id=?', repoId);
  }

  async createRepository(repository: Repository): Promise<void> {
    await this.db.run('INSERT INTO repositories (id, owner, name, last_synced_at) VALUES (?, ?, ?, ?)', repository.id, repository.name, repository.name, repository.lastSyncedAt,
    );
  }

  async listRepositories(): Promise<Repository[]> {
    return await this.db.all<Repository[]>('SELECT * FROM repositories');
  }
}
