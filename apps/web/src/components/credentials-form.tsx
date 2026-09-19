'use client';

import { loginSchema, registerSchema, type ApiErrorDto } from '@cloover/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';

type Mode = 'login' | 'register';

interface CredentialsFormProps {
  mode: Mode;
  /** Path to return to once the session is established. */
  next: string;
}

interface FormValues {
  fullName?: string;
  email: string;
  password: string;
}

export function CredentialsForm({ mode, next }: CredentialsFormProps) {
  const isRegister = mode === 'register';
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(isRegister ? registerSchema : loginSchema),
    defaultValues: { fullName: '', email: '', password: '' },
  });

  // Focus moves to the alert after it has rendered, so a keyboard or screen
  // reader user lands on the explanation rather than being left at the submit
  // button. Doing this in an effect rather than in the handler guarantees the
  // alert exists by the time focus arrives.
  useEffect(() => {
    if (formError) {
      errorRef.current?.focus();
    }
  }, [formError]);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);

    const response = await fetch(`/api/auth/${mode}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(values),
    });

    if (response.ok) {
      // refresh() re-runs the server components so the new session is visible
      // before navigation completes.
      router.replace(next);
      router.refresh();
      return;
    }

    const body = (await response.json().catch(() => ({}))) as Partial<ApiErrorDto>;

    for (const fieldError of body.fieldErrors ?? []) {
      if (
        fieldError.field === 'email' ||
        fieldError.field === 'password' ||
        fieldError.field === 'fullName'
      ) {
        setError(fieldError.field, { message: fieldError.message });
      }
    }

    setFormError(body.message ?? 'Something went wrong. Please try again.');
  });

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="space-y-4 rounded-xl border border-line bg-surface p-6 shadow-xs"
    >
      <h2 className="text-lg font-semibold text-ink">
        {isRegister ? 'Create an account' : 'Sign in'}
      </h2>

      {/* Focus moves here on failure so a keyboard or screen reader user is
          told what went wrong instead of being left at the submit button. */}
      <div ref={errorRef} tabIndex={-1}>
        {formError ? <Alert>{formError}</Alert> : null}
      </div>

      {isRegister ? (
        <Field
          label="Full name"
          autoComplete="name"
          error={errors.fullName?.message}
          {...register('fullName')}
        />
      ) : null}

      <Field
        label="Email"
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...register('email')}
      />

      <Field
        label="Password"
        type="password"
        autoComplete={isRegister ? 'new-password' : 'current-password'}
        hint={isRegister ? 'At least 8 characters.' : undefined}
        error={errors.password?.message}
        {...register('password')}
      />

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}
      </Button>

      <p className="text-center text-sm text-ink-muted">
        {isRegister ? 'Already have an account? ' : 'No account yet? '}
        <Link
          href={isRegister ? '/login' : '/register'}
          className="font-medium text-brand-700 underline underline-offset-2"
        >
          {isRegister ? 'Sign in' : 'Create one'}
        </Link>
      </p>
    </form>
  );
}
