import type { Request, RequestHandler, Response } from 'express';

import crypto from 'node:crypto';

import type { Repository } from '../types';

import { getDb } from '../datastore/index-dao';
import { BadRequest } from '../errors/bad-request-error';
import { NotFound } from '../errors/not-found-error';
import { LOGGER } from '../logging';
import { getRepositoryMetadata } from '../services/github-service';
import { syncRepository } from '../services/sync-service';

/** Accepts `owner` + `name`, or a full GitHub URL / `owner/name` slug. */
function parseRepositoryInput(body: unknown): { owner: string; name: string } {
  const input = (body ?? {}) as Record<string, unknown>;

  if (typeof input.owner === 'string' && typeof input.name === 'string') {
    const owner = input.owner.trim();
    const name = input.name.trim();
    if (owner && name)
      return { owner, name };
  }

  const slug = typeof input.url === 'string' ? input.url.trim() : '';
  const match = slug.match(/^(?:https?:\/\/github\.com\/)?([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/);
  if (match)
    return { owner: match[1], name: match[2] };

  throw new BadRequest(
    'Provide either `owner` and `name`, or a `url` such as https://github.com/owner/name',
  );
}

async function requireRepository(id: string): Promise<Repository> {
  const repository = await getDb().getRepositoryById(id);
  if (!repository)
    throw new NotFound(`Repository ${id} not found`);

  return repository;
}

/**
 * Adds a repository to track. The owner/name pair is verified against GitHub
 * so a typo fails here rather than syncing nothing forever, and a first sync
 * runs immediately so the dashboard is not empty until the next cron tick.
 */
export const createRepository: RequestHandler = async (req: Request, res: Response) => {
  const { owner, name } = parseRepositoryInput(req.body);

  const existing = await getDb().getRepositoryByOwnerAndName(owner, name);
  if (existing)
    throw new BadRequest(`${owner}/${name} is already tracked`);

  const metadata = await getRepositoryMetadata(owner, name);

  const repository: Repository = {
    id: crypto.randomUUID(),
    owner: metadata.owner,
    name: metadata.name,
    url: metadata.url,
    description: metadata.description,
    defaultBranch: metadata.defaultBranch,
  };

  await getDb().createRepository(repository);

  try {
    await syncRepository(repository);
  }
  catch (error) {
    // The repository is tracked either way — the cron will retry.
    LOGGER.error({ err: error }, `Initial sync of ${owner}/${name} failed`);
  }

  res.status(201).json({
    status: 'success',
    data: { repository: await getDb().getRepositoryById(repository.id) },
  });
};

export const listRepositories: RequestHandler = async (_req: Request, res: Response) => {
  const repositories = await getDb().listRepositories();

  res.status(200).json({
    status: 'success',
    data: { repositories, total: repositories.length },
  });
};

export const getRepository: RequestHandler = async (req: Request, res: Response) => {
  const repository = await requireRepository(req.params.id);

  res.status(200).json({
    status: 'success',
    data: { repository },
  });
};

export const deleteRepository: RequestHandler = async (req: Request, res: Response) => {
  await requireRepository(req.params.id);
  await getDb().deleteRepository(req.params.id);

  res.sendStatus(204);
};

/** Forces a sync outside the cron schedule, so the client can offer a refresh. */
export const syncRepositoryNow: RequestHandler = async (req: Request, res: Response) => {
  const repository = await requireRepository(req.params.id);
  const result = await syncRepository(repository);

  res.status(200).json({
    status: 'success',
    data: {
      sync: result,
      repository: await getDb().getRepositoryById(repository.id),
    },
  });
};

export { requireRepository };
