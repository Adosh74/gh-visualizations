import type { Repository } from '../types';

interface Props {
  repositories: Repository[];
  selectedId: string | undefined;
  onSelect: (id: string) => void;
  onDelete: (repository: Repository) => void;
  busyId?: string;
}

/** Design item 4: pick which of the tracked repositories the dashboard shows. */
export function RepositoryList({ repositories, selectedId, onSelect, onDelete, busyId }: Props) {
  if (repositories.length === 0)
    return <p className="empty">No repositories tracked yet. Add one below.</p>;

  return (
    <ul className="repo-list">
      {repositories.map(repository => (
        <li key={repository.id} className="repo-list__row">
          <button
            type="button"
            className="repo-list__select"
            aria-current={repository.id === selectedId}
            onClick={() => onSelect(repository.id)}
          >
            <span className="repo-list__name">{repository.name}</span>
            <span className="repo-list__owner">
              {repository.owner}
              {repository.syncedBranch ? ` · ${repository.syncedBranch}` : ''}
            </span>
          </button>
          <button
            type="button"
            className="button button--ghost button--danger"
            disabled={busyId === repository.id}
            aria-label={`Stop tracking ${repository.owner}/${repository.name}`}
            onClick={() => onDelete(repository)}
          >
            ✕
          </button>
        </li>
      ))}
    </ul>
  );
}
