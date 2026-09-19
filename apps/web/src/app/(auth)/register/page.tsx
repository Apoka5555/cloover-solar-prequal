import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { CredentialsForm } from '@/components/credentials-form';
import { getSession } from '@/lib/session';

export const metadata: Metadata = { title: 'Create an account' };

export default async function RegisterPage() {
  if (await getSession()) {
    redirect('/quotes');
  }

  return <CredentialsForm mode="register" next="/quotes/new" />;
}
