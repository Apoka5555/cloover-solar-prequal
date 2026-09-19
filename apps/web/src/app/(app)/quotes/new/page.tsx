import type { Metadata } from 'next';
import { QuoteForm } from '@/components/quote-form';
import { requireUser } from '@/lib/session';

export const metadata: Metadata = { title: 'New quote' };

export default async function NewQuotePage() {
  const user = await requireUser('/quotes/new');

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Get a pre-qualification</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Tell us about the household and the system you have in mind. We price the installation,
          grade the application and return three instalment options.
        </p>
      </div>

      <QuoteForm user={user} />
    </div>
  );
}
