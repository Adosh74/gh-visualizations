import type { Request, RequestHandler, Response } from 'express';

import type { RepositoryStats } from '../types';

import { getDb } from '../datastore/index-dao';
import { fillTimeSeries } from '../utils/fill-time-series';
import { parseDays } from '../utils/parse-list-options';
import { requireRepository } from './repository-handlers';

const DEFAULT_WINDOW_DAYS = 30;

/** Everything the charts on the dashboard need, in one round trip. */
export const getRepositoryStats: RequestHandler = async (req: Request, res: Response) => {
  const repository = await requireRepository(req.params.id);
  const days = parseDays(req, DEFAULT_WINDOW_DAYS);
  const db = getDb();

  const [totalCommits, totalPullRequests, commitsPerDay, commitsPerAuthor, pullRequestsPerAuthor]
    = await Promise.all([
      db.countRepoCommits(repository.id),
      db.countRepoPullRequests(repository.id),
      db.commitsPerDay(repository.id, days),
      db.commitsPerAuthor(repository.id),
      db.pullRequestsPerAuthor(repository.id),
    ]);

  const stats: RepositoryStats = {
    repoId: repository.id,
    totalCommits,
    totalPullRequests,
    commitsPerDay: fillTimeSeries(commitsPerDay, days),
    commitsPerAuthor,
    pullRequestsPerAuthor,
  };

  res.status(200).json({
    status: 'success',
    data: { stats },
  });
};
