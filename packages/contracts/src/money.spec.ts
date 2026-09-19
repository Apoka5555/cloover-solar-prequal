import { describe, expect, it } from 'vitest';
import { centsToEuros, eurosToCents, formatEur, formatPercent } from './money.js';

describe('money', () => {
  it('converts euros to whole cents', () => {
    expect(eurosToCents(1200)).toBe(120_000);
    expect(eurosToCents(0)).toBe(0);
  });

  it('rounds sub-cent amounts rather than truncating', () => {
    expect(eurosToCents(10.005)).toBe(1001);
    expect(eurosToCents(10.004)).toBe(1000);
  });

  it('survives values that are not exactly representable as binary floats', () => {
    expect(eurosToCents(7620.0000000001)).toBe(762_000);
    expect(eurosToCents(0.1 + 0.2)).toBe(30);
  });

  it('round-trips through cents without drift', () => {
    expect(centsToEuros(eurosToCents(1234.56))).toBe(1234.56);
  });

  it('formats euros and percentages for a German audience', () => {
    expect(formatEur(1234.5).replace(/ /g, ' ')).toBe('1.234,50 €');
    expect(formatPercent(0.069).replace(/ /g, ' ')).toBe('6,9 %');
  });
});
