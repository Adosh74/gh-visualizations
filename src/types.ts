export interface Repository {
  id: string;
  owner: string;
  name: string;
  lastSyncedAt?: number;
  url: string;
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
};

export interface PullRequest {
  id: string;
  repoId: string;
  prNumber: string;
  title: string;
  author: string;
  body: string;
  mergedAt: number;
  url: string;
};
