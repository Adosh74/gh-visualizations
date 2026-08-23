import { GitHubError } from '../errors/github-error';
import {
  fetchCommits,
  fetchPullRequests,
  getRepositoryMetadata,
  getUserRepos,
  resolveSyncBranch,
} from './github-service';

// This suite drives Octokit directly, so it replaces the inert manual mock in
// src/__mocks__ with a factory it controls. The instance is built inside the
// factory because `jest.mock` is hoisted above the imports and so cannot close
// over a `const` declared here.
jest.mock('@octokit/rest', () => {
  const instance = {
    paginate: jest.fn(),
    repos: {
      get: jest.fn(),
      getBranch: jest.fn(),
      listCommits: jest.fn(),
      listForUser: jest.fn(),
    },
    pulls: {
      list: jest.fn(),
    },
  };
  const instanceWithIterator = Object.assign(instance, {
    paginate: Object.assign(instance.paginate, { iterator: jest.fn() }),
  });
  return { Octokit: jest.fn(() => instanceWithIterator), __instance: instanceWithIterator };
});

const mockOctokit = (jest.requireMock('@octokit/rest') as { __instance: {
  paginate: jest.Mock & { iterator: jest.Mock };
  repos: { get: jest.Mock; getBranch: jest.Mock; listCommits: jest.Mock; listForUser: jest.Mock };
  pulls: { list: jest.Mock };
}; }).__instance;

/** Stands in for octokit's page iterator, one `{ data }` chunk per page. */
function pagesOf(...pages: Record<string, unknown>[][]) {
  return {
    async* [Symbol.asyncIterator]() {
      for (const data of pages) yield { data };
    },
  };
}

/** Mimics an Octokit RequestError, which carries a numeric `status`. */
function httpError(status: number) {
  return Object.assign(new Error(`HTTP ${status}`), { status });
}

function rawCommit(overrides: Record<string, unknown> = {}) {
  return {
    sha: 'abc123',
    html_url: 'https://github.com/o/r/commit/abc123',
    commit: {
      message: 'feat: a change',
      author: { name: 'Ada', email: 'ada@example.com', date: '2026-08-20T10:00:00Z' },
      committer: { name: 'Ada', email: 'ada@example.com', date: '2026-08-20T10:00:00Z' },
    },
    author: { login: 'ada' },
    ...overrides,
  };
}

function rawPull(overrides: Record<string, unknown> = {}) {
  return {
    number: 7,
    title: 'feat: a change',
    body: 'describes the change',
    state: 'closed',
    created_at: '2026-08-19T10:00:00Z',
    updated_at: '2026-08-20T10:00:00Z',
    merged_at: '2026-08-20T10:00:00Z',
    html_url: 'https://github.com/o/r/pull/7',
    user: { login: 'ada' },
    ...overrides,
  };
}

describe('githubService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getRepositoryMetadata', () => {
    it('maps the GitHub payload onto the domain shape', async () => {
      mockOctokit.repos.get.mockResolvedValue({
        data: {
          owner: { login: 'Adosh74' },
          name: 'gh-visualizations',
          html_url: 'https://github.com/Adosh74/gh-visualizations',
          description: 'a repo',
          default_branch: 'main',
        },
      });

      await expect(getRepositoryMetadata('Adosh74', 'gh-visualizations')).resolves.toEqual({
        owner: 'Adosh74',
        name: 'gh-visualizations',
        url: 'https://github.com/Adosh74/gh-visualizations',
        description: 'a repo',
        defaultBranch: 'main',
      });
    });

    it('turns a 404 into a 404 GitHubError', async () => {
      mockOctokit.repos.get.mockRejectedValue(httpError(404));

      await expect(getRepositoryMetadata('nope', 'nope')).rejects.toMatchObject({
        statusCode: 404,
      });
      await expect(getRepositoryMetadata('nope', 'nope')).rejects.toBeInstanceOf(GitHubError);
    });

    it('reports an exhausted rate limit as a 429', async () => {
      mockOctokit.repos.get.mockRejectedValue(httpError(403));

      await expect(getRepositoryMetadata('o', 'r')).rejects.toMatchObject({ statusCode: 429 });
    });

    it('reports an unexpected upstream failure as a 502', async () => {
      mockOctokit.repos.get.mockRejectedValue(new Error('socket hang up'));

      await expect(getRepositoryMetadata('o', 'r')).rejects.toMatchObject({ statusCode: 502 });
    });
  });

  describe('resolveSyncBranch', () => {
    it('uses the preferred branch when it exists', async () => {
      mockOctokit.repos.getBranch.mockResolvedValue({ data: {} });

      await expect(resolveSyncBranch('o', 'r', 'main', 'develop')).resolves.toBe('develop');
    });

    it('falls back to the default branch when the preferred one is missing', async () => {
      mockOctokit.repos.getBranch.mockRejectedValue(httpError(404));

      await expect(resolveSyncBranch('o', 'r', 'main', 'develop')).resolves.toBe('main');
    });

    it('skips the lookup entirely when the branches match', async () => {
      await expect(resolveSyncBranch('o', 'r', 'develop', 'develop')).resolves.toBe('develop');
      expect(mockOctokit.repos.getBranch).not.toHaveBeenCalled();
    });

    it('propagates a non-404 failure instead of silently falling back', async () => {
      mockOctokit.repos.getBranch.mockRejectedValue(httpError(403));

      await expect(resolveSyncBranch('o', 'r', 'main', 'develop')).rejects.toBeInstanceOf(GitHubError);
    });
  });

  describe('fetchCommits', () => {
    it('maps commits and stamps the branch that was read', async () => {
      mockOctokit.paginate.mockResolvedValue([rawCommit()]);

      const commits = await fetchCommits('o', 'r', 'develop');

      expect(commits).toEqual([{
        sha: 'abc123',
        message: 'feat: a change',
        authorName: 'Ada',
        authorEmail: 'ada@example.com',
        committedAt: Date.parse('2026-08-20T10:00:00Z'),
        url: 'https://github.com/o/r/commit/abc123',
        branch: 'develop',
      }]);
    });

    it('asks GitHub only for commits after the watermark', async () => {
      mockOctokit.paginate.mockResolvedValue([]);
      const since = new Date('2026-08-01T00:00:00Z');

      await fetchCommits('o', 'r', 'develop', since);

      expect(mockOctokit.paginate).toHaveBeenCalledWith(
        mockOctokit.repos.listCommits,
        expect.objectContaining({ sha: 'develop', since: since.toISOString() }),
      );
    });

    it('omits the since filter on a first sync', async () => {
      mockOctokit.paginate.mockResolvedValue([]);

      await fetchCommits('o', 'r', 'develop');

      expect(mockOctokit.paginate.mock.calls[0][1]).not.toHaveProperty('since');
    });

    it('falls back to the account login when the commit has no author name', async () => {
      mockOctokit.paginate.mockResolvedValue([
        rawCommit({ commit: { message: 'm', author: null, committer: { date: '2026-08-20T10:00:00Z' } } }),
      ]);

      const [commit] = await fetchCommits('o', 'r', 'develop');

      expect(commit.authorName).toBe('ada');
      expect(commit.authorEmail).toBe('');
      expect(commit.committedAt).toBe(Date.parse('2026-08-20T10:00:00Z'));
    });
  });

  describe('fetchPullRequests', () => {
    it('marks a pull request with a merged_at as merged', async () => {
      mockOctokit.paginate.iterator.mockReturnValue(pagesOf([rawPull()]));

      const [pr] = await fetchPullRequests('o', 'r', 'develop');

      expect(pr).toEqual({
        prNumber: 7,
        title: 'feat: a change',
        author: 'ada',
        body: 'describes the change',
        state: 'merged',
        createdAt: Date.parse('2026-08-19T10:00:00Z'),
        mergedAt: Date.parse('2026-08-20T10:00:00Z'),
        url: 'https://github.com/o/r/pull/7',
      });
    });

    it('distinguishes open from closed-without-merge', async () => {
      mockOctokit.paginate.iterator.mockReturnValue(pagesOf([
        rawPull({ number: 1, state: 'open', merged_at: null }),
        rawPull({ number: 2, state: 'closed', merged_at: null }),
      ]));

      const prs = await fetchPullRequests('o', 'r', 'develop');

      expect(prs.map(pr => pr.state)).toEqual(['open', 'closed']);
      expect(prs.every(pr => pr.mergedAt === null)).toBe(true);
    });

    it('drops pull requests not updated since the watermark', async () => {
      mockOctokit.paginate.iterator.mockReturnValue(pagesOf([
        rawPull({ number: 1, updated_at: '2026-08-20T10:00:00Z' }),
        rawPull({ number: 2, updated_at: '2026-07-01T10:00:00Z' }),
      ]));

      const prs = await fetchPullRequests('o', 'r', 'develop', new Date('2026-08-01T00:00:00Z'));

      expect(prs.map(pr => pr.prNumber)).toEqual([1]);
    });

    it('stops paginating once a page falls behind the watermark', async () => {
      const secondPage = jest.fn();
      mockOctokit.paginate.iterator.mockReturnValue({
        async* [Symbol.asyncIterator]() {
          yield {
            data: [
              rawPull({ number: 1, updated_at: '2026-08-20T10:00:00Z' }),
              rawPull({ number: 2, updated_at: '2026-07-01T10:00:00Z' }),
            ],
          };
          // Reaching here means the sync walked the whole history anyway.
          secondPage();
          yield { data: [rawPull({ number: 3, updated_at: '2026-06-01T10:00:00Z' })] };
        },
      });

      const prs = await fetchPullRequests('o', 'r', 'develop', new Date('2026-08-01T00:00:00Z'));

      expect(prs.map(pr => pr.prNumber)).toEqual([1]);
      expect(secondPage).not.toHaveBeenCalled();
    });

    it('walks every page on a first sync, when there is no watermark', async () => {
      mockOctokit.paginate.iterator.mockReturnValue(pagesOf(
        [rawPull({ number: 1, updated_at: '2026-08-20T10:00:00Z' })],
        [rawPull({ number: 2, updated_at: '2025-01-01T10:00:00Z' })],
      ));

      const prs = await fetchPullRequests('o', 'r', 'develop');

      expect(prs.map(pr => pr.prNumber)).toEqual([1, 2]);
    });

    it('scopes the query to the synced base branch, newest first', async () => {
      mockOctokit.paginate.iterator.mockReturnValue(pagesOf([]));

      await fetchPullRequests('o', 'r', 'develop');

      expect(mockOctokit.paginate.iterator).toHaveBeenCalledWith(
        mockOctokit.pulls.list,
        expect.objectContaining({
          base: 'develop',
          state: 'all',
          sort: 'updated',
          direction: 'desc',
        }),
      );
    });

    it('surfaces a failure part-way through the walk', async () => {
      mockOctokit.paginate.iterator.mockReturnValue({
        async* [Symbol.asyncIterator]() {
          yield { data: [rawPull()] };
          throw httpError(403);
        },
      });

      await expect(fetchPullRequests('o', 'r', 'develop')).rejects.toMatchObject({
        statusCode: 429,
      });
    });
  });

  describe('getUserRepos', () => {
    it('maps the listing onto the picker shape', async () => {
      mockOctokit.repos.listForUser.mockResolvedValue({
        data: [{
          owner: { login: 'Adosh74' },
          name: 'gh-visualizations',
          html_url: 'https://github.com/Adosh74/gh-visualizations',
          description: null,
          default_branch: 'main',
          stargazers_count: 3,
          updated_at: '2026-08-20T10:00:00Z',
        }],
      });

      await expect(getUserRepos('Adosh74')).resolves.toEqual([{
        owner: 'Adosh74',
        name: 'gh-visualizations',
        url: 'https://github.com/Adosh74/gh-visualizations',
        description: null,
        defaultBranch: 'main',
        stars: 3,
        updatedAt: Date.parse('2026-08-20T10:00:00Z'),
      }]);
    });

    it('surfaces a missing user as a 404', async () => {
      mockOctokit.repos.listForUser.mockRejectedValue(httpError(404));

      await expect(getUserRepos('ghost')).rejects.toMatchObject({ statusCode: 404 });
    });
  });
});
