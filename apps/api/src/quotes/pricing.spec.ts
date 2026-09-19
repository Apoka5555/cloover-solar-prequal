import { describe, expect, it } from 'vitest';
import {
  APR_BPS_BY_BAND,
  buildSchedule,
  determineRiskBand,
  monthlyPaymentCents,
  priceQuote,
  PRICING_VERSION,
} from './pricing.js';

describe('determineRiskBand', () => {
  it('grades high consumption with a modest system as band A', () => {
    expect(determineRiskBand(400, 6)).toBe('A');
    expect(determineRiskBand(900, 3)).toBe('A');
  });

  it('applies the band A thresholds inclusively', () => {
    expect(determineRiskBand(400, 6)).toBe('A');
    expect(determineRiskBand(399, 6)).toBe('B');
    expect(determineRiskBand(400, 6.001)).toBe('B');
  });

  it('falls back to band B once consumption reaches 250 kWh', () => {
    expect(determineRiskBand(250, 12)).toBe('B');
    expect(determineRiskBand(399, 2)).toBe('B');
    expect(determineRiskBand(1000, 20)).toBe('B');
  });

  it('grades everything below 250 kWh as band C', () => {
    expect(determineRiskBand(249, 2)).toBe('C');
    expect(determineRiskBand(1, 100)).toBe('C');
  });
});

describe('monthlyPaymentCents', () => {
  // Reference values produced by the standard amortisation formula and checked
  // against an independent calculator.
  it.each([
    [600_000, 690, 5, 11_852],
    [600_000, 690, 10, 6_936],
    [600_000, 690, 15, 5_359],
    [720_000, 890, 10, 9_082],
    [1_200_000, 1_190, 15, 14_325],
  ])('amortises %i cents at %i bps over %i years', (principal, aprBps, termYears, expected) => {
    expect(monthlyPaymentCents(principal, aprBps, termYears)).toBe(expected);
  });

  it('charges nothing when the system is fully prepaid', () => {
    expect(monthlyPaymentCents(0, 690, 5)).toBe(0);
    expect(monthlyPaymentCents(0, 1_190, 15)).toBe(0);
  });

  it('splits the principal evenly at a zero rate', () => {
    expect(monthlyPaymentCents(600_000, 0, 5)).toBe(10_000);
  });

  it('lowers the payment as the term lengthens', () => {
    const five = monthlyPaymentCents(600_000, 690, 5);
    const ten = monthlyPaymentCents(600_000, 690, 10);
    const fifteen = monthlyPaymentCents(600_000, 690, 15);
    expect(five).toBeGreaterThan(ten);
    expect(ten).toBeGreaterThan(fifteen);
  });

  it('raises the payment as the rate rises', () => {
    expect(monthlyPaymentCents(600_000, 1_190, 10)).toBeGreaterThan(
      monthlyPaymentCents(600_000, 690, 10),
    );
  });

  it.each([
    ['a negative principal', -1, 690, 5],
    ['a negative rate', 600_000, -1, 5],
    ['a zero term', 600_000, 690, 0],
    ['a fractional term', 600_000, 690, 5.5],
  ])('rejects %s', (_label, principal, aprBps, termYears) => {
    expect(() => monthlyPaymentCents(principal, aprBps, termYears)).toThrow(RangeError);
  });

  /**
   * Replays the loan month by month. If the closed form is right, paying the
   * computed instalment every month leaves a balance of at most one instalment
   * at the end, which the final payment absorbs.
   */
  it.each([
    [600_000, 690, 5],
    [600_000, 890, 10],
    [1_500_000, 1_190, 15],
  ])('retires %i cents at %i bps over %i years when simulated', (principal, aprBps, termYears) => {
    const payment = monthlyPaymentCents(principal, aprBps, termYears);
    const monthlyRate = aprBps / 10_000 / 12;
    let balance = principal;

    for (let month = 0; month < termYears * 12; month += 1) {
      balance = balance + balance * monthlyRate - payment;
    }

    expect(Math.abs(balance)).toBeLessThan(payment);
  });
});

describe('priceQuote', () => {
  const bandAInput = {
    monthlyConsumptionKwh: 450,
    systemSizeWatts: 6_000,
    downPaymentCents: 120_000,
  };

  it('prices the worked example from the README', () => {
    const result = priceQuote(bandAInput);

    expect(result.systemPriceCents).toBe(720_000);
    expect(result.downPaymentCents).toBe(120_000);
    expect(result.principalCents).toBe(600_000);
    expect(result.riskBand).toBe('A');
    expect(result.aprBps).toBe(690);
    expect(result.pricingVersion).toBe(PRICING_VERSION);
    expect(result.offers.map((offer) => offer.monthlyPaymentCents)).toEqual([11_852, 6_936, 5_359]);
  });

  it('always returns the three advertised terms in ascending order', () => {
    expect(priceQuote(bandAInput).offers.map((offer) => offer.termYears)).toEqual([5, 10, 15]);
  });

  it('charges the whole system price when no down payment is made', () => {
    const result = priceQuote({ ...bandAInput, downPaymentCents: 0 });
    expect(result.principalCents).toBe(720_000);
  });

  it('produces zero-cost offers when the customer prepays in full', () => {
    const result = priceQuote({ ...bandAInput, downPaymentCents: 720_000 });

    expect(result.principalCents).toBe(0);
    for (const offer of result.offers) {
      expect(offer.monthlyPaymentCents).toBe(0);
      expect(offer.totalPaidCents).toBe(0);
    }
  });

  it('rejects a down payment larger than the system price', () => {
    expect(() => priceQuote({ ...bandAInput, downPaymentCents: 720_001 })).toThrow(RangeError);
  });

  it('applies the band rate to every offer', () => {
    const result = priceQuote({ ...bandAInput, monthlyConsumptionKwh: 100 });

    expect(result.riskBand).toBe('C');
    expect(result.aprBps).toBe(APR_BPS_BY_BAND.C);
    for (const offer of result.offers) {
      expect(offer.aprBps).toBe(APR_BPS_BY_BAND.C);
      expect(offer.principalCents).toBe(result.principalCents);
    }
  });

  it('charges more interest in total the longer the term runs', () => {
    const [five, ten, fifteen] = priceQuote(bandAInput).offers;

    expect(five.totalPaidCents).toBeLessThan(ten.totalPaidCents);
    expect(ten.totalPaidCents).toBeLessThan(fifteen.totalPaidCents);
    expect(five.totalPaidCents).toBeGreaterThan(five.principalCents);
  });

  it('prices fractional system sizes without floating point drift', () => {
    const result = priceQuote({
      monthlyConsumptionKwh: 300,
      systemSizeWatts: 6_350,
      downPaymentCents: 0,
    });

    expect(result.systemPriceCents).toBe(762_000);
    expect(result.riskBand).toBe('B');
  });

  it.each([
    ['a zero system size', { systemSizeWatts: 0 }],
    ['a fractional watt count', { systemSizeWatts: 6_000.5 }],
    ['a negative down payment', { downPaymentCents: -1 }],
    ['a fractional down payment', { downPaymentCents: 100.5 }],
  ])('rejects %s', (_label, patch) => {
    expect(() => priceQuote({ ...bandAInput, ...patch })).toThrow(RangeError);
  });
});

describe('buildSchedule', () => {
  it('produces one row per instalment', () => {
    expect(buildSchedule(600_000, 690, 5)).toHaveLength(60);
    expect(buildSchedule(600_000, 690, 15)).toHaveLength(180);
  });

  it('retires the loan exactly, leaving no balance', () => {
    const rows = buildSchedule(600_000, 690, 10);
    expect(rows.at(-1)?.remainingBalanceCents).toBe(0);
  });

  it('splits every instalment into interest and repayment', () => {
    for (const row of buildSchedule(600_000, 890, 5)) {
      expect(row.interestCents + row.principalCents).toBe(row.paymentCents);
      expect(row.interestCents).toBeGreaterThanOrEqual(0);
      expect(row.principalCents).toBeGreaterThan(0);
    }
  });

  it('repays the full principal across the schedule', () => {
    const rows = buildSchedule(600_000, 690, 10);
    const repaid = rows.reduce((total, row) => total + row.principalCents, 0);
    expect(repaid).toBe(600_000);
  });

  it('shifts from interest towards principal over the term', () => {
    const rows = buildSchedule(600_000, 1_190, 15);
    const first = rows[0];
    const last = rows.at(-1);

    expect(first.interestCents).toBeGreaterThan(first.principalCents);
    expect(last?.principalCents).toBeGreaterThan(last?.interestCents ?? 0);
  });

  it('charges interest on the opening balance in the first month', () => {
    const [first] = buildSchedule(600_000, 690, 5);
    expect(first?.interestCents).toBe(Math.round(600_000 * (0.069 / 12)));
  });

  it('agrees with the offer on what the loan costs in total', () => {
    const rows = buildSchedule(600_000, 690, 10);
    const interest = rows.reduce((total, row) => total + row.interestCents, 0);
    const paid = rows.reduce((total, row) => total + row.paymentCents, 0);

    expect(paid - interest).toBe(600_000);
    // The rounded instalment overstates the total very slightly; the schedule
    // is the exact figure and must not drift far from the advertised one.
    expect(Math.abs(paid - 6_936 * 120)).toBeLessThan(6_936);
  });

  it('returns nothing to schedule for a fully prepaid system', () => {
    expect(buildSchedule(0, 690, 5)).toEqual([]);
  });
});
