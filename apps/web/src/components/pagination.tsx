import Link from 'next/link';

interface PaginationProps {
  basePath: string;
  params: Record<string, string | undefined>;
  page: number;
  totalPages: number;
}

function hrefFor(basePath: string, params: Record<string, string | undefined>, page: number) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      search.set(key, value);
    }
  }
  search.set('page', String(page));

  return `${basePath}?${search.toString()}`;
}

export function Pagination({ basePath, params, page, totalPages }: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const linkClass =
    'rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink hover:bg-brand-50';
  const disabledClass =
    'rounded-lg border border-line px-3 py-1.5 text-sm text-ink-muted opacity-50';

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-4">
      {page > 1 ? (
        <Link href={hrefFor(basePath, params, page - 1)} className={linkClass} rel="prev">
          Previous
        </Link>
      ) : (
        <span className={disabledClass} aria-hidden="true">
          Previous
        </span>
      )}

      <p aria-live="polite" className="text-sm text-ink-muted">
        Page {page} of {totalPages}
      </p>

      {page < totalPages ? (
        <Link href={hrefFor(basePath, params, page + 1)} className={linkClass} rel="next">
          Next
        </Link>
      ) : (
        <span className={disabledClass} aria-hidden="true">
          Next
        </span>
      )}
    </nav>
  );
}
