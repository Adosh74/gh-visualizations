import os from 'node:os';

import { app } from './app';
import { serverEnv } from './config';
import { startRepositorySyncCron } from './cron/repository-sync-cron';
import { initDb } from './datastore/index-dao';
import { LOGGER } from './logging';

const port = serverEnv.port;
const hostname = os.hostname();

(async () => {
  try {
    await initDb();

    startRepositorySyncCron();

    app.listen(port, () => {
      LOGGER.info(`Hostname: ${hostname}`);

      LOGGER.info(`server running on port ${port} in ${serverEnv.nodeEnv} mode`);
    });
  }
  catch (error) {
    LOGGER.error(error);
  }
})();
