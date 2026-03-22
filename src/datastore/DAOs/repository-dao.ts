import type { Repository } from '../../types';

export interface RepositoryDao {
  createRepository: (repository: Repository) => Promise<void>;
  listRepositories: () => Promise<Repository[]>;
}
