import { Router } from 'express';

import { commitsRoutes } from './APIs/commit-route';
import { githubRoutes } from './APIs/github-route';
import { pullRequestsRoutes } from './APIs/pull-request-route';
import { repositoriesRoutes } from './APIs/repository-route';

const routes = Router();

routes.use('/repositories', repositoriesRoutes);
routes.use('/commits', commitsRoutes);
routes.use('/pull-requests', pullRequestsRoutes);
routes.use('/github', githubRoutes);

export { routes as APIs };
