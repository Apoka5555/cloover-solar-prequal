/**
 * Money is stored and computed in integer cents so that repeated arithmetic
 * never accumulates binary floating point error. Only the presentation layer
 * and the JSON contract use euros.
 */
export const CENTS_PER_EURO = 100;

export function eurosToCents(euros: number): number {
  return Math.round(euros * CENTS_PER_EURO);
}

export function centsToEuros(cents: number): number {
  return cents / CENTS_PER_EURO;
}

export function formatEur(euros: number, locale = 'de-DE'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(euros);
}

export function formatPercent(fraction: number, locale = 'de-DE'): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(fraction);
}
