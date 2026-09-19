import type { ReactNode } from 'react';

interface AlertProps {
  title?: string;
  tone?: 'danger' | 'info';
  children: ReactNode;
}

/**
 * role="alert" makes assistive technology announce the message as soon as it
 * appears, which is what a form needs after a failed submit.
 */
export function Alert({ title, tone = 'danger', children }: AlertProps) {
  const tones =
    tone === 'danger'
      ? 'border-danger-600/30 bg-danger-50 text-danger-700'
      : 'border-brand-200 bg-brand-50 text-brand-900';

  return (
    <div role="alert" className={`rounded-lg border px-4 py-3 text-sm ${tones}`}>
      {title ? <p className="font-semibold">{title}</p> : null}
      <div className={title ? 'mt-1' : undefined}>{children}</div>
    </div>
  );
}
