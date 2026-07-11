import schedule from 'node-schedule';

import { LOGGER } from '../logging';

// run every 5 minutes
export function startRepositorySyncCron() {
  schedule.scheduleJob('*/5 * * * *', async () => {
    LOGGER.info(`Running repository sync cron job at ${new Date().toISOString()}`);
    // fetch all repositories
    // get commits in last 5 minutes and update their data
  });
}
