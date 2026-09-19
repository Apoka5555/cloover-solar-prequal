import type { AmortizationScheduleDto } from '@cloover/contracts';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ScheduleTable } from './schedule-table';

const schedule: AmortizationScheduleDto = {
  quoteId: 'quote-1',
  termYears: 5,
  apr: 0.069,
  aprPercent: 6.9,
  principal: 6000,
  monthlyPayment: 118.52,
  totalPaid: 7111.09,
  totalInterest: 1111.09,
  rows: [
    { period: 1, payment: 118.52, interest: 34.5, principal: 84.02, remainingBalance: 5915.98 },
    { period: 2, payment: 118.52, interest: 34.02, principal: 84.5, remainingBalance: 5831.48 },
    { period: 3, payment: 118.52, interest: 33.53, principal: 84.99, remainingBalance: 0 },
  ],
};

describe('ScheduleTable', () => {
  it('renders one row per instalment', () => {
    render(<ScheduleTable schedule={schedule} />);

    const rows = within(screen.getByRole('table')).getAllByRole('row');
    expect(rows).toHaveLength(4);
  });

  it('explains the first instalment in words', () => {
    render(<ScheduleTable schedule={schedule} />);

    expect(screen.getByText(/towards interest and/)).toHaveTextContent('34,50');
  });

  it('describes the table for screen readers', () => {
    render(<ScheduleTable schedule={schedule} />);

    expect(screen.getByRole('table')).toHaveAccessibleName(/Amortisation schedule over 5 years/i);
  });

  it('says so plainly when there is nothing to finance', () => {
    render(<ScheduleTable schedule={{ ...schedule, rows: [], principal: 0 }} />);

    expect(screen.getByText(/Nothing is financed on this quote/)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
