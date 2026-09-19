import type { QuoteOfferDto } from '@cloover/contracts';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OfferTable } from './offer-table';

const offers: QuoteOfferDto[] = [5, 10, 15].map((termYears, index) => ({
  termYears,
  apr: 0.069,
  aprPercent: 6.9,
  principalUsed: 6000,
  monthlyPayment: [118.52, 69.36, 53.59][index]!,
  numberOfPayments: termYears * 12,
  totalPaid: [7111.2, 8323.2, 9646.2][index]!,
  totalInterest: [1111.2, 2323.2, 3646.2][index]!,
}));

describe('OfferTable', () => {
  it('renders a row per term with its monthly payment', () => {
    render(<OfferTable offers={offers} />);

    const table = screen.getByRole('table');
    const rows = within(table).getAllByRole('row');

    // One header row plus one row per offer.
    expect(rows).toHaveLength(4);
    expect(within(table).getByText(/118,52/)).toBeInTheDocument();
    expect(within(table).getByText(/53,59/)).toBeInTheDocument();
  });

  it('gives the table a caption and column headers for screen readers', () => {
    render(<OfferTable offers={offers} />);

    const table = screen.getByRole('table');
    expect(table).toHaveAccessibleName(/Instalment offers by term/i);
    expect(
      within(table).getByRole('columnheader', { name: 'Monthly payment' }),
    ).toBeInTheDocument();
    expect(within(table).getByRole('rowheader', { name: '5 years' })).toBeInTheDocument();
  });

  it('shows the same offers as cards for narrow screens', () => {
    render(<OfferTable offers={offers} />);

    const cards = screen.getAllByRole('listitem');
    expect(cards).toHaveLength(3);
    expect(within(cards[0]!).getByText(/118,52/)).toBeInTheDocument();
  });
});
