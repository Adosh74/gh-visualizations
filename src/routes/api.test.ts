import request from 'supertest';

import type { Datastore } from '../datastore/index-dao';

import { app } from '../app';
import { GitHubError } from '../errors/github-error';
import { getRepositoryMetadata, getUserRepos } from '../services/github-service';
import { syncRepository } from '../services/sync-service';
import {
  makeCommit,
  makePullRequest,
  makeRepository,
  setupTestDb,
  teardownTestDb,
} from '../test/db-helper';

jest.mock('../services/github-service', () => ({
  getRepositoryMetadata: jest.fn(),
  getUserRepos: jest.fn(),
}));
jest.mock('../services/sync-service', () => ({
  syncRepository: jest.fn(),
}));

const mockGetRepositoryMetadata = jest.mocked(getRepositoryMetadata);
const mockGetUserRepos = jest.mocked(getUserRepos);
const mockSyncRepository = jest.mocked(syncRepository);

const API = '/api/v1';

describe('aPI', () => {
  let db: Datastore;

  beforeEach(async () => {
    db = await setupTestDb();
    jest.clearAllMocks();

    mockGetRepositoryMetadata.mockResolvedValue({
      owner: 'Adosh74',
      name: 'gh-visualizations',
      url: 'https://github.com/Adosh74/gh-visualizations',
      description: 'a repo',
      defaultBranch: 'main',
    });
    mockSyncRepository.mockResolvedValue({
      repoId: 'x',
      owner: 'Adosh74',
      name: 'gh-visualizations',
      branch: 'develop',
      commits: 0,
      pullRequests: 0,
    });
  });

  afterEach(async () => {
    await teardownTestDb();
  });

  async function trackedRepository(overrides = {}) {
    const repo = makeRepository(overrides);
    await db.createRepository(repo);
    return repo;
  }

  describe('pOST /repositories', () => {
    it('verifies the repository against GitHub and stores what GitHub reports', async () => {
      const response = await request(app)
        .post(`${API}/repositories`)
        .send({ owner: 'adosh74', name: 'gh-visualizations' });

      expect(response.status).toBe(201);
      expect(response.body.data.repository).toMatchObject({
        owner: 'Adosh74',
        name: 'gh-visualizations',
        url: 'https://github.com/Adosh74/gh-visualizations',
        defaultBranch: 'main',
      });
      expect(response.body.data.repository.id).toEqual(expect.any(String));
    });

    it('accepts a GitHub url instead of owner and name', async () => {
      const response = await request(app)
        .post(`${API}/repositories`)
        .send({ url: 'https://github.com/Adosh74/gh-visualizations' });

      expect(response.status).toBe(201);
      expect(mockGetRepositoryMetadata).toHaveBeenCalledWith('Adosh74', 'gh-visualizations');
    });

    it('syncs immediately so the dashboard is not empty until the next cron tick', async () => {
      await request(app).post(`${API}/repositories`).send({ owner: 'a', name: 'b' });

      expect(mockSyncRepository).toHaveBeenCalledTimes(1);
    });

    it('still tracks the repository when the first sync fails', async () => {
      mockSyncRepository.mockRejectedValue(new GitHubError('rate limited', 429));

      const response = await request(app)
        .post(`${API}/repositories`)
        .send({ owner: 'a', name: 'b' });

      expect(response.status).toBe(201);
      await expect(db.listRepositories()).resolves.toHaveLength(1);
    });

    it('rejects a request with neither owner/name nor url', async () => {
      const response = await request(app).post(`${API}/repositories`).send({ owner: 'a' });

      expect(response.status).toBe(400);
      expect(response.body.errors[0].message).toContain('Provide either');
      expect(mockGetRepositoryMetadata).not.toHaveBeenCalled();
    });

    it('answers 404 when GitHub does not know the repository', async () => {
      mockGetRepositoryMetadata.mockRejectedValue(
        new GitHubError('repository ghost/nope was not found on GitHub', 404),
      );

      const response = await request(app)
        .post(`${API}/repositories`)
        .send({ owner: 'ghost', name: 'nope' });

      expect(response.status).toBe(404);
      expect(response.body.errors[0].message).toContain('not found');
    });

    it('rejects a repository that is already tracked', async () => {
      await trackedRepository({ owner: 'Adosh74', name: 'gh-visualizations' });

      const response = await request(app)
        .post(`${API}/repositories`)
        .send({ owner: 'Adosh74', name: 'gh-visualizations' });

      expect(response.status).toBe(400);
      expect(response.body.errors[0].message).toContain('already tracked');
    });

    it('surfaces a database constraint breach as a 400, not a 500 or a hang', async () => {
      // slips past the duplicate check because the lookup is case-sensitive but
      // the unique index collates the same way — the DB is the last line of defence
      await trackedRepository({ owner: 'Adosh74', name: 'gh-visualizations' });
      mockGetRepositoryMetadata.mockResolvedValue({
        owner: 'Adosh74',
        name: 'gh-visualizations',
        url: 'https://github.com/Adosh74/gh-visualizations',
        description: null,
        defaultBranch: 'main',
      });

      const response = await request(app)
        .post(`${API}/repositories`)
        .send({ owner: 'adosh74', name: 'GH-Visualizations' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('gET /repositories', () => {
    it('returns the tracked repositories with a total', async () => {
      await trackedRepository({ owner: 'a', name: 'one' });
      await trackedRepository({ owner: 'b', name: 'two' });

      const response = await request(app).get(`${API}/repositories`);

      expect(response.status).toBe(200);
      expect(response.body.data.total).toBe(2);
      expect(response.body.data.repositories).toHaveLength(2);
    });

    it('returns an empty list rather than an error when nothing is tracked', async () => {
      const response = await request(app).get(`${API}/repositories`);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual({ repositories: [], total: 0 });
    });
  });

  describe('gET /repositories/:id', () => {
    it('returns the repository', async () => {
      const repo = await trackedRepository();

      const response = await request(app).get(`${API}/repositories/${repo.id}`);

      expect(response.status).toBe(200);
      expect(response.body.data.repository.id).toBe(repo.id);
    });

    it('answers 404 for an unknown id', async () => {
      const response = await request(app).get(`${API}/repositories/does-not-exist`);

      expect(response.status).toBe(404);
      expect(response.body.errors[0].message).toContain('not found');
    });
  });

  describe('dELETE /repositories/:id', () => {
    it('removes the repository and its data', async () => {
      const repo = await trackedRepository();
      await db.upsertCommit(makeCommit(repo.id));

      const response = await request(app).delete(`${API}/repositories/${repo.id}`);

      expect(response.status).toBe(204);
      await expect(db.listRepositories()).resolves.toHaveLength(0);
      await expect(db.countRepoCommits(repo.id)).resolves.toBe(0);
    });

    it('answers 404 for an unknown id', async () => {
      const response = await request(app).delete(`${API}/repositories/nope`);

      expect(response.status).toBe(404);
    });
  });

  describe('pOST /repositories/:id/sync', () => {
    it('runs a sync on demand and returns the outcome', async () => {
      const repo = await trackedRepository();

      const response = await request(app).post(`${API}/repositories/${repo.id}/sync`);

      expect(response.status).toBe(200);
      expect(response.body.data.sync).toMatchObject({ branch: 'develop' });
      expect(mockSyncRepository).toHaveBeenCalledWith(expect.objectContaining({ id: repo.id }));
    });

    it('propagates a sync failure with its own status code', async () => {
      const repo = await trackedRepository();
      mockSyncRepository.mockRejectedValue(new GitHubError('rate limited', 429));

      const response = await request(app).post(`${API}/repositories/${repo.id}/sync`);

      expect(response.status).toBe(429);
      expect(response.body.errors[0].message).toContain('rate limited');
    });
  });

  describe('gET /repositories/:id/commits', () => {
    it('returns commits newest first with the full total', async () => {
      const repo = await trackedRepository();
      await db.upsertCommit(makeCommit(repo.id, { sha: 'old', committedAt: 1000 }));
      await db.upsertCommit(makeCommit(repo.id, { sha: 'new', committedAt: 2000 }));

      const response = await request(app).get(`${API}/repositories/${repo.id}/commits`);

      expect(response.status).toBe(200);
      expect(response.body.data.commits.map((c: { sha: string }) => c.sha)).toEqual(['new', 'old']);
      expect(response.body.data.total).toBe(2);
    });

    it('paginates while still reporting the untruncated total', async () => {
      const repo = await trackedRepository();
      await db.upsertCommit(makeCommit(repo.id, { sha: 'a', committedAt: 1000 }));
      await db.upsertCommit(makeCommit(repo.id, { sha: 'b', committedAt: 2000 }));

      const response = await request(app)
        .get(`${API}/repositories/${repo.id}/commits`)
        .query({ limit: 1 });

      expect(response.body.data.commits).toHaveLength(1);
      expect(response.body.data.total).toBe(2);
    });

    it('rejects a nonsensical limit', async () => {
      const repo = await trackedRepository();

      const response = await request(app)
        .get(`${API}/repositories/${repo.id}/commits`)
        .query({ limit: 'lots' });

      expect(response.status).toBe(400);
      expect(response.body.errors[0].field).toBe('limit');
    });

    it('answers 404 for an unknown repository', async () => {
      const response = await request(app).get(`${API}/repositories/nope/commits`);

      expect(response.status).toBe(404);
    });
  });

  describe('gET /repositories/:id/pull-requests', () => {
    it('returns pull requests with their author and body', async () => {
      const repo = await trackedRepository();
      await db.upsertPullRequest(makePullRequest(repo.id, { prNumber: 3, author: 'ada' }));

      const response = await request(app).get(`${API}/repositories/${repo.id}/pull-requests`);

      expect(response.status).toBe(200);
      expect(response.body.data.pullRequests[0]).toMatchObject({
        prNumber: 3,
        author: 'ada',
        body: 'describes the change',
        state: 'merged',
      });
    });
  });

  describe('gET /repositories/:id/stats', () => {
    it('returns a dense daily series padded with zeros', async () => {
      const repo = await trackedRepository();
      await db.upsertCommit(makeCommit(repo.id, { sha: 'today', committedAt: Date.now() }));

      const response = await request(app)
        .get(`${API}/repositories/${repo.id}/stats`)
        .query({ days: 7 });

      expect(response.status).toBe(200);
      const { commitsPerDay } = response.body.data.stats;
      expect(commitsPerDay).toHaveLength(7);
      expect(commitsPerDay.at(-1).count).toBe(1);
      expect(commitsPerDay.slice(0, 6).every((p: { count: number }) => p.count === 0)).toBe(true);
    });

    it('aggregates totals and per-author breakdowns', async () => {
      const repo = await trackedRepository();
      await db.upsertCommit(makeCommit(repo.id, { sha: 'a', authorName: 'Ada' }));
      await db.upsertCommit(makeCommit(repo.id, { sha: 'b', authorName: 'Ada' }));
      await db.upsertCommit(makeCommit(repo.id, { sha: 'c', authorName: 'Linus' }));
      await db.upsertPullRequest(makePullRequest(repo.id, { prNumber: 1, author: 'ada' }));

      const response = await request(app).get(`${API}/repositories/${repo.id}/stats`);

      expect(response.body.data.stats).toMatchObject({
        repoId: repo.id,
        totalCommits: 3,
        totalPullRequests: 1,
        commitsPerAuthor: [{ author: 'Ada', count: 2 }, { author: 'Linus', count: 1 }],
        pullRequestsPerAuthor: [{ author: 'ada', count: 1 }],
      });
      expect(response.body.data.stats.commitsPerDay).toHaveLength(30);
    });

    it('rejects an out-of-range window', async () => {
      const repo = await trackedRepository();

      const response = await request(app)
        .get(`${API}/repositories/${repo.id}/stats`)
        .query({ days: 4000 });

      expect(response.status).toBe(400);
      expect(response.body.errors[0].field).toBe('days');
    });
  });

  describe('cross-repository feeds', () => {
    it('returns recent commits across every tracked repository', async () => {
      const one = await trackedRepository({ owner: 'a', name: 'one' });
      const two = await trackedRepository({ owner: 'b', name: 'two' });
      await db.upsertCommit(makeCommit(one.id, { sha: 'older', committedAt: 1000 }));
      await db.upsertCommit(makeCommit(two.id, { sha: 'newer', committedAt: 2000 }));

      const response = await request(app).get(`${API}/commits`);

      expect(response.status).toBe(200);
      expect(response.body.data.commits.map((c: { sha: string }) => c.sha)).toEqual(['newer', 'older']);
    });

    it('returns pull requests across every tracked repository', async () => {
      const repo = await trackedRepository();
      await db.upsertPullRequest(makePullRequest(repo.id, { prNumber: 1 }));

      const response = await request(app).get(`${API}/pull-requests`);

      expect(response.status).toBe(200);
      expect(response.body.data.pullRequests).toHaveLength(1);
    });
  });

  describe('gET /github/users/:username/repos', () => {
    it('lists what a GitHub user has available to track', async () => {
      mockGetUserRepos.mockResolvedValue([{
        owner: 'Adosh74',
        name: 'gh-visualizations',
        url: 'https://github.com/Adosh74/gh-visualizations',
        description: null,
        defaultBranch: 'main',
        stars: 3,
        updatedAt: 1000,
      }]);

      const response = await request(app).get(`${API}/github/users/Adosh74/repos`);

      expect(response.status).toBe(200);
      expect(response.body.data.repositories).toHaveLength(1);
      expect(response.body.data.total).toBe(1);
    });

    it('answers 404 for a user GitHub does not know', async () => {
      mockGetUserRepos.mockRejectedValue(new GitHubError('user ghost was not found', 404));

      const response = await request(app).get(`${API}/github/users/ghost/repos`);

      expect(response.status).toBe(404);
    });
  });

  describe('cORS', () => {
    it('advertises the allowed origin so a separate client can call the API', async () => {
      const response = await request(app).get(`${API}/repositories`);

      expect(response.headers['access-control-allow-origin']).toBe('*');
    });
  });
});
