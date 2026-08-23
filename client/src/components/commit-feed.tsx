import type { Commit } from '../types';

import { relativeTime, splitMessage } from '../utils/format';
import { ChangeDescription } from './change-description';

interface Props {
  commits: Commit[];
}

/**
 * Design items 1 and 2: what changed, who made it, and the description that
 * came with it.
 */
export function CommitFeed({ commits }: Props) {
  if (commits.length === 0)
    return <p className="empty">No commits synced for this repository yet.</p>;

  return (
    <ul className="feed">
      {commits.map((commit) => {
        const { headline, body } = splitMessage(commit.message);

        return (
          <li key={commit.id} className="feed__item">
            <h3 className="feed__headline">
              <a className="feed__link" href={commit.url} target="_blank" rel="noreferrer">
                {headline}
              </a>
            </h3>
            <p className="feed__meta">
              <span className="feed__author">{commit.authorName}</span>
              <span>{relativeTime(commit.committedAt)}</span>
              <span className="feed__sha">{commit.sha.slice(0, 7)}</span>
              {commit.branch ? <span className="badge">{commit.branch}</span> : null}
            </p>
            {body ? <ChangeDescription text={body} /> : null}
          </li>
        );
      })}
    </ul>
  );
}
