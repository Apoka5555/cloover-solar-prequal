import type { InputHTMLAttributes, ReactNode } from 'react';

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
  error?: string | undefined;
  hint?: ReactNode;
}

/**
 * One labelled control.
 *
 * The label is tied to the input by id rather than by wrapping, the hint and
 * the error are referenced through aria-describedby so a screen reader
 * announces them with the field, and aria-invalid marks the field itself
 * rather than relying on colour alone.
 */
export function Field({ label, name, error, hint, className = '', ...props }: FieldProps) {
  const hintId = hint ? `${name}-hint` : undefined;
  const errorId = error ? `${name}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={className}>
      <label htmlFor={name} className="block text-sm font-medium text-ink">
        {label}
      </label>

      {hint ? (
        <p id={hintId} className="mt-1 text-xs text-ink-muted">
          {hint}
        </p>
      ) : null}

      <input
        {...props}
        id={name}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`mt-1.5 block w-full rounded-lg border bg-white px-3 py-2 text-sm text-ink shadow-xs placeholder:text-ink-muted ${
          error ? 'border-danger-600' : 'border-line'
        }`}
      />

      {error ? (
        <p id={errorId} className="mt-1.5 text-sm text-danger-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
