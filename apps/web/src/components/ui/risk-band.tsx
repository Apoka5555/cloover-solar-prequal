import type { RiskBand } from '@cloover/contracts';

const DESCRIPTIONS: Record<RiskBand, string> = {
  A: 'Band A, the lowest rate',
  B: 'Band B, the middle rate',
  C: 'Band C, the highest rate',
};

const STYLES: Record<RiskBand, string> = {
  A: 'bg-brand-100 text-brand-900',
  B: 'bg-amber-100 text-amber-900',
  C: 'bg-danger-50 text-danger-700',
};

/**
 * The letter is the visual cue, but colour alone never carries the meaning:
 * the full description is read out to assistive technology.
 */
export function RiskBandBadge({ band }: { band: RiskBand }) {
  return (
    <span
      className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-semibold ${STYLES[band]}`}
    >
      <span aria-hidden="true">{band}</span>
      <span className="sr-only">{DESCRIPTIONS[band]}</span>
    </span>
  );
}
