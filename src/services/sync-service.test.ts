import type { Datastore } from '../datastore/index-dao';
import type { FetchedCommit, FetchedPullRequest } from './github-service';

import { GitHubError } from '../errors/github-error';
import { makeRepository, setupTestDb, teardownTestDb } from '../test/db-helper';
import {
  fetchCommits,
  fetchPullRequests,
  getRepositoryMetadata,
  resolveSyncBranch,
} from './github-service';
import { syncAllRepositories, syncRepository } from './sync-service';

// An explicit factory rather than an automock: automocking would still load the
// real module, and @octokit/rest ships ESM that ts-jest does not transform.
jest.mock('./github-service', () => ({
  getRepositoryMetadata: jest.fn(),
  resolveSyncBranch: jest.fn(),
  fetchCommits: jest.fn(),
  fetchPullRequests: jest.fn(),
}));

const mockGetRepositoryMetadata = jest.mocked(getRepositoryMetadata);
const mockResolveSyncBranch = jest.mocked(resolveSyncBranch);
const mockFetchCommits = jest.mocked(fetchCommits);
const mockFetchPullRequests = jest.mocked(fetchPullRequests);

function fetchedCommit(sha: string, overrides: Partial<FetchedCommit> = {}): FetchedCommit {
  return {
    sha,
    message: 'feat: a change',
    authorName: 'Ada',
    authorEmail: 'ada@example.com',
    committedAt: Date.parse('2026-08-20T10:00:00Z'),
    url: `https://github.com/o/r/commit/${sha}`,
    branch: 'develop',
    ...overrides,
  };
}

function fetchedPull(prNumber: number, overrides: Partial<FetchedPullRequest> = {}): FetchedPullRequest {
  return {
    prNumber,
    title: 'feat: a change',
    author: 'ada',
    body: 'describes the change',
    state: 'merged',
    createdAt: Date.parse('2026-08-19T10:00:00Z'),
    mergedAt: Date.parse('2026-08-20T10:00:00Z'),
    url: `https://github.com/o/r/pull/${prNumber}`,
    ...overrides,
  };
}

describe('syncService', () => {
  let db: Datastore;

  beforeEach(async () => {
    db = await setupTestDb();
    jest.clearAllMocks();

    mockGetRepositoryMetadata.mockResolvedValue({
      owner: 'Adosh74',
      name: 'gh-visualizations',
      url: 'https://github.com/Adosh74/gh-visualizations',
      description: 'synced description',
      defaultBranch: 'main',
    });
    mockResolveSyncBranch.mockResolvedValue('develop');
    mockFetchCommits.mockResolvedValue([]);
    mockFetchPullRequests.mockResolvedValue([]);
  });

  afterEach(async () => {
    await teardownTestDb();
  });

  async function trackedRepository() {
    const repo = makeRepository();
    await db.createRepository(repo);
    return repo;
  }

  describe('syncRepository', () => {
    it('stores the fetched commits and pull requests', async () => {
      const repo = await trackedRepository();
      mockFetchCommits.mockResolvedValue([fetchedCommit('sha-1'), fetchedCommit('sha-2')]);
      mockFetchPullRequests.mockResolvedValue([fetchedPull(1)]);

      const result = await syncRepository(repo);

      expect(result).toMatchObject({ branch: 'develop', commits: 2, pullRequests: 1 });
      await expect(db.countRepoCommits(repo.id)).resolves.toBe(2);
      await expect(db.countRepoPullRequests(repo.id)).resolves.toBe(1);
    });

    it('does not duplicate rows when the same window is synced twice', async () => {
      const repo = await trackedRepository();
      mockFetchCommits.mockResolvedValue([fetchedCommit('sha-1'), fetchedCommit('sha-2')]);
      mockFetchPullRequests.mockResolvedValue([fetchedPull(1)]);

      await syncRepository(repo);
      const afterFirst = await db.getRepositoryById(repo.id);
      await syncRepository(afterFirst!);

      await expect(db.countRepoCommits(repo.id)).resolves.toBe(2);
      await expect(db.countRepoPullRequests(repo.id)).resolves.toBe(1);
    });

    it('records the sync watermark, the branch read, and upstream metadata', async () => {
      const repo = await trackedRepository();
      const before = Date.now();

      await syncRepository(repo);

      const stored = await db.getRepositoryById(repo.id);
      expect(stored?.syncedBranch).toBe('develop');
      expect(stored?.defaultBranch).toBe('main');
      expect(stored?.description).toBe('synced description');
      expect(stored?.lastSyncedAt).toBeGreaterThanOrEqual(before);
      expect(stored?.lastSyncedAt).toBeLessThanOrEqual(Date.now());
    });

    it('reaches back by the configured lookback on a first sync', async () => {
      const repo = await trackedRepository();

      await syncRepository(repo);

      const since = mockFetchCommits.mock.calls[0][3] as Date;
      const daysAgo = (Date.now() - since.getTime()) / (24 * 60 * 60 * 1000);
      expect(daysAgo).toBeCloseTo(90, 0);
    });

    it('reads only since the previous watermark on a later sync', async () => {
      const lastSyncedAt = Date.parse('2026-08-20T10:00:00Z');
      const repo = await trackedRepository();
      await db.updateRepositorySync(repo.id, { lastSyncedAt });

      await syncRepository((await db.getRepositoryById(repo.id))!);

      const since = mockFetchCommits.mock.calls[0][3] as Date;
      // a one minute overlap guards against commits landing mid-sync
      expect(since.getTime()).toBe(lastSyncedAt - 60_000);
      expect(mockFetchPullRequests.mock.calls[0][3]).toEqual(since);
    });

    it('syncs the branch that was resolved, not the configured preference', async () => {
      const repo = await trackedRepository();
      mockResolveSyncBranch.mockResolvedValue('main');
      mockFetchCommits.mockResolvedValue([fetchedCommit('sha-1', { branch: 'main' })]);

      await syncRepository(repo);

      expect(mockFetchCommits).toHaveBeenCalledWith(repo.owner, repo.name, 'main', expect.any(Date));
      expect(mockFetchPullRequests).toHaveBeenCalledWith(repo.owner, repo.name, 'main', expect.any(Date));
      const [commit] = await db.listRepoCommits(repo.id);
      expect(commit.branch).toBe('main');
    });

    it('leaves the watermark untouched when the fetch fails', async () => {
      const repo = await trackedRepository();
      mockFetchCommits.mockRejectedValue(new GitHubError('rate limited', 429));

      await expect(syncRepository(repo)).rejects.toBeInstanceOf(GitHubError);

      const stored = await db.getRepositoryById(repo.id);
      expect(stored?.lastSyncedAt).toBeFalsy();
    });
  });

  describe('syncAllRepositories', () => {
    it('reports nothing to do when no repositories are tracked', async () => {
      await expect(syncAllRepositories()).resolves.toEqual({ synced: [], failed: [] });
    });

    it('syncs every tracked repository', async () => {
      await db.createRepository(makeRepository({ owner: 'a', name: 'one' }));
      await db.createRepository(makeRepository({ owner: 'b', name: 'two' }));

      const summary = await syncAllRepositories();

      expect(summary.synced).toHaveLength(2);
      expect(summary.failed).toHaveLength(0);
    });

    it('keeps going when one repository fails, and reports it', async () => {
      await db.createRepository(makeRepository({ owner: 'a', name: 'one' }));
      await db.createRepository(makeRepository({ owner: 'b', name: 'two' }));
      mockGetRepositoryMetadata
        .mockRejectedValueOnce(new GitHubError('repository a/one was not found on GitHub', 404));

      const summary = await syncAllRepositories();

      expect(summary.synced.map(r => r.name)).toEqual(['two']);
      expect(summary.failed).toHaveLength(1);
      expect(summary.failed[0]).toMatchObject({ name: 'one' });
      expect(summary.failed[0].error).toContain('not found');
    });
  });
});
