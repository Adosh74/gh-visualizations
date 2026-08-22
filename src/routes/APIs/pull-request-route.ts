import { Router } from 'express';

import { listAllPullRequests } from '../../handlers/pull-request-handlers';

const routes = Router();

routes.get('/', listAllPullRequests);

export { routes as pullRequestsRoutes };
