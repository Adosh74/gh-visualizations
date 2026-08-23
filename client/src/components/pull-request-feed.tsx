import type { PullRequest } from '../types';

import { relativeTime } from '../utils/format';
import { ChangeDescription } from './change-description';

interface Props {
  pullRequests: PullRequest[];
}

export function PullRequestFeed({ pullRequests }: Props) {
  if (pullRequests.length === 0)
    return <p className="empty">No pull requests synced for this repository yet.</p>;

  return (
    <ul className="feed">
      {pullRequests.map(pullRequest => (
        <li key={pullRequest.id} className="feed__item">
          <h3 className="feed__headline">
            <a className="feed__link" href={pullRequest.url} target="_blank" rel="noreferrer">
              {pullRequest.title}
            </a>
          </h3>
          <p className="feed__meta">
            <span className={`badge badge--${pullRequest.state}`}>{pullRequest.state}</span>
            <span className="feed__author">{pullRequest.author}</span>
            <span>
              {pullRequest.mergedAt
                ? `merged ${relativeTime(pullRequest.mergedAt)}`
                : `opened ${relativeTime(pullRequest.createdAt)}`}
            </span>
            <span className="feed__sha">
              #
              {pullRequest.prNumber}
            </span>
          </p>
          {pullRequest.body ? <ChangeDescription text={pullRequest.body} /> : null}
        </li>
      ))}
    </ul>
  );
}
