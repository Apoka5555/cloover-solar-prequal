'use client';

import {
  createQuoteSchema,
  formatEur,
  PRICE_PER_KW_EUR,
  type ApiErrorDto,
  type AuthUserDto,
  type CreateQuoteInput,
  type QuoteDto,
} from '@cloover/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';

const FIELD_NAMES = [
  'fullName',
  'email',
  'address',
  'monthlyConsumptionKwh',
  'systemSizeKw',
  'downPayment',
] as const;

type FieldName = (typeof FIELD_NAMES)[number];

function isFieldName(value: string): value is FieldName {
  return (FIELD_NAMES as readonly string[]).includes(value);
}

/**
 * The form validates against the same schema the API enforces, imported from
 * the shared contracts package, so a rule can never be tightened on one side
 * only.
 */
export function QuoteForm({ user }: { user: AuthUserDto }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CreateQuoteInput>({
    resolver: zodResolver(createQuoteSchema),
    defaultValues: {
      fullName: user.fullName,
      email: user.email,
      address: '',
      monthlyConsumptionKwh: '',
      systemSizeKw: '',
      downPayment: '',
    } as unknown as CreateQuoteInput,
  });

  // useWatch subscribes to one field instead of re-rendering on every change
  // anywhere in the form.
  const systemSizeKw = Number(useWatch({ control, name: 'systemSizeKw' }));
  const estimatedPrice =
    Number.isFinite(systemSizeKw) && systemSizeKw > 0 ? systemSizeKw * PRICE_PER_KW_EUR : null;

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

    const response = await fetch('/api/quotes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(values),
    });

    if (response.ok) {
      const quote = (await response.json()) as QuoteDto;
      router.push(`/quotes/${quote.id}`);
      router.refresh();
      return;
    }

    const body = (await response.json().catch(() => ({}))) as Partial<ApiErrorDto>;

    for (const fieldError of body.fieldErrors ?? []) {
      if (isFieldName(fieldError.field)) {
        setError(fieldError.field, { message: fieldError.message });
      }
    }

    setFormError(body.message ?? 'The quote could not be calculated. Please try again.');
  });

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="space-y-5 rounded-xl border border-line bg-surface p-6 shadow-xs"
    >
      <div ref={errorRef} tabIndex={-1}>
        {formError ? <Alert title="Could not get a pre-qualification">{formError}</Alert> : null}
      </div>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-ink">Applicant</legend>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* defaultValue as well as the form default, so the prefilled values
              are present in the server-rendered HTML rather than appearing
              only once React hydrates. */}
          <Field
            label="Full name"
            autoComplete="name"
            defaultValue={user.fullName}
            error={errors.fullName?.message}
            {...register('fullName')}
          />
          <Field
            label="Email"
            type="email"
            autoComplete="email"
            defaultValue={user.email}
            hint="Taken from your account."
            error={errors.email?.message}
            {...register('email')}
          />
        </div>

        <Field
          label="Installation address"
          autoComplete="street-address"
          error={errors.address?.message}
          {...register('address')}
        />
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-ink">System</legend>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Monthly consumption"
            type="number"
            inputMode="numeric"
            step="1"
            min="1"
            hint="Whole kilowatt hours used per month, from a recent bill."
            error={errors.monthlyConsumptionKwh?.message}
            {...register('monthlyConsumptionKwh')}
          />
          <Field
            label="System size"
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0.1"
            hint={`Peak capacity in kilowatts. Priced at ${formatEur(PRICE_PER_KW_EUR)} per kW.`}
            error={errors.systemSizeKw?.message}
            {...register('systemSizeKw')}
          />
        </div>

        <Field
          label="Down payment (optional)"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          hint="Cash paid upfront, in euros. Everything above this is financed."
          error={errors.downPayment?.message}
          {...register('downPayment')}
        />
      </fieldset>

      {estimatedPrice !== null ? (
        <p aria-live="polite" className="text-sm text-ink-muted">
          Estimated system price:{' '}
          <span className="font-medium text-ink">{formatEur(estimatedPrice)}</span>
        </p>
      ) : null}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Calculating…' : 'Get pre-qualification'}
      </Button>
    </form>
  );
}
