import { useState } from 'react';

import type { Repository } from '../types';

import { getStats, listCommits, listPullRequests, syncRepository } from '../api/client';
import { useAsync } from '../hooks/use-async';
import { relativeTime } from '../utils/format';
import { AuthorBarChart } from './author-bar-chart';
import { CommitFeed } from './commit-feed';
import { CommitsPerDayChart } from './commits-per-day-chart';
import { PullRequestFeed } from './pull-request-feed';
import { StatTile } from './stat-tile';

interface Props {
  repository: Repository;
  onSynced: () => void;
}

const WINDOWS = [7, 30, 90];

export function RepositoryDashboard({ repository, onSynced }: Props) {
  const [days, setDays] = useState(30);
  const [tab, setTab] = useState<'commits' | 'pulls'>('commits');
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string>();

  const stats = useAsync(() => getStats(repository.id, days), [repository.id, days]);
  const commits = useAsync(() => listCommits(repository.id), [repository.id]);
  const pulls = useAsync(() => listPullRequests(repository.id), [repository.id]);

  async function refresh() {
    setSyncing(true);
    setSyncError(undefined);
    try {
      await syncRepository(repository.id);
      stats.reload();
      commits.reload();
      pulls.reload();
      onSynced();
    }
    catch (error) {
      setSyncError((error as Error).message);
    }
    finally {
      setSyncing(false);
    }
  }

  const loadError = stats.error ?? commits.error ?? pulls.error;

  return (
    <>
      <section className="panel">
        <div className="app__header" style={{ padding: 0 }}>
          <div>
            <h2 className="app__title">
              {repository.owner}
              /
              {repository.name}
            </h2>
            <p className="app__subtitle">
              {repository.description ?? 'No description'}
              {' · syncing '}
              <strong>{repository.syncedBranch ?? repository.defaultBranch ?? 'default branch'}</strong>
              {repository.lastSyncedAt
                ? ` · last synced ${relativeTime(repository.lastSyncedAt)}`
                : ' · not synced yet'}
            </p>
          </div>
          <button
            type="button"
            className="button"
            disabled={syncing}
            onClick={() => void refresh()}
          >
            {syncing ? 'Syncing…' : 'Sync now'}
          </button>
        </div>
        {syncError ? <p className="message message--error" role="alert">{syncError}</p> : null}
      </section>

      {loadError ? <p className="message message--error" role="alert">{loadError}</p> : null}

      <div className="stats">
        <StatTile label="Commits" value={stats.data?.stats.totalCommits ?? '—'} />
        <StatTile label="Pull requests" value={stats.data?.stats.totalPullRequests ?? '—'} />
        <StatTile
          label="Contributors"
          value={stats.data?.stats.commitsPerAuthor.length ?? '—'}
          hint="by commit author"
        />
        <StatTile
          label="Branch"
          value={repository.syncedBranch ?? repository.defaultBranch ?? '—'}
        />
      </div>

      <section className="panel">
        <div className="tabs" role="group" aria-label="Chart window">
          <h3 className="panel__title" style={{ margin: '0 8px 0 0', alignSelf: 'center' }}>
            Commits per day
          </h3>
          {WINDOWS.map(window => (
            <button
              key={window}
              type="button"
              className="tab"
              aria-selected={window === days}
              onClick={() => setDays(window)}
            >
              {window}
              d
            </button>
          ))}
        </div>
        <p className="chart__caption">
          Daily commit count on the synced branch, including days with none.
        </p>
        {stats.data
          ? <CommitsPerDayChart data={stats.data.stats.commitsPerDay} days={days} />
          : <p className="empty">{stats.loading ? 'Loading…' : 'No data yet.'}</p>}
      </section>

      <div className="charts">
        <section className="panel">
          <h3 className="panel__title">Commits per author</h3>
          <AuthorBarChart
            data={stats.data?.stats.commitsPerAuthor ?? []}
            series="commits"
            unit="commit"
            emptyMessage="No commits synced yet."
          />
        </section>
        <section className="panel">
          <h3 className="panel__title">Pull requests per author</h3>
          <AuthorBarChart
            data={stats.data?.stats.pullRequestsPerAuthor ?? []}
            series="pulls"
            unit="pull request"
            emptyMessage="No pull requests synced yet."
          />
        </section>
      </div>

      <section className="panel">
        <div className="tabs" role="tablist" aria-label="Changes">
          <button
            type="button"
            role="tab"
            className="tab"
            aria-selected={tab === 'commits'}
            onClick={() => setTab('commits')}
          >
            Commits
            {commits.data ? ` (${commits.data.total})` : ''}
          </button>
          <button
            type="button"
            role="tab"
            className="tab"
            aria-selected={tab === 'pulls'}
            onClick={() => setTab('pulls')}
          >
            Pull requests
            {pulls.data ? ` (${pulls.data.total})` : ''}
          </button>
        </div>

        {tab === 'commits'
          ? <CommitFeed commits={commits.data?.commits ?? []} />
          : <PullRequestFeed pullRequests={pulls.data?.pullRequests ?? []} />}
      </section>
    </>
  );
}
