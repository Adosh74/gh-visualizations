import type { AuthorStat, PullRequest } from '../../types';
import type { ListOptions } from './commit-dao';

export interface PullRequestDao {
  /** Inserts a pull request, or refreshes it when (repo_id, pr_number) is already stored. */
  upsertPullRequest: (pr: PullRequest) => Promise<void>;
  listPullRequests: (options?: ListOptions) => Promise<PullRequest[]>;
  listRepoPullRequests: (repoId: string, options?: ListOptions) => Promise<PullRequest[]>;
  countRepoPullRequests: (repoId: string) => Promise<number>;
  countPullRequests: () => Promise<number>;
  pullRequestsPerAuthor: (repoId: string) => Promise<AuthorStat[]>;
}
