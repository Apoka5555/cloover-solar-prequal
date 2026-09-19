import type { PageDto, QuoteOwnerDto, QuoteSummaryDto } from '@cloover/contracts';
import type { Metadata } from 'next';
import { AdminFilters } from '@/components/admin-filters';
import { Pagination } from '@/components/pagination';
import { QuoteTable } from '@/components/quote-table';
import { Alert } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { apiFetch } from '@/lib/api';
import { requireUser } from '@/lib/session';

export const metadata: Metadata = { title: 'All quotes' };

function readParam(value: string | string[] | undefined): string {
  return typeof value === 'string' ? value : '';
}

export default async function AdminQuotesPage({ searchParams }: PageProps<'/admin/quotes'>) {
  const user = await requireUser('/admin/quotes');

  // The API refuses this data to anyone who is not an administrator; the check
  // here only decides what to render instead of an error page.
  if (user.role !== 'ADMIN') {
    return (
      <Alert title="Not available">
        This page is restricted to administrators. Your account does not have that role.
      </Alert>
    );
  }

  const params = await searchParams;
  const search = readParam(params.search);
  const userId = readParam(params.userId);
  const page = readParam(params.page) || '1';

  const query = new URLSearchParams({ page, pageSize: '20' });
  if (search) {
    query.set('search', search);
  }
  if (userId) {
    query.set('userId', userId);
  }

  const [quotes, owners] = await Promise.all([
    apiFetch<PageDto<QuoteSummaryDto>>(`/admin/quotes?${query.toString()}`),
    apiFetch<QuoteOwnerDto[]>('/admin/quotes/owners'),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">All quotes</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Every pre-qualification across all customers. {quotes.total} in total
          {search || userId ? ' matching the current filter' : ''}.
        </p>
      </div>

      <AdminFilters owners={owners} search={search} userId={userId} />

      {quotes.items.length === 0 ? (
        <EmptyState
          title="No matching quotes"
          description="No pre-qualification matches the current filter. Try a different name or email, or reset the filter."
        />
      ) : (
        <>
          <QuoteTable
            quotes={quotes.items}
            caption="All pre-qualification quotes, newest first"
            showOwner
          />
          <Pagination
            basePath="/admin/quotes"
            params={{ search, userId }}
            page={quotes.page}
            totalPages={quotes.totalPages}
          />
        </>
      )}
    </div>
  );
}
