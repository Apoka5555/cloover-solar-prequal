import Link from 'next/link';
import type { ReactNode } from 'react';
import { MainNav } from '@/components/main-nav';
import { SignOutButton } from '@/components/sign-out-button';
import { requireUser } from '@/lib/session';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();

  const items = [
    { href: '/quotes', label: 'My quotes' },
    { href: '/quotes/new', label: 'New quote' },
    ...(user.role === 'ADMIN' ? [{ href: '/admin/quotes', label: 'All quotes' }] : []),
  ];

  return (
    <div className="min-h-dvh">
      <a
        href="#main"
        className="sr-only-focusable absolute top-2 left-2 z-50 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white"
      >
        Skip to main content
      </a>

      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
          <Link
            href="/quotes"
            className="text-sm font-semibold tracking-wide text-brand-700 uppercase"
          >
            Cloover
          </Link>

          <MainNav items={items} />

          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-ink-muted sm:inline">
              {user.fullName}
              {user.role === 'ADMIN' ? (
                <span className="ml-2 rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-900">
                  Admin
                </span>
              ) : null}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
