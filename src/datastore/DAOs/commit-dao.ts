import type { Commit } from '../../types';

export interface CommitDao {
  createCommit: (commit: Commit) => Promise<void>;
  listRepoCommit: (repoId: string) => Promise<Commit[]>;
}
