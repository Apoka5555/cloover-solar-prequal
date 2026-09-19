import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-12">
      <div className="mb-8 text-center">
        <p className="text-sm font-semibold tracking-wide text-brand-700 uppercase">Cloover</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">Solar pre-qualification</h1>
      </div>
      {children}
    </main>
  );
}
