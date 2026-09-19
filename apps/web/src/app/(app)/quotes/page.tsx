import type { PageDto, QuoteSummaryDto } from '@cloover/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { QuoteTable } from '@/components/quote-table';
import { EmptyState } from '@/components/ui/empty-state';
import { apiFetch } from '@/lib/api';

export const metadata: Metadata = { title: 'My quotes' };

export default async function MyQuotesPage() {
  const page = await apiFetch<PageDto<QuoteSummaryDto>>('/quotes?pageSize=50');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">My quotes</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {page.total === 0
              ? 'No pre-qualifications yet.'
              : `${page.total} pre-qualification${page.total === 1 ? '' : 's'}.`}
          </p>
        </div>

        <Link
          href="/quotes/new"
          className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
        >
          New quote
        </Link>
      </div>

      {page.items.length === 0 ? (
        <EmptyState
          title="Nothing here yet"
          description="Request a pre-qualification to see the system price, your risk band and three instalment offers."
          actionHref="/quotes/new"
          actionLabel="Get a pre-qualification"
        />
      ) : (
        <QuoteTable quotes={page.items} caption="Your pre-qualification quotes, newest first" />
      )}
    </div>
  );
}
