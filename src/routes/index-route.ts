import { Router } from 'express';

import { repositoriesRoutes } from './APIs/repository-route';

const routes = Router();

routes.use('/repositories', repositoriesRoutes);

export { routes as APIs };
