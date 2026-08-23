/**
 * Mirrors the server's domain types in `src/types.ts`. Deliberately duplicated:
 * the client is a standalone package and reaching across the server's rootDir
 * would couple the two builds. Keep the two files in step.
 */

export interface Repository {
  id: string;
  owner: string;
  name: string;
  url: string;
  description?: string | null;
  defaultBranch?: string | null;
  syncedBranch?: string | null;
  lastSyncedAt?: number | null;
}

export interface Commit {
  id: string;
  repoId: string;
  sha: string;
  message: string;
  authorName: string;
  authorEmail: string;
  committedAt: number;
  url: string;
  branch?: string | null;
}

export type PullRequestState = 'open' | 'closed' | 'merged';

export interface PullRequest {
  id: string;
  repoId: string;
  prNumber: number;
  title: string;
  author: string;
  body?: string | null;
  state: PullRequestState;
  createdAt: number;
  mergedAt?: number | null;
  url: string;
}

export interface TimeSeriesPoint {
  date: string;
  count: number;
}

export interface AuthorStat {
  author: string;
  count: number;
}

export interface RepositoryStats {
  repoId: string;
  totalCommits: number;
  totalPullRequests: number;
  commitsPerDay: TimeSeriesPoint[];
  commitsPerAuthor: AuthorStat[];
  pullRequestsPerAuthor: AuthorStat[];
}

export interface UserRepository {
  owner: string;
  name: string;
  url: string;
  description: string | null;
  defaultBranch: string;
  stars: number;
  updatedAt: number | null;
}

export interface SyncResult {
  repoId: string;
  owner: string;
  name: string;
  branch: string;
  commits: number;
  pullRequests: number;
}
