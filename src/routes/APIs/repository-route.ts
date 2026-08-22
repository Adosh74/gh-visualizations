import { Router } from 'express';

import { listRepositoryCommits } from '../../handlers/commit-handlers';
import { listRepositoryPullRequests } from '../../handlers/pull-request-handlers';
import {
  createRepository,
  deleteRepository,
  getRepository,
  listRepositories,
  syncRepositoryNow,
} from '../../handlers/repository-handlers';
import { getRepositoryStats } from '../../handlers/stats-handlers';

const routes = Router();

routes.route('/')
  .get(listRepositories)
  .post(createRepository);

routes.route('/:id')
  .get(getRepository)
  .delete(deleteRepository);

routes.post('/:id/sync', syncRepositoryNow);
routes.get('/:id/commits', listRepositoryCommits);
routes.get('/:id/pull-requests', listRepositoryPullRequests);
routes.get('/:id/stats', getRepositoryStats);

export { routes as repositoriesRoutes };
