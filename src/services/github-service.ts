import { Octokit } from '@octokit/rest';

import type { Commit, PullRequest, PullRequestState } from '../types';

import { serverEnv } from '../config';
import { GitHubError } from '../errors/github-error';
import { LOGGER } from '../logging';

/** Commit data as GitHub reports it, before it is tied to a stored repository. */
export type FetchedCommit = Omit<Commit, 'id' | 'repoId'>;
export type FetchedPullRequest = Omit<PullRequest, 'id' | 'repoId'>;

export interface RepositoryMetadata {
  owner: string;
  name: string;
  url: string;
  description: string | null;
  defaultBranch: string;
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

const octokit = new Octokit(
  serverEnv.githubToken ? { auth: serverEnv.githubToken } : {},
);

if (!serverEnv.githubToken) {
  LOGGER.warn(
    'GITHUB_TOKEN is not set — GitHub API calls are limited to 60 requests/hour. '
    + 'Set GITHUB_TOKEN to raise the limit to 5000/hour.',
  );
}

/** GitHub errors carry a numeric `status`; anything else is an unknown failure. */
function statusOf(error: unknown): number | undefined {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const { status } = error as { status: unknown };
    return typeof status === 'number' ? status : undefined;
  }
  return undefined;
}

function toGitHubError(error: unknown, context: string): GitHubError {
  const status = statusOf(error);

  if (status === 404)
    return new GitHubError(`${context} was not found on GitHub`, 404);

  if (status === 403 || status === 429) {
    return new GitHubError(
      `GitHub rate limit reached while reading ${context}. Set GITHUB_TOKEN to raise the limit.`,
      429,
    );
  }

  if (status === 401)
    return new GitHubError('GITHUB_TOKEN was rejected by GitHub', 401);

  LOGGER.error({ err: error }, `Unexpected GitHub failure for ${context}`);
  return new GitHubError(`Failed to read ${context} from GitHub`, 502);
}

function toEpochMillis(value: string | null | undefined): number | null {
  if (!value)
    return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export async function getRepositoryMetadata(owner: string, name: string): Promise<RepositoryMetadata> {
  try {
    const { data } = await octokit.repos.get({ owner, repo: name });
    return {
      owner: data.owner.login,
      name: data.name,
      url: data.html_url,
      description: data.description ?? null,
      defaultBranch: data.default_branch,
    };
  }
  catch (error) {
    throw toGitHubError(error, `repository ${owner}/${name}`);
  }
}

async function branchExists(owner: string, name: string, branch: string): Promise<boolean> {
  try {
    await octokit.repos.getBranch({ owner, repo: name, branch });
    return true;
  }
  catch (error) {
    if (statusOf(error) === 404)
      return false;
    throw toGitHubError(error, `branch ${branch} of ${owner}/${name}`);
  }
}

/**
 * Resolves which branch to read. The design syncs `develop`, but plenty of
 * repositories do not have one — those fall back to the default branch.
 */
export async function resolveSyncBranch(
  owner: string,
  name: string,
  defaultBranch: string,
  preferred: string = serverEnv.syncBranch,
): Promise<string> {
  if (preferred === defaultBranch)
    return defaultBranch;

  if (await branchExists(owner, name, preferred))
    return preferred;

  LOGGER.info(`${owner}/${name} has no '${preferred}' branch — syncing '${defaultBranch}' instead`);
  return defaultBranch;
}

export async function fetchCommits(
  owner: string,
  name: string,
  branch: string,
  since?: Date,
): Promise<FetchedCommit[]> {
  try {
    const commits = await octokit.paginate(octokit.repos.listCommits, {
      owner,
      repo: name,
      sha: branch,
      per_page: 100,
      ...(since ? { since: since.toISOString() } : {}),
    });

    return commits.map(commit => ({
      sha: commit.sha,
      message: commit.commit.message,
      authorName: commit.commit.author?.name ?? commit.author?.login ?? 'unknown',
      authorEmail: commit.commit.author?.email ?? '',
      committedAt: toEpochMillis(commit.commit.author?.date ?? commit.commit.committer?.date) ?? 0,
      url: commit.html_url,
      branch,
    }));
  }
  catch (error) {
    throw toGitHubError(error, `commits of ${owner}/${name}@${branch}`);
  }
}

function pullRequestState(pr: { state: string; merged_at: string | null }): PullRequestState {
  if (pr.merged_at)
    return 'merged';
  return pr.state === 'closed' ? 'closed' : 'open';
}

export async function fetchPullRequests(
  owner: string,
  name: string,
  base: string,
  since?: Date,
): Promise<FetchedPullRequest[]> {
  const cutoff = since?.getTime();
  const collected: FetchedPullRequest[] = [];

  try {
    // `pulls.list` has no server-side date filter, but it can sort by update
    // time. Walking pages by hand lets the sync stop at the first page that is
    // entirely older than the watermark instead of pulling the repository's
    // whole pull request history on every five-minute tick.
    const pages = octokit.paginate.iterator(octokit.pulls.list, {
      owner,
      repo: name,
      base,
      state: 'all',
      sort: 'updated',
      direction: 'desc',
      per_page: 100,
    });

    for await (const { data } of pages) {
      let reachedCutoff = false;

      for (const pr of data) {
        if (cutoff !== undefined && (toEpochMillis(pr.updated_at) ?? 0) < cutoff) {
          reachedCutoff = true;
          break;
        }

        collected.push({
          prNumber: pr.number,
          title: pr.title,
          author: pr.user?.login ?? 'unknown',
          body: pr.body ?? null,
          state: pullRequestState(pr),
          createdAt: toEpochMillis(pr.created_at) ?? 0,
          mergedAt: toEpochMillis(pr.merged_at),
          url: pr.html_url,
        });
      }

      if (reachedCutoff)
        break;
    }

    return collected;
  }
  catch (error) {
    throw toGitHubError(error, `pull requests of ${owner}/${name}`);
  }
}

export async function getUserRepos(username: string): Promise<UserRepository[]> {
  try {
    const { data } = await octokit.repos.listForUser({ username, per_page: 100 });

    return data.map(repo => ({
      owner: repo.owner.login,
      name: repo.name,
      url: repo.html_url,
      description: repo.description ?? null,
      defaultBranch: repo.default_branch ?? 'main',
      stars: repo.stargazers_count ?? 0,
      updatedAt: toEpochMillis(repo.updated_at),
    }));
  }
  catch (error) {
    throw toGitHubError(error, `repositories of user ${username}`);
  }
}
