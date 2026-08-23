import type { Commit, PullRequest, Repository, RepositoryStats } from '../types';

export function makeRepository(overrides: Partial<Repository> = {}): Repository {
  return {
    id: 'repo-1',
    owner: 'Adosh74',
    name: 'gh-visualizations',
    url: 'https://github.com/Adosh74/gh-visualizations',
    description: 'a test repository',
    defaultBranch: 'main',
    syncedBranch: 'develop',
    lastSyncedAt: Date.now(),
    ...overrides,
  };
}

export function makeCommit(overrides: Partial<Commit> = {}): Commit {
  return {
    id: 'commit-1',
    repoId: 'repo-1',
    sha: 'abc1234567890',
    message: 'feat: add the thing\n\nExplains why the thing was added.',
    authorName: 'Ada Lovelace',
    authorEmail: 'ada@example.com',
    committedAt: Date.now() - 3600_000,
    url: 'https://github.com/Adosh74/gh-visualizations/commit/abc1234',
    branch: 'develop',
    ...overrides,
  };
}

export function makePullRequest(overrides: Partial<PullRequest> = {}): PullRequest {
  return {
    id: 'pr-1',
    repoId: 'repo-1',
    prNumber: 7,
    title: 'feat: add the thing',
    author: 'ada',
    body: 'Describes the change in detail.',
    state: 'merged',
    createdAt: Date.now() - 7200_000,
    mergedAt: Date.now() - 3600_000,
    url: 'https://github.com/Adosh74/gh-visualizations/pull/7',
    ...overrides,
  };
}

export function makeStats(overrides: Partial<RepositoryStats> = {}): RepositoryStats {
  return {
    repoId: 'repo-1',
    totalCommits: 3,
    totalPullRequests: 1,
    commitsPerDay: [
      { date: '2026-08-20', count: 0 },
      { date: '2026-08-21', count: 2 },
      { date: '2026-08-22', count: 1 },
    ],
    commitsPerAuthor: [
      { author: 'Ada Lovelace', count: 2 },
      { author: 'Linus', count: 1 },
    ],
    pullRequestsPerAuthor: [{ author: 'ada', count: 1 }],
    ...overrides,
  };
}
