import type { Datastore } from '../index-dao';

import { DatabaseError } from '../../errors/database-error';
import {
  makeCommit,
  makePullRequest,
  makeRepository,
  setupTestDb,
  teardownTestDb,
} from '../../test/db-helper';

describe('sqlDatastore', () => {
  let db: Datastore;

  beforeEach(async () => {
    db = await setupTestDb();
  });

  afterEach(async () => {
    await teardownTestDb();
  });

  describe('repositories', () => {
    it('stores and reads back a repository with camelCase fields', async () => {
      const repo = makeRepository();
      await db.createRepository(repo);

      const stored = await db.getRepositoryById(repo.id);

      expect(stored).toMatchObject({
        id: repo.id,
        owner: repo.owner,
        name: repo.name,
        url: repo.url,
        defaultBranch: 'main',
      });
      // the row must not leak snake_case column names to API consumers
      expect(stored).not.toHaveProperty('default_branch');
      expect(stored).not.toHaveProperty('last_synced_at');
    });

    it('rejects a duplicate owner/name pair', async () => {
      await db.createRepository(makeRepository({ owner: 'a', name: 'b' }));

      await expect(db.createRepository(makeRepository({ owner: 'a', name: 'b' })))
        .rejects
        .toBeInstanceOf(DatabaseError);
    });

    it('finds a repository by owner and name', async () => {
      const repo = makeRepository({ owner: 'octocat', name: 'hello-world' });
      await db.createRepository(repo);

      await expect(db.getRepositoryByOwnerAndName('octocat', 'hello-world'))
        .resolves
        .toMatchObject({ id: repo.id });
      await expect(db.getRepositoryByOwnerAndName('octocat', 'nope'))
        .resolves
        .toBeUndefined();
    });

    it('records sync metadata without clobbering unset fields', async () => {
      const repo = makeRepository();
      await db.createRepository(repo);

      await db.updateRepositorySync(repo.id, {
        lastSyncedAt: 1_700_000_000_000,
        syncedBranch: 'develop',
      });

      const stored = await db.getRepositoryById(repo.id);
      expect(stored?.lastSyncedAt).toBe(1_700_000_000_000);
      expect(stored?.syncedBranch).toBe('develop');
      expect(stored?.defaultBranch).toBe('main');
    });

    it('cascades deletes to commits and pull requests', async () => {
      const repo = makeRepository();
      await db.createRepository(repo);
      await db.upsertCommit(makeCommit(repo.id));
      await db.upsertPullRequest(makePullRequest(repo.id));

      await db.deleteRepository(repo.id);

      await expect(db.getRepositoryById(repo.id)).resolves.toBeUndefined();
      await expect(db.countRepoCommits(repo.id)).resolves.toBe(0);
      await expect(db.countRepoPullRequests(repo.id)).resolves.toBe(0);
    });
  });

  describe('commits', () => {
    let repoId: string;

    beforeEach(async () => {
      const repo = makeRepository();
      await db.createRepository(repo);
      repoId = repo.id;
    });

    it('reads back a commit with camelCase fields', async () => {
      const commit = makeCommit(repoId, { sha: 'abc123' });
      await db.upsertCommit(commit);

      const [stored] = await db.listRepoCommits(repoId);

      expect(stored).toMatchObject({
        repoId,
        sha: 'abc123',
        authorName: commit.authorName,
        authorEmail: commit.authorEmail,
        committedAt: commit.committedAt,
        branch: 'develop',
      });
      expect(stored).not.toHaveProperty('author_name');
      expect(stored).not.toHaveProperty('repo_id');
    });

    it('is idempotent — re-syncing the same commits does not duplicate rows', async () => {
      const commits = [
        makeCommit(repoId, { sha: 'sha-1' }),
        makeCommit(repoId, { sha: 'sha-2' }),
      ];

      for (const commit of commits) await db.upsertCommit(commit);
      for (const commit of commits) await db.upsertCommit(commit);

      await expect(db.countRepoCommits(repoId)).resolves.toBe(2);
    });

    it('refreshes a commit in place when it is re-synced with new data', async () => {
      await db.upsertCommit(makeCommit(repoId, { sha: 'sha-1', message: 'old message' }));
      await db.upsertCommit(makeCommit(repoId, { sha: 'sha-1', message: 'amended message' }));

      const commits = await db.listRepoCommits(repoId);
      expect(commits).toHaveLength(1);
      expect(commits[0].message).toBe('amended message');
    });

    it('keeps the same sha for different repositories apart', async () => {
      const other = makeRepository({ owner: 'other', name: 'repo' });
      await db.createRepository(other);

      await db.upsertCommit(makeCommit(repoId, { sha: 'shared-sha' }));
      await db.upsertCommit(makeCommit(other.id, { sha: 'shared-sha' }));

      await expect(db.countRepoCommits(repoId)).resolves.toBe(1);
      await expect(db.countRepoCommits(other.id)).resolves.toBe(1);
    });

    it('lists newest first and honours limit and offset', async () => {
      await db.upsertCommit(makeCommit(repoId, { sha: 'old', committedAt: 1000 }));
      await db.upsertCommit(makeCommit(repoId, { sha: 'new', committedAt: 3000 }));
      await db.upsertCommit(makeCommit(repoId, { sha: 'mid', committedAt: 2000 }));

      const all = await db.listRepoCommits(repoId);
      expect(all.map(c => c.sha)).toEqual(['new', 'mid', 'old']);

      const paged = await db.listRepoCommits(repoId, { limit: 1, offset: 1 });
      expect(paged.map(c => c.sha)).toEqual(['mid']);
    });

    it('rejects a commit for a repository that does not exist', async () => {
      await expect(db.upsertCommit(makeCommit('missing-repo')))
        .rejects
        .toBeInstanceOf(DatabaseError);
    });

    it('counts commits across every repository', async () => {
      const other = makeRepository({ owner: 'other', name: 'repo' });
      await db.createRepository(other);
      await db.upsertCommit(makeCommit(repoId, { sha: 'a' }));
      await db.upsertCommit(makeCommit(other.id, { sha: 'b' }));

      await expect(db.countCommits()).resolves.toBe(2);
      await expect(db.countRepoCommits(repoId)).resolves.toBe(1);
    });

    it('groups commits per author, busiest first', async () => {
      await db.upsertCommit(makeCommit(repoId, { sha: 'a', authorName: 'Ada' }));
      await db.upsertCommit(makeCommit(repoId, { sha: 'b', authorName: 'Ada' }));
      await db.upsertCommit(makeCommit(repoId, { sha: 'c', authorName: 'Linus' }));

      await expect(db.commitsPerAuthor(repoId)).resolves.toEqual([
        { author: 'Ada', count: 2 },
        { author: 'Linus', count: 1 },
      ]);
    });

    it('buckets commits per day and ignores anything older than the window', async () => {
      const day = 24 * 60 * 60 * 1000;
      const now = Date.now();

      await db.upsertCommit(makeCommit(repoId, { sha: 'today-1', committedAt: now }));
      await db.upsertCommit(makeCommit(repoId, { sha: 'today-2', committedAt: now - 1000 }));
      await db.upsertCommit(makeCommit(repoId, { sha: 'ancient', committedAt: now - 90 * day }));

      const series = await db.commitsPerDay(repoId, 7);

      expect(series).toHaveLength(1);
      expect(series[0].count).toBe(2);
      expect(series[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('pull requests', () => {
    let repoId: string;

    beforeEach(async () => {
      const repo = makeRepository();
      await db.createRepository(repo);
      repoId = repo.id;
    });

    it('reads back a pull request with camelCase fields', async () => {
      const pr = makePullRequest(repoId, { prNumber: 7 });
      await db.upsertPullRequest(pr);

      const [stored] = await db.listRepoPullRequests(repoId);

      expect(stored).toMatchObject({
        repoId,
        prNumber: 7,
        state: 'merged',
        createdAt: pr.createdAt,
        mergedAt: pr.mergedAt,
      });
      expect(stored).not.toHaveProperty('pr_number');
    });

    it('stores an open pull request with a null mergedAt', async () => {
      await db.upsertPullRequest(makePullRequest(repoId, { state: 'open', mergedAt: null }));

      const [stored] = await db.listRepoPullRequests(repoId);
      expect(stored.state).toBe('open');
      expect(stored.mergedAt).toBeNull();
    });

    it('is idempotent and updates state on re-sync', async () => {
      await db.upsertPullRequest(makePullRequest(repoId, { prNumber: 1, state: 'open', mergedAt: null }));
      await db.upsertPullRequest(makePullRequest(repoId, { prNumber: 1, state: 'merged', mergedAt: 5000 }));

      const prs = await db.listRepoPullRequests(repoId);
      expect(prs).toHaveLength(1);
      expect(prs[0]).toMatchObject({ state: 'merged', mergedAt: 5000 });
    });

    it('counts pull requests across every repository', async () => {
      const other = makeRepository({ owner: 'other', name: 'repo' });
      await db.createRepository(other);
      await db.upsertPullRequest(makePullRequest(repoId, { prNumber: 1 }));
      await db.upsertPullRequest(makePullRequest(other.id, { prNumber: 1 }));

      await expect(db.countPullRequests()).resolves.toBe(2);
      await expect(db.countRepoPullRequests(repoId)).resolves.toBe(1);
    });

    it('groups pull requests per author', async () => {
      await db.upsertPullRequest(makePullRequest(repoId, { prNumber: 1, author: 'Ada' }));
      await db.upsertPullRequest(makePullRequest(repoId, { prNumber: 2, author: 'Ada' }));
      await db.upsertPullRequest(makePullRequest(repoId, { prNumber: 3, author: 'Linus' }));

      await expect(db.pullRequestsPerAuthor(repoId)).resolves.toEqual([
        { author: 'Ada', count: 2 },
        { author: 'Linus', count: 1 },
      ]);
    });
  });
});
