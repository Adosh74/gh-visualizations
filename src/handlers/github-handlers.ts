import type { Request, RequestHandler, Response } from 'express';

import { getUserRepos } from '../services/github-service';

/** Backs the "select repositories" picker: what a GitHub user has to offer. */
export const listUserRepositories: RequestHandler = async (req: Request, res: Response) => {
  const repositories = await getUserRepos(req.params.username);

  res.status(200).json({
    status: 'success',
    data: { repositories, total: repositories.length },
  });
};
