import type {
  Commit,
  PullRequest,
  Repository,
  RepositoryStats,
  SyncResult,
  UserRepository,
} from '../types';

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1';

/** Carries the server's own message so the UI can show it verbatim. */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public field?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ErrorBody {
  errors?: { message?: string; field?: string }[];
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    });
  }
  catch {
    throw new ApiError('Could not reach the gh-visualizations server.', 0);
  }

  if (response.status === 204)
    return undefined as T;

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const [firstError] = (payload as ErrorBody | null)?.errors ?? [];
    throw new ApiError(
      firstError?.message ?? `Request failed with status ${response.status}`,
      response.status,
      firstError?.field,
    );
  }

  return (payload as { data: T }).data;
}

export function listRepositories() {
  return request<{ repositories: Repository[]; total: number }>('/repositories');
}

export function addRepository(input: { owner: string; name: string } | { url: string }) {
  return request<{ repository: Repository }>('/repositories', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function deleteRepository(id: string) {
  return request<void>(`/repositories/${id}`, { method: 'DELETE' });
}

export function syncRepository(id: string) {
  return request<{ sync: SyncResult; repository: Repository }>(
    `/repositories/${id}/sync`,
    { method: 'POST' },
  );
}

export function listCommits(repoId: string, limit = 50) {
  return request<{ commits: Commit[]; total: number }>(
    `/repositories/${repoId}/commits?limit=${limit}`,
  );
}

export function listPullRequests(repoId: string, limit = 50) {
  return request<{ pullRequests: PullRequest[]; total: number }>(
    `/repositories/${repoId}/pull-requests?limit=${limit}`,
  );
}

export function getStats(repoId: string, days = 30) {
  return request<{ stats: RepositoryStats }>(`/repositories/${repoId}/stats?days=${days}`);
}

export function listUserRepositories(username: string) {
  return request<{ repositories: UserRepository[]; total: number }>(
    `/github/users/${encodeURIComponent(username)}/repos`,
  );
}
