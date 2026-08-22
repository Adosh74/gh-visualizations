import type { Repository } from '../../types';

export interface RepositorySyncUpdate {
  lastSyncedAt: number;
  syncedBranch?: string | null;
  defaultBranch?: string | null;
  description?: string | null;
}

export interface RepositoryDao {
  createRepository: (repository: Repository) => Promise<void>;
  listRepositories: () => Promise<Repository[]>;
  getRepositoryById: (id: string) => Promise<Repository | undefined>;
  getRepositoryByOwnerAndName: (owner: string, name: string) => Promise<Repository | undefined>;
  deleteRepository: (id: string) => Promise<void>;
  updateRepositorySync: (id: string, update: RepositorySyncUpdate) => Promise<void>;
}
