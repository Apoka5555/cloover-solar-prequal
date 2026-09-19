import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 text-center">
      <h1 className="text-2xl font-semibold text-ink">Not found</h1>
      <p className="mt-2 text-sm text-ink-muted">
        This page does not exist, or you do not have access to it.
      </p>
      <Link
        href="/quotes"
        className="mx-auto mt-6 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
      >
        Go to my quotes
      </Link>
    </main>
  );
}
