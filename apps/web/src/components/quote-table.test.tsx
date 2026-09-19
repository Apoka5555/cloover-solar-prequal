import type { QuoteSummaryDto } from '@cloover/contracts';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { QuoteTable } from './quote-table';

const quotes: QuoteSummaryDto[] = [
  {
    id: 'quote-1',
    createdAt: '2026-01-15T10:30:00.000Z',
    systemSizeKw: 6,
    systemPrice: 7200,
    riskBand: 'A',
    apr: 0.069,
    aprPercent: 6.9,
    owner: { id: 'user-1', fullName: 'Sam Homeowner', email: 'sam@test.com' },
  },
];

describe('QuoteTable', () => {
  it('names each link by the quote it opens, not just "View"', () => {
    render(<QuoteTable quotes={quotes} caption="Quotes" />);

    const link = screen.getByRole('link', { name: 'View quote from 15 Jan 2026' });
    expect(link).toHaveAttribute('href', '/quotes/quote-1');
  });

  it('hides the customer column unless the caller may see it', () => {
    const { rerender } = render(<QuoteTable quotes={quotes} caption="Quotes" />);
    expect(screen.queryByText('sam@test.com')).not.toBeInTheDocument();

    rerender(<QuoteTable quotes={quotes} caption="Quotes" showOwner />);
    expect(screen.getByText('sam@test.com')).toBeInTheDocument();
  });

  it('describes the table and its columns', () => {
    render(<QuoteTable quotes={quotes} caption="Your quotes, newest first" />);

    const table = screen.getByRole('table');
    expect(table).toHaveAccessibleName('Your quotes, newest first');
    expect(within(table).getByRole('columnheader', { name: 'System size' })).toBeInTheDocument();
  });
});
