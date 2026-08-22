import { Router } from 'express';

import { listUserRepositories } from '../../handlers/github-handlers';

const routes = Router();

routes.get('/users/:username/repos', listUserRepositories);

export { routes as githubRoutes };
