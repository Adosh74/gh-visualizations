import crypto from 'node:crypto';

import type { Commit, PullRequest, Repository } from '../types';

import { closeDb, getDb, initDb } from '../datastore/index-dao';

/** Opens a throwaway in-memory database with all migrations applied. */
export async function setupTestDb() {
  await initDb(':memory:');
  return getDb();
}

export async function teardownTestDb() {
  await closeDb();
}

export function makeRepository(overrides: Partial<Repository> = {}): Repository {
  const name = overrides.name ?? 'gh-visualizations';
  const owner = overrides.owner ?? 'Adosh74';
  return {
    id: crypto.randomUUID(),
    owner,
    name,
    url: `https://github.com/${owner}/${name}`,
    description: 'a test repository',
    defaultBranch: 'main',
    ...overrides,
  };
}

export function makeCommit(repoId: string, overrides: Partial<Commit> = {}): Commit {
  const sha = overrides.sha ?? crypto.randomBytes(20).toString('hex');
  return {
    id: crypto.randomUUID(),
    repoId,
    sha,
    message: 'feat: add a thing',
    authorName: 'Mohamed Shebl',
    authorEmail: 'mohamedshebla@gmail.com',
    committedAt: Date.parse('2026-08-20T10:00:00Z'),
    url: `https://github.com/Adosh74/gh-visualizations/commit/${sha}`,
    branch: 'develop',
    ...overrides,
  };
}

export function makePullRequest(repoId: string, overrides: Partial<PullRequest> = {}): PullRequest {
  const prNumber = overrides.prNumber ?? 1;
  return {
    id: crypto.randomUUID(),
    repoId,
    prNumber,
    title: 'feat: add a thing',
    author: 'Adosh74',
    body: 'describes the change',
    state: 'merged',
    createdAt: Date.parse('2026-08-19T10:00:00Z'),
    mergedAt: Date.parse('2026-08-20T10:00:00Z'),
    url: `https://github.com/Adosh74/gh-visualizations/pull/${prNumber}`,
    ...overrides,
  };
}
