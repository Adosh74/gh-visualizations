import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as api from './api/client';
import { App } from './app';
import { makeCommit, makePullRequest, makeRepository, makeStats } from './test/factories';

vi.mock('./api/client', async () => {
  const actual = await vi.importActual<typeof import('./api/client')>('./api/client');
  return {
    ...actual,
    listRepositories: vi.fn(),
    addRepository: vi.fn(),
    deleteRepository: vi.fn(),
    syncRepository: vi.fn(),
    listCommits: vi.fn(),
    listPullRequests: vi.fn(),
    getStats: vi.fn(),
    listUserRepositories: vi.fn(),
  };
});

const mocked = vi.mocked(api);

/** Stat labels repeat elsewhere on the page, so scope the lookup to the tile. */
function statTile(label: string): HTMLElement {
  const tiles = [...document.querySelectorAll<HTMLElement>('.stat')];
  const tile = tiles.find(node => node.querySelector('.stat__label')?.textContent === label);

  if (!tile)
    throw new Error(`No stat tile labelled "${label}"`);

  return tile;
}

describe('app', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.listRepositories.mockResolvedValue({
      repositories: [makeRepository()],
      total: 1,
    });
    mocked.getStats.mockResolvedValue({ stats: makeStats() });
    mocked.listCommits.mockResolvedValue({ commits: [makeCommit()], total: 1 });
    mocked.listPullRequests.mockResolvedValue({ pullRequests: [makePullRequest()], total: 1 });
  });

  it('selects the first tracked repository and shows its dashboard', async () => {
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Adosh74/gh-visualizations' }))
      .toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'feat: add the thing' })).toBeInTheDocument();
  });

  it('shows the totals the stats endpoint reported', async () => {
    render(<App />);

    await screen.findByRole('heading', { name: 'Adosh74/gh-visualizations' });

    // The tiles show a placeholder until the stats request settles.
    await waitFor(() => expect(statTile('Commits')).toHaveTextContent('3'));
    expect(statTile('Pull requests')).toHaveTextContent('1');
    expect(statTile('Contributors')).toHaveTextContent('2');
  });

  it('switches the dashboard when another repository is picked', async () => {
    const user = userEvent.setup();
    mocked.listRepositories.mockResolvedValue({
      repositories: [makeRepository(), makeRepository({ id: 'repo-2', name: 'other-repo' })],
      total: 2,
    });

    render(<App />);

    const sidebar = (await screen.findByText('Repositories')).closest<HTMLElement>('.panel')!;
    await user.click(within(sidebar).getByRole('button', { name: /^other-repo/ }));

    expect(await screen.findByRole('heading', { name: 'Adosh74/other-repo' })).toBeInTheDocument();
    await waitFor(() => expect(mocked.getStats).toHaveBeenCalledWith('repo-2', 30));
  });

  it('swaps the feed between commits and pull requests', async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByText('feat: add the thing');

    await user.click(screen.getByRole('tab', { name: /pull requests/i }));

    expect(await screen.findByText('Describes the change in detail.')).toBeInTheDocument();
  });

  it('reloads the chart window when a different range is chosen', async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByRole('heading', { name: 'Adosh74/gh-visualizations' });
    await user.click(screen.getByRole('button', { name: '7d' }));

    await waitFor(() => expect(mocked.getStats).toHaveBeenCalledWith('repo-1', 7));
  });

  it('syncs on demand and refreshes the dashboard', async () => {
    const user = userEvent.setup();
    mocked.syncRepository.mockResolvedValue({
      sync: {
        repoId: 'repo-1',
        owner: 'Adosh74',
        name: 'gh-visualizations',
        branch: 'develop',
        commits: 2,
        pullRequests: 0,
      },
      repository: makeRepository(),
    });

    render(<App />);
    await screen.findByRole('heading', { name: 'Adosh74/gh-visualizations' });

    await user.click(screen.getByRole('button', { name: 'Sync now' }));

    await waitFor(() => expect(mocked.syncRepository).toHaveBeenCalledWith('repo-1'));
    await waitFor(() => expect(mocked.listCommits).toHaveBeenCalledTimes(2));
  });

  it('surfaces a failed sync without losing what is already on screen', async () => {
    const user = userEvent.setup();
    mocked.syncRepository.mockRejectedValue(new api.ApiError('GitHub rate limit reached', 429));

    render(<App />);
    await screen.findByRole('heading', { name: 'Adosh74/gh-visualizations' });

    await user.click(screen.getByRole('button', { name: 'Sync now' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('GitHub rate limit reached');
    expect(screen.getByText('feat: add the thing')).toBeInTheDocument();
  });

  it('invites the user to track something when nothing is tracked', async () => {
    mocked.listRepositories.mockResolvedValue({ repositories: [], total: 0 });

    render(<App />);

    expect(await screen.findByText(/no repositories tracked yet/i)).toBeInTheDocument();
    expect(screen.getByText(/track a repository to see its commits/i)).toBeInTheDocument();
  });

  it('reports a server that cannot be reached', async () => {
    mocked.listRepositories.mockRejectedValue(
      new api.ApiError('Could not reach the gh-visualizations server.', 0),
    );

    render(<App />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not reach');
  });

  it('tracks a new repository and reloads the list', async () => {
    const user = userEvent.setup();
    mocked.addRepository.mockResolvedValue({ repository: makeRepository() });

    render(<App />);
    await screen.findByRole('heading', { name: 'Adosh74/gh-visualizations' });

    await user.type(screen.getByLabelText(/repository url/i), 'Adosh74/another');
    await user.click(screen.getByRole('button', { name: 'Track repository' }));

    await waitFor(() =>
      expect(mocked.addRepository).toHaveBeenCalledWith({ url: 'Adosh74/another' }));
    await waitFor(() => expect(mocked.listRepositories).toHaveBeenCalledTimes(2));
  });

  it('shows the server message when tracking is rejected', async () => {
    const user = userEvent.setup();
    mocked.addRepository.mockRejectedValue(
      new api.ApiError('repository ghost/nope was not found on GitHub', 404),
    );

    render(<App />);
    await screen.findByRole('heading', { name: 'Adosh74/gh-visualizations' });

    await user.type(screen.getByLabelText(/repository url/i), 'ghost/nope');
    await user.click(screen.getByRole('button', { name: 'Track repository' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('was not found on GitHub');
  });

  it('browses a user and tracks a repository from the results', async () => {
    const user = userEvent.setup();
    mocked.listUserRepositories.mockResolvedValue({
      repositories: [{
        owner: 'Adosh74',
        name: 'picked-repo',
        url: 'https://github.com/Adosh74/picked-repo',
        description: 'from the picker',
        defaultBranch: 'main',
        stars: 4,
        updatedAt: Date.now(),
      }],
      total: 1,
    });
    mocked.addRepository.mockResolvedValue({ repository: makeRepository() });

    render(<App />);
    await screen.findByRole('heading', { name: 'Adosh74/gh-visualizations' });

    await user.type(screen.getByLabelText(/repository url/i), 'Adosh74');
    await user.click(screen.getByRole('button', { name: 'Browse user' }));

    await user.click(await screen.findByRole('button', { name: /picked-repo/ }));

    await waitFor(() => expect(mocked.addRepository).toHaveBeenCalledWith({
      owner: 'Adosh74',
      name: 'picked-repo',
    }));
  });

  it('stops tracking a repository', async () => {
    const user = userEvent.setup();
    mocked.deleteRepository.mockResolvedValue(undefined);

    render(<App />);
    await screen.findByRole('heading', { name: 'Adosh74/gh-visualizations' });

    await user.click(screen.getByRole('button', { name: /stop tracking/i }));

    await waitFor(() => expect(mocked.deleteRepository).toHaveBeenCalledWith('repo-1'));
  });
});
