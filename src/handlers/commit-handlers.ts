import type { Request, RequestHandler, Response } from 'express';

import { getDb } from '../datastore/index-dao';
import { parseListOptions } from '../utils/parse-list-options';
import { requireRepository } from './repository-handlers';

export const listRepositoryCommits: RequestHandler = async (req: Request, res: Response) => {
  const repository = await requireRepository(req.params.id);
  const options = parseListOptions(req);

  const [commits, total] = await Promise.all([
    getDb().listRepoCommits(repository.id, options),
    getDb().countRepoCommits(repository.id),
  ]);

  res.status(200).json({
    status: 'success',
    data: { commits, total },
  });
};

/** The cross-repository activity feed the dashboard opens on. */
export const listRecentCommits: RequestHandler = async (req: Request, res: Response) => {
  // `total` counts every stored commit, not the size of this page — otherwise
  // a client cannot tell a full page from the end of the list.
  const [commits, total] = await Promise.all([
    getDb().listRecentCommits(parseListOptions(req)),
    getDb().countCommits(),
  ]);

  res.status(200).json({
    status: 'success',
    data: { commits, total },
  });
};
