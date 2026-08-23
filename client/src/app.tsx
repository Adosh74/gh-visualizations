import { useState } from 'react';

import { deleteRepository, listRepositories } from './api/client';
import { AddRepositoryForm } from './components/add-repository-form';
import { RepositoryDashboard } from './components/repository-dashboard';
import { RepositoryList } from './components/repository-list';
import { ThemeToggle } from './components/theme-toggle';
import { useAsync } from './hooks/use-async';

export function App() {
  const [selectedId, setSelectedId] = useState<string>();
  const [deletingId, setDeletingId] = useState<string>();
  const [actionError, setActionError] = useState<string>();

  const repositories = useAsync(() => listRepositories(), []);
  const tracked = repositories.data?.repositories ?? [];

  // Derived rather than synced through an effect: `selectedId` records only an
  // explicit choice, and falling back to the first entry covers both the first
  // load and a selection that has since been deleted.
  const selected = tracked.find(repository => repository.id === selectedId) ?? tracked[0];

  async function removeRepository(id: string) {
    setDeletingId(id);
    setActionError(undefined);
    try {
      await deleteRepository(id);
      repositories.reload();
    }
    catch (error) {
      setActionError((error as Error).message);
    }
    finally {
      setDeletingId(undefined);
    }
  }

  return (
    <div className="app">
      <header className="app__header">
        <div>
          <h1 className="app__title">gh-visualizations</h1>
          <p className="app__subtitle">
            Commits and pull requests from the repositories you track, kept in step by a
            background sync.
          </p>
        </div>
        <ThemeToggle />
      </header>

      <aside className="sidebar">
        <section className="panel">
          <h2 className="panel__title">Repositories</h2>
          {repositories.error
            ? <p className="message message--error" role="alert">{repositories.error}</p>
            : null}
          {actionError
            ? <p className="message message--error" role="alert">{actionError}</p>
            : null}
          {repositories.loading && !repositories.data
            ? <p className="empty">Loading…</p>
            : (
                <RepositoryList
                  repositories={tracked}
                  selectedId={selected?.id}
                  busyId={deletingId}
                  onSelect={setSelectedId}
                  onDelete={repository => void removeRepository(repository.id)}
                />
              )}
        </section>

        <section className="panel">
          <h2 className="panel__title">Track a repository</h2>
          <AddRepositoryForm onAdded={() => repositories.reload()} />
        </section>
      </aside>

      <main className="main">
        {selected
          ? (
              <RepositoryDashboard
                key={selected.id}
                repository={selected}
                onSynced={() => repositories.reload()}
              />
            )
          : (
              <section className="panel">
                <h2 className="panel__title">Nothing selected</h2>
                <p className="empty">
                  Track a repository to see its commits, pull requests and activity charts.
                </p>
              </section>
            )}
      </main>
    </div>
  );
}
