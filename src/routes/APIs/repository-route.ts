import { Router } from 'express';

import { createRepository, listRepositories } from '../../handlers/repository-handlers';

const routes = Router();

routes.route('/').post(createRepository).get(listRepositories);

export { routes as repositoriesRoutes };
