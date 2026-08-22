import { Router } from 'express';

import { listRecentCommits } from '../../handlers/commit-handlers';

const routes = Router();

routes.get('/', listRecentCommits);

export { routes as commitsRoutes };
