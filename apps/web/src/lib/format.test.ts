import { describe, expect, it } from 'vitest';
import { formatDate, formatEur, formatKw, formatPercent } from './format';

describe('formatting', () => {
  it('formats euros in the German convention', () => {
    expect(formatEur(7200).replace(/ /g, ' ')).toBe('7.200,00 €');
    expect(formatEur(118.52).replace(/ /g, ' ')).toBe('118,52 €');
  });

  it('formats a rate as a percentage', () => {
    expect(formatPercent(0.069).replace(/ /g, ' ')).toBe('6,9 %');
    expect(formatPercent(0.119).replace(/ /g, ' ')).toBe('11,9 %');
  });

  it('formats a date without exposing the raw timestamp', () => {
    expect(formatDate('2026-01-15T10:30:00.000Z')).toBe('15 Jan 2026');
  });

  it('drops trailing zeros from a system size', () => {
    expect(formatKw(6)).toBe('6 kW');
    expect(formatKw(9.5)).toBe('9.5 kW');
  });
});
