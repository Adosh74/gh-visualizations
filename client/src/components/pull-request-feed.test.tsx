import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { makePullRequest } from '../test/factories';
import { PullRequestFeed } from './pull-request-feed';

describe('pullRequestFeed', () => {
  it('shows the title, author, number and description', () => {
    render(<PullRequestFeed pullRequests={[makePullRequest()]} />);

    expect(screen.getByText('feat: add the thing')).toBeInTheDocument();
    expect(screen.getByText('ada')).toBeInTheDocument();
    expect(screen.getByText('#7')).toBeInTheDocument();
    expect(screen.getByText('Describes the change in detail.')).toBeInTheDocument();
  });

  it('labels the state, so it is not carried by colour alone', () => {
    render(<PullRequestFeed pullRequests={[makePullRequest({ state: 'merged' })]} />);

    expect(screen.getByText('merged')).toBeInTheDocument();
  });

  it('reports when an open pull request was opened rather than merged', () => {
    render(
      <PullRequestFeed
        pullRequests={[makePullRequest({ state: 'open', mergedAt: null })]}
      />,
    );

    expect(screen.getByText(/^opened /)).toBeInTheDocument();
    expect(screen.queryByText(/^merged /)).toBeNull();
  });

  it('explains an empty feed', () => {
    render(<PullRequestFeed pullRequests={[]} />);

    expect(screen.getByText(/no pull requests synced/i)).toBeInTheDocument();
  });
});
