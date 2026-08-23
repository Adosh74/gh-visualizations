import type { AuthorStat, Commit, TimeSeriesPoint } from '../../types';

export interface ListOptions {
  limit?: number;
  offset?: number;
}

export interface CommitDao {
  /** Inserts a commit, or refreshes it when (repo_id, sha) is already stored. */
  upsertCommit: (commit: Commit) => Promise<void>;
  listRepoCommits: (repoId: string, options?: ListOptions) => Promise<Commit[]>;
  listRecentCommits: (options?: ListOptions) => Promise<Commit[]>;
  countRepoCommits: (repoId: string) => Promise<number>;
  countCommits: () => Promise<number>;
  commitsPerDay: (repoId: string, days: number) => Promise<TimeSeriesPoint[]>;
  commitsPerAuthor: (repoId: string) => Promise<AuthorStat[]>;
}
