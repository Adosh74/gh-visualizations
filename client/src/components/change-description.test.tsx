import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { ChangeDescription } from './change-description';

const LONG = 'x'.repeat(300);

describe('changeDescription', () => {
  it('shows a short description with no expand control', () => {
    render(<ChangeDescription text="a short note" />);

    expect(screen.getByText('a short note')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('offers to expand a long description', () => {
    render(<ChangeDescription text={LONG} />);

    expect(screen.getByRole('button', { name: 'Show more' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('keeps the full text in the DOM even while clamped', () => {
    render(<ChangeDescription text={LONG} />);

    expect(screen.getByText(LONG)).toBeInTheDocument();
  });

  it('expands and collapses on click', async () => {
    const user = userEvent.setup();
    render(<ChangeDescription text={LONG} />);

    await user.click(screen.getByRole('button', { name: 'Show more' }));
    expect(screen.getByText(LONG)).toHaveClass('feed__body--expanded');

    await user.click(screen.getByRole('button', { name: 'Show less' }));
    expect(screen.getByText(LONG)).not.toHaveClass('feed__body--expanded');
  });
});
