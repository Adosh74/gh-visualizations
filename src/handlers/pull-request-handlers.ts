import type { Request, RequestHandler, Response } from 'express';

import { getDb } from '../datastore/index-dao';
import { parseListOptions } from '../utils/parse-list-options';
import { requireRepository } from './repository-handlers';

export const listRepositoryPullRequests: RequestHandler = async (req: Request, res: Response) => {
  const repository = await requireRepository(req.params.id);
  const options = parseListOptions(req);

  const [pullRequests, total] = await Promise.all([
    getDb().listRepoPullRequests(repository.id, options),
    getDb().countRepoPullRequests(repository.id),
  ]);

  res.status(200).json({
    status: 'success',
    data: { pullRequests, total },
  });
};

export const listAllPullRequests: RequestHandler = async (req: Request, res: Response) => {
  const [pullRequests, total] = await Promise.all([
    getDb().listPullRequests(parseListOptions(req)),
    getDb().countPullRequests(),
  ]);

  res.status(200).json({
    status: 'success',
    data: { pullRequests, total },
  });
};
