import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { makeCommit } from '../test/factories';
import { CommitFeed } from './commit-feed';

describe('commitFeed', () => {
  it('shows what changed, who made it, and the description', () => {
    render(<CommitFeed commits={[makeCommit()]} />);

    expect(screen.getByText('feat: add the thing')).toBeInTheDocument();
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('Explains why the thing was added.')).toBeInTheDocument();
  });

  it('links each commit to GitHub', () => {
    render(<CommitFeed commits={[makeCommit()]} />);

    expect(screen.getByRole('link', { name: 'feat: add the thing' })).toHaveAttribute(
      'href',
      'https://github.com/Adosh74/gh-visualizations/commit/abc1234',
    );
  });

  it('abbreviates the sha and names the branch', () => {
    render(<CommitFeed commits={[makeCommit()]} />);

    expect(screen.getByText('abc1234')).toBeInTheDocument();
    expect(screen.getByText('develop')).toBeInTheDocument();
  });

  it('omits the description block for a one-line message', () => {
    render(<CommitFeed commits={[makeCommit({ message: 'chore: tidy' })]} />);

    expect(screen.getByText('chore: tidy')).toBeInTheDocument();
    expect(document.querySelector('.feed__body')).toBeNull();
  });

  it('explains an empty feed instead of rendering nothing', () => {
    render(<CommitFeed commits={[]} />);

    expect(screen.getByText(/no commits synced/i)).toBeInTheDocument();
  });
});
