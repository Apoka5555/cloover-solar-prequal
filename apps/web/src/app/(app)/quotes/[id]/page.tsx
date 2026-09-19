import type { QuoteDto } from '@cloover/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { OfferTable } from '@/components/offer-table';
import { Card, CardTitle } from '@/components/ui/card';
import { RiskBandBadge } from '@/components/ui/risk-band';
import { ApiError, apiFetch } from '@/lib/api';
import { formatDate, formatEur, formatKw, formatPercent } from '@/lib/format';

export const metadata: Metadata = { title: 'Quote' };

export default async function QuoteDetailPage({ params }: PageProps<'/quotes/[id]'>) {
  const { id } = await params;

  let quote: QuoteDto;
  try {
    quote = await apiFetch<QuoteDto>(`/quotes/${id}`);
  } catch (error) {
    // The API answers 404 both for a quote that does not exist and for one
    // belonging to another user, so this page cannot reveal the difference
    // either.
    if (error instanceof ApiError && (error.status === 404 || error.status === 400)) {
      notFound();
    }
    throw error;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/quotes"
          className="text-sm font-medium text-brand-700 underline underline-offset-2"
        >
          ← Back to my quotes
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-ink">
          Pre-qualification from {formatDate(quote.createdAt)}
        </h1>
        {quote.owner ? (
          <p className="mt-1 text-sm text-ink-muted">
            Requested by {quote.owner.fullName} ({quote.owner.email})
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-ink-muted">System price</p>
          <p className="mt-1 text-2xl font-semibold text-ink">
            {formatEur(quote.derived.systemPrice)}
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            {formatKw(quote.input.systemSizeKw)} installed
          </p>
        </Card>

        <Card>
          <p className="text-sm text-ink-muted">Amount financed</p>
          <p className="mt-1 text-2xl font-semibold text-ink">
            {formatEur(quote.derived.principal)}
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            After a down payment of {formatEur(quote.derived.downPayment)}
          </p>
        </Card>

        <Card>
          <p className="text-sm text-ink-muted">Risk band</p>
          <p className="mt-1 flex items-center gap-2 text-2xl font-semibold text-ink">
            <RiskBandBadge band={quote.derived.riskBand} />
            <span>{formatPercent(quote.derived.apr)} APR</span>
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            Pricing rules {quote.derived.pricingVersion}
          </p>
        </Card>
      </div>

      <section aria-labelledby="offers-heading" className="space-y-3">
        <h2 id="offers-heading" className="text-base font-semibold text-ink">
          Instalment offers
        </h2>
        <p className="text-sm text-ink-muted">
          A longer term lowers the monthly payment and raises the total interest.
        </p>
        <OfferTable offers={quote.offers} />
      </section>

      <section aria-labelledby="inputs-heading">
        <Card>
          <CardTitle>
            <span id="inputs-heading">Submitted details</span>
          </CardTitle>
          <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <div className="flex justify-between gap-4 sm:block">
              <dt className="text-ink-muted">Name</dt>
              <dd className="sm:mt-0.5">{quote.input.fullName}</dd>
            </div>
            <div className="flex justify-between gap-4 sm:block">
              <dt className="text-ink-muted">Email</dt>
              <dd className="sm:mt-0.5">{quote.input.email}</dd>
            </div>
            <div className="flex justify-between gap-4 sm:block">
              <dt className="text-ink-muted">Address</dt>
              <dd className="sm:mt-0.5">{quote.input.address}</dd>
            </div>
            <div className="flex justify-between gap-4 sm:block">
              <dt className="text-ink-muted">Monthly consumption</dt>
              <dd className="sm:mt-0.5">{quote.input.monthlyConsumptionKwh} kWh</dd>
            </div>
          </dl>
        </Card>
      </section>
    </div>
  );
}
