import { describe, expect, it } from 'vitest';
import { PRICE_PER_KW_EUR, systemPriceCents } from './domain.js';

describe('systemPriceCents', () => {
  it('charges a flat rate per kilowatt', () => {
    expect(systemPriceCents(1)).toBe(PRICE_PER_KW_EUR * 100);
    expect(systemPriceCents(6)).toBe(720_000);
  });

  it('handles fractional system sizes without floating point drift', () => {
    expect(systemPriceCents(6.35)).toBe(762_000);
    expect(systemPriceCents(0.1)).toBe(12_000);
    expect(systemPriceCents(7.7)).toBe(924_000);
  });

  it('returns zero for a zero-sized system', () => {
    expect(systemPriceCents(0)).toBe(0);
  });
});
