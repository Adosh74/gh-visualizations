import crypto from 'node:crypto';

import type { Repository } from '../types';

import { serverEnv } from '../config';
import { getDb } from '../datastore/index-dao';
import { LOGGER } from '../logging';
import {
  fetchCommits,
  fetchPullRequests,
  getRepositoryMetadata,
  resolveSyncBranch,
} from './github-service';

export interface SyncResult {
  repoId: string;
  owner: string;
  name: string;
  branch: string;
  commits: number;
  pullRequests: number;
}

export interface SyncSummary {
  synced: SyncResult[];
  failed: { repoId: string; owner: string; name: string; error: string }[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Re-reads a minute either side of the watermark. Upserts are idempotent, so
 * a small overlap is free insurance against commits landing mid-sync.
 */
const WATERMARK_OVERLAP_MS = 60 * 1000;

function watermarkFor(repository: Repository, now: number): Date {
  if (repository.lastSyncedAt)
    return new Date(repository.lastSyncedAt - WATERMARK_OVERLAP_MS);

  return new Date(now - serverEnv.syncLookbackDays * DAY_MS);
}

/**
 * Pulls the latest commits and pull requests for one repository and stores
 * them. Safe to run repeatedly: rows are keyed on (repo, sha) and
 * (repo, pr number), so a repeat sync refreshes rather than duplicates.
 */
export async function syncRepository(repository: Repository): Promise<SyncResult> {
  const db = getDb();
  // Stamped before any network call so commits landing mid-sync are picked up
  // by the next run rather than skipped.
  const startedAt = Date.now();
  const since = watermarkFor(repository, startedAt);

  const metadata = await getRepositoryMetadata(repository.owner, repository.name);
  const branch = await resolveSyncBranch(repository.owner, repository.name, metadata.defaultBranch);

  const [commits, pullRequests] = await Promise.all([
    fetchCommits(repository.owner, repository.name, branch, since),
    fetchPullRequests(repository.owner, repository.name, branch, since),
  ]);

  for (const commit of commits) {
    await db.upsertCommit({ ...commit, id: crypto.randomUUID(), repoId: repository.id });
  }

  for (const pullRequest of pullRequests) {
    await db.upsertPullRequest({ ...pullRequest, id: crypto.randomUUID(), repoId: repository.id });
  }

  await db.updateRepositorySync(repository.id, {
    lastSyncedAt: startedAt,
    syncedBranch: branch,
    defaultBranch: metadata.defaultBranch,
    description: metadata.description,
  });

  LOGGER.info(
    `Synced ${repository.owner}/${repository.name}@${branch}: `
    + `${commits.length} commit(s), ${pullRequests.length} pull request(s)`,
  );

  return {
    repoId: repository.id,
    owner: repository.owner,
    name: repository.name,
    branch,
    commits: commits.length,
    pullRequests: pullRequests.length,
  };
}

/**
 * Syncs every tracked repository. Runs one at a time — GitHub rate limits are
 * per-token, so parallelism buys nothing — and one failing repository never
 * stops the rest.
 */
export async function syncAllRepositories(): Promise<SyncSummary> {
  const repositories = await getDb().listRepositories();
  const summary: SyncSummary = { synced: [], failed: [] };

  for (const repository of repositories) {
    try {
      summary.synced.push(await syncRepository(repository));
    }
    catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      LOGGER.error(
        { err: error },
        `Failed to sync ${repository.owner}/${repository.name}: ${message}`,
      );
      summary.failed.push({
        repoId: repository.id,
        owner: repository.owner,
        name: repository.name,
        error: message,
      });
    }
  }

  return summary;
}
