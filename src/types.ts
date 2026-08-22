export interface Repository {
  id: string;
  owner: string;
  name: string;
  url: string;
  description?: string | null;
  defaultBranch?: string | null;
  syncedBranch?: string | null;
  lastSyncedAt?: number | null;
};

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
};

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
};

/** A single bucket of a daily activity chart, e.g. `{ date: '2026-08-22', count: 4 }`. */
export interface TimeSeriesPoint {
  date: string;
  count: number;
};

export interface AuthorStat {
  author: string;
  count: number;
};

export interface RepositoryStats {
  repoId: string;
  totalCommits: number;
  totalPullRequests: number;
  commitsPerDay: TimeSeriesPoint[];
  commitsPerAuthor: AuthorStat[];
  pullRequestsPerAuthor: AuthorStat[];
};
