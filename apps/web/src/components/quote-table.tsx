import type { QuoteSummaryDto } from '@cloover/contracts';
import Link from 'next/link';
import { RiskBandBadge } from '@/components/ui/risk-band';
import { formatDate, formatEur, formatKw, formatPercent } from '@/lib/format';

interface QuoteTableProps {
  quotes: QuoteSummaryDto[];
  caption: string;
  showOwner?: boolean;
}

export function QuoteTable({ quotes, caption, showOwner = false }: QuoteTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface">
      <table className="w-full text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-line text-left text-ink-muted">
            <th scope="col" className="px-4 py-3 font-medium">
              Date
            </th>
            {showOwner ? (
              <th scope="col" className="px-4 py-3 font-medium">
                Customer
              </th>
            ) : null}
            <th scope="col" className="px-4 py-3 font-medium">
              System size
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              Price
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Band
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Rate
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {quotes.map((quote) => (
            <tr key={quote.id} className="border-b border-line last:border-0">
              <td className="px-4 py-3 whitespace-nowrap">{formatDate(quote.createdAt)}</td>
              {showOwner ? (
                <td className="px-4 py-3">
                  <span className="block text-ink">{quote.owner?.fullName}</span>
                  <span className="block text-xs text-ink-muted">{quote.owner?.email}</span>
                </td>
              ) : null}
              <td className="px-4 py-3 whitespace-nowrap">{formatKw(quote.systemSizeKw)}</td>
              <td className="px-4 py-3 text-right whitespace-nowrap">
                {formatEur(quote.systemPrice)}
              </td>
              <td className="px-4 py-3">
                <RiskBandBadge band={quote.riskBand} />
              </td>
              <td className="px-4 py-3 whitespace-nowrap">{formatPercent(quote.apr)}</td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/quotes/${quote.id}`}
                  aria-label={`View quote from ${formatDate(quote.createdAt)}`}
                  className="font-medium text-brand-700 underline underline-offset-2"
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
