import { formatEur, formatPercent } from '@cloover/contracts';

export { formatEur, formatPercent };

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

export function formatDate(isoTimestamp: string): string {
  return dateFormatter.format(new Date(isoTimestamp));
}

export function formatKw(kilowatts: number): string {
  return `${new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 }).format(kilowatts)} kW`;
}
