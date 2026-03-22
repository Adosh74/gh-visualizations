import type { Request, RequestHandler, Response } from 'express';

import crypto from 'node:crypto';

import type { Repository } from '../types';

import { getDb } from '../datastore/index-dao';

export const createRepository: RequestHandler = async (req: Request, res: Response) => {
  const repoData: Repository = {
    id: crypto.randomUUID(),
    name: req.body.name,
    owner: req.body.owner,
  };

  await getDb().createRepository(repoData);

  res.sendStatus(201);
};

export const listRepositories: RequestHandler = async (req: Request, res: Response) => {
  const repositories = await getDb().listRepositories();

  res.status(200).json({
    status: 'success',
    data: {
      repositories,
    },
  });
};
