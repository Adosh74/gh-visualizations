import { useState } from 'react';

import type { UserRepository } from '../types';

import { addRepository, listUserRepositories } from '../api/client';

interface Props {
  onAdded: () => void;
}

/**
 * Two ways into design item 4: paste a repository directly, or browse what a
 * GitHub user has and pick from the list.
 */
export function AddRepositoryForm({ onAdded }: Props) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [suggestions, setSuggestions] = useState<UserRepository[]>();

  async function track(input: { owner: string; name: string } | { url: string }) {
    setBusy(true);
    setError(undefined);
    try {
      await addRepository(input);
      setValue('');
      setSuggestions(undefined);
      onAdded();
    }
    catch (err) {
      setError((err as Error).message);
    }
    finally {
      setBusy(false);
    }
  }

  async function browse() {
    const username = value.trim().replace(/^@/, '');
    if (!username) {
      setError('Enter a GitHub username to browse.');
      return;
    }

    setBusy(true);
    setError(undefined);
    try {
      const { repositories } = await listUserRepositories(username);
      setSuggestions(repositories);
      if (repositories.length === 0)
        setError(`${username} has no public repositories.`);
    }
    catch (err) {
      setError((err as Error).message);
    }
    finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const trimmed = value.trim();
          if (!trimmed) {
            setError('Enter a repository first.');
            return;
          }
          void track({ url: trimmed });
        }}
      >
        <div className="field">
          <label className="field__label" htmlFor="repo-input">
            Repository URL, owner/name, or a username to browse
          </label>
          <input
            id="repo-input"
            className="input"
            placeholder="Adosh74/gh-visualizations"
            value={value}
            disabled={busy}
            onChange={event => setValue(event.target.value)}
          />
        </div>

        <div className="form__actions">
          <button type="submit" className="button button--primary" disabled={busy}>
            {busy ? 'Working…' : 'Track repository'}
          </button>
          <button type="button" className="button" disabled={busy} onClick={() => void browse()}>
            Browse user
          </button>
        </div>
      </form>

      {error ? <p className="message message--error" role="alert">{error}</p> : null}

      {suggestions && suggestions.length > 0
        ? (
            <ul className="repo-list" style={{ marginTop: 12 }}>
              {suggestions.map(repository => (
                <li key={`${repository.owner}/${repository.name}`} className="repo-list__row">
                  <button
                    type="button"
                    className="repo-list__select"
                    disabled={busy}
                    onClick={() => void track({ owner: repository.owner, name: repository.name })}
                  >
                    <span className="repo-list__name">{repository.name}</span>
                    <span className="repo-list__owner">
                      ★
                      {repository.stars}
                      {repository.description ? ` · ${repository.description}` : ''}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )
        : null}
    </div>
  );
}
