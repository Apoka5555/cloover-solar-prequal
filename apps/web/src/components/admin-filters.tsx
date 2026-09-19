import type { QuoteOwnerDto } from '@cloover/contracts';

interface AdminFiltersProps {
  owners: QuoteOwnerDto[];
  search: string;
  userId: string;
}

/**
 * A plain GET form. Filtering therefore works without JavaScript, produces a
 * shareable URL, and needs no client-side state.
 */
export function AdminFilters({ owners, search, userId }: AdminFiltersProps) {
  return (
    <form
      method="get"
      action="/admin/quotes"
      className="flex flex-wrap items-end gap-3 rounded-xl border border-line bg-surface p-4"
    >
      <div className="min-w-56 flex-1">
        <label htmlFor="search" className="block text-sm font-medium text-ink">
          Search by name or email
        </label>
        <input
          id="search"
          name="search"
          type="search"
          defaultValue={search}
          placeholder="e.g. mia or @test.com"
          className="mt-1.5 block w-full rounded-lg border border-line bg-white px-3 py-2 text-sm shadow-xs"
        />
      </div>

      <div className="min-w-56">
        <label htmlFor="userId" className="block text-sm font-medium text-ink">
          Customer
        </label>
        <select
          id="userId"
          name="userId"
          defaultValue={userId}
          className="mt-1.5 block w-full rounded-lg border border-line bg-white px-3 py-2 text-sm shadow-xs"
        >
          <option value="">All customers</option>
          {owners.map((owner) => (
            <option key={owner.id} value={owner.id}>
              {owner.fullName} ({owner.email})
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
        >
          Apply
        </button>
        <a
          href="/admin/quotes"
          className="rounded-lg border border-line px-4 py-2.5 text-sm font-medium text-ink hover:bg-brand-50"
        >
          Reset
        </a>
      </div>
    </form>
  );
}
