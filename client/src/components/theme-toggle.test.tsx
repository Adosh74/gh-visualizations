import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { ThemeToggle } from './theme-toggle';

describe('themeToggle', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('starts on the system theme, leaving prefers-color-scheme in charge', () => {
    render(<ThemeToggle />);

    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    expect(screen.getByRole('button', { name: 'System theme' })).toBeInTheDocument();
  });

  it('cycles system → light → dark → system', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await user.click(screen.getByRole('button'));
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    await user.click(screen.getByRole('button'));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    await user.click(screen.getByRole('button'));
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('remembers an explicit choice', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<ThemeToggle />);

    await user.click(screen.getByRole('button'));
    unmount();

    render(<ThemeToggle />);
    expect(screen.getByRole('button', { name: 'Light theme' })).toBeInTheDocument();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('forgets the choice again when it returns to system', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await user.click(screen.getByRole('button')); // light
    await user.click(screen.getByRole('button')); // dark
    await user.click(screen.getByRole('button')); // system

    expect(localStorage.getItem('gh-visualizations:theme')).toBeNull();
  });
});
