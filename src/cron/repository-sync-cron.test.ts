import schedule from 'node-schedule';

import { serverEnv } from '../config';
import { syncAllRepositories } from '../services/sync-service';
import { runSyncTick, startRepositorySyncCron } from './repository-sync-cron';

jest.mock('node-schedule', () => ({
  __esModule: true,
  default: { scheduleJob: jest.fn(() => ({ cancel: jest.fn() })) },
}));
jest.mock('../services/sync-service', () => ({
  syncAllRepositories: jest.fn(),
}));

const mockScheduleJob = jest.mocked(schedule.scheduleJob);
const mockSyncAll = jest.mocked(syncAllRepositories);

describe('repositorySyncCron', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSyncAll.mockResolvedValue({ synced: [], failed: [] });
  });

  describe('startRepositorySyncCron', () => {
    it('schedules the sync on the configured expression', () => {
      startRepositorySyncCron();

      expect(mockScheduleJob).toHaveBeenCalledWith(serverEnv.syncCron, expect.any(Function));
    });

    it('runs the sync when the scheduled job fires', async () => {
      startRepositorySyncCron();

      const tick = mockScheduleJob.mock.calls[0][1] as () => Promise<void>;
      await tick();

      expect(mockSyncAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('runSyncTick', () => {
    it('skips a tick while the previous sync is still running', async () => {
      let release: () => void = () => {};
      mockSyncAll.mockReturnValueOnce(new Promise((resolve) => {
        release = () => resolve({ synced: [], failed: [] });
      }));

      const first = runSyncTick();
      await runSyncTick();

      expect(mockSyncAll).toHaveBeenCalledTimes(1);

      release();
      await first;
    });

    it('runs again once the previous sync has finished', async () => {
      await runSyncTick();
      await runSyncTick();

      expect(mockSyncAll).toHaveBeenCalledTimes(2);
    });

    it('swallows a sync failure so the schedule survives it', async () => {
      mockSyncAll.mockRejectedValueOnce(new Error('github is down'));

      await expect(runSyncTick()).resolves.toBeUndefined();

      await runSyncTick();
      expect(mockSyncAll).toHaveBeenCalledTimes(2);
    });
  });
});
