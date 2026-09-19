import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { CredentialsForm } from '@/components/credentials-form';
import { getSession } from '@/lib/session';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  if (await getSession()) {
    redirect('/quotes');
  }

  const { next } = await searchParams;

  return <CredentialsForm mode="login" next={typeof next === 'string' ? next : '/quotes'} />;
}
