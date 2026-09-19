import type { QuoteOfferDto } from '@cloover/contracts';
import Link from 'next/link';
import { formatEur, formatPercent } from '@/lib/format';

/**
 * The three offers, shown as cards on a phone and as a table on wider screens.
 * Both renderings come from the same data; the table carries proper header
 * associations so a screen reader can read a cell with its column.
 */
interface OfferTableProps {
  offers: QuoteOfferDto[];
  quoteId: string;
  /** The term whose schedule is currently open, if any. */
  openTerm?: number | undefined;
}

export function OfferTable({ offers, quoteId, openTerm }: OfferTableProps) {
  return (
    <>
      <ul className="grid gap-3 sm:hidden">
        {offers.map((offer) => (
          <li key={offer.termYears} className="rounded-xl border border-line bg-surface p-4">
            <p className="text-sm font-semibold text-ink">{offer.termYears} years</p>
            <p className="mt-1 text-2xl font-semibold text-brand-700">
              {formatEur(offer.monthlyPayment)}
              <span className="text-sm font-normal text-ink-muted"> / month</span>
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <dt className="text-ink-muted">Rate</dt>
              <dd className="text-right">{formatPercent(offer.apr)}</dd>
              <dt className="text-ink-muted">Amount financed</dt>
              <dd className="text-right">{formatEur(offer.principalUsed)}</dd>
              <dt className="text-ink-muted">Payments</dt>
              <dd className="text-right">{offer.numberOfPayments}</dd>
              <dt className="text-ink-muted">Total repaid</dt>
              <dd className="text-right">{formatEur(offer.totalPaid)}</dd>
              <dt className="text-ink-muted">Interest</dt>
              <dd className="text-right">{formatEur(offer.totalInterest)}</dd>
            </dl>
            <ScheduleLink
              quoteId={quoteId}
              termYears={offer.termYears}
              open={openTerm === offer.termYears}
            />
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto rounded-xl border border-line bg-surface sm:block">
        <table className="w-full text-sm">
          <caption className="sr-only">
            Instalment offers by term, with the monthly payment and total cost of each
          </caption>
          <thead>
            <tr className="border-b border-line text-left text-ink-muted">
              <th scope="col" className="px-4 py-3 font-medium">
                Term
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Rate
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Amount financed
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium">
                Monthly payment
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium">
                Total repaid
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium">
                Interest
              </th>
            </tr>
          </thead>
          <tbody>
            {offers.map((offer) => (
              <tr key={offer.termYears} className="border-b border-line last:border-0">
                <th scope="row" className="px-4 py-3 text-left font-medium text-ink">
                  {offer.termYears} years
                </th>
                <td className="px-4 py-3">{formatPercent(offer.apr)}</td>
                <td className="px-4 py-3">{formatEur(offer.principalUsed)}</td>
                <td className="px-4 py-3 text-right text-base font-semibold text-brand-700">
                  {formatEur(offer.monthlyPayment)}
                </td>
                <td className="px-4 py-3 text-right">{formatEur(offer.totalPaid)}</td>
                <td className="px-4 py-3 text-right">{formatEur(offer.totalInterest)}</td>
                <td className="px-4 py-3 text-right">
                  <ScheduleLink
                    quoteId={quoteId}
                    termYears={offer.termYears}
                    open={openTerm === offer.termYears}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ScheduleLink({
  quoteId,
  termYears,
  open,
}: {
  quoteId: string;
  termYears: number;
  open: boolean;
}) {
  const label = open ? 'Viewing schedule' : 'View schedule';

  return (
    <Link
      href={`/quotes/${quoteId}?term=${termYears}#schedule`}
      aria-current={open ? 'true' : undefined}
      // Spelled out rather than assembled from visible text plus a hidden
      // span: the accessible name algorithm concatenates element children
      // without a separator, which would announce "View schedulefor the 5
      // year term".
      aria-label={`${label} for the ${termYears} year term`}
      className={`mt-3 inline-flex text-sm font-medium underline underline-offset-2 sm:mt-0 ${
        open ? 'text-ink' : 'text-brand-700'
      }`}
    >
      {label}
    </Link>
  );
}
