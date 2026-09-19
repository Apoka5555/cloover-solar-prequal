import type { AmortizationScheduleDto } from '@cloover/contracts';
import { formatEur, formatPercent } from '@/lib/format';

/**
 * The instalment-by-instalment breakdown of one offer. It exists to make the
 * cost of borrowing concrete: the first payment is mostly interest and the
 * last is almost entirely repayment.
 */
export function ScheduleTable({ schedule }: { schedule: AmortizationScheduleDto }) {
  const [first] = schedule.rows;

  return (
    <div className="space-y-3">
      <dl className="grid gap-3 sm:grid-cols-4">
        {[
          ['Monthly payment', formatEur(schedule.monthlyPayment)],
          ['Rate', formatPercent(schedule.apr)],
          ['Total repaid', formatEur(schedule.totalPaid)],
          ['Total interest', formatEur(schedule.totalInterest)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-line bg-surface px-4 py-3">
            <dt className="text-xs text-ink-muted">{label}</dt>
            <dd className="mt-0.5 text-sm font-semibold text-ink">{value}</dd>
          </div>
        ))}
      </dl>

      {first ? (
        <p className="text-sm text-ink-muted">
          The first instalment puts {formatEur(first.interest)} towards interest and{' '}
          {formatEur(first.principal)} towards the balance. That ratio reverses over the term.
        </p>
      ) : (
        <p className="text-sm text-ink-muted">
          Nothing is financed on this quote, so there is no schedule to show.
        </p>
      )}

      {schedule.rows.length > 0 ? (
        <div className="max-h-[28rem] overflow-auto rounded-xl border border-line bg-surface">
          <table className="w-full text-sm">
            <caption className="sr-only">
              Amortisation schedule over {schedule.termYears} years, one row per monthly instalment
            </caption>
            <thead className="sticky top-0 bg-surface">
              <tr className="border-b border-line text-left text-ink-muted">
                <th scope="col" className="px-4 py-2.5 font-medium">
                  Payment
                </th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">
                  Amount
                </th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">
                  Interest
                </th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">
                  Principal
                </th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">
                  Balance
                </th>
              </tr>
            </thead>
            <tbody>
              {schedule.rows.map((row) => (
                <tr key={row.period} className="border-b border-line last:border-0">
                  <th scope="row" className="px-4 py-2 text-left font-normal text-ink-muted">
                    {row.period}
                  </th>
                  <td className="px-4 py-2 text-right">{formatEur(row.payment)}</td>
                  <td className="px-4 py-2 text-right">{formatEur(row.interest)}</td>
                  <td className="px-4 py-2 text-right">{formatEur(row.principal)}</td>
                  <td className="px-4 py-2 text-right font-medium">
                    {formatEur(row.remainingBalance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
