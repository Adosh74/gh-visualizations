import schedule from 'node-schedule';

import { serverEnv } from '../config';
import { LOGGER } from '../logging';
import { syncAllRepositories } from '../services/sync-service';

let running = false;

/**
 * Runs one sync pass, skipping the tick if the previous one is still in
 * flight — a slow sync over many repositories can outlast its own interval.
 */
export async function runSyncTick(): Promise<void> {
  if (running) {
    LOGGER.warn('Repository sync is still running — skipping this tick');
    return;
  }

  running = true;
  try {
    const { synced, failed } = await syncAllRepositories();
    LOGGER.info(`Repository sync finished: ${synced.length} synced, ${failed.length} failed`);
  }
  catch (error) {
    LOGGER.error({ err: error }, 'Repository sync failed');
  }
  finally {
    running = false;
  }
}

/**
 * Starts the background sync. Call this from the server entrypoint only —
 * importing it into the Express app would leave an open handle under test.
 */
export function startRepositorySyncCron(): schedule.Job | undefined {
  if (!serverEnv.syncEnabled) {
    LOGGER.info('Repository sync cron is disabled (SYNC_ENABLED=false)');
    return undefined;
  }

  LOGGER.info(`Scheduling repository sync with cron '${serverEnv.syncCron}'`);
  return schedule.scheduleJob(serverEnv.syncCron, runSyncTick);
}
