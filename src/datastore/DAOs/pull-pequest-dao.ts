import type { PullRequest } from '../../types';

export interface PullRequestDao {
  createPullRequest: (pr: PullRequest) => Promise<void>;
  listPullRequests: () => Promise<PullRequest[]>;
  listRepoPullRequests: (repoId: string) => Promise<PullRequest[]>;
}
