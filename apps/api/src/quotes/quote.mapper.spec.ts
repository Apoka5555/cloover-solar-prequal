import { describe, expect, it } from 'vitest';
import { toQuoteDto, toQuoteSummaryDto, type QuoteRecord } from './quote.mapper.js';

const record = {
  id: 'quote-1',
  userId: 'user-1',
  createdAt: new Date('2026-01-15T10:30:00.000Z'),
  fullName: 'Ada Lovelace',
  email: 'ada@example.com',
  address: 'Hauptstrasse 1, 10115 Berlin',
  monthlyConsumptionKwh: 450,
  systemSizeWatts: 6_500,
  downPaymentCents: 120_000,
  systemPriceCents: 780_000,
  principalCents: 660_000,
  riskBand: 'B',
  aprBps: 890,
  pricingVersion: '2026-01-flat-1200',
  offers: [
    {
      id: 'offer-10',
      quoteId: 'quote-1',
      termYears: 10,
      aprBps: 890,
      principalCents: 660_000,
      monthlyPaymentCents: 8_326,
      totalPaidCents: 999_120,
    },
    {
      id: 'offer-5',
      quoteId: 'quote-1',
      termYears: 5,
      aprBps: 890,
      principalCents: 660_000,
      monthlyPaymentCents: 13_668,
      totalPaidCents: 820_080,
    },
  ],
  user: { id: 'user-1', fullName: 'Ada Lovelace', email: 'ada@example.com' },
} as unknown as QuoteRecord;

describe('toQuoteDto', () => {
  it('converts stored integers into the units the contract publishes', () => {
    const dto = toQuoteDto(record);

    expect(dto.input.systemSizeKw).toBe(6.5);
    expect(dto.derived.systemPrice).toBe(7_800);
    expect(dto.derived.principal).toBe(6_600);
    expect(dto.derived.apr).toBe(0.089);
    expect(dto.derived.aprPercent).toBe(8.9);
  });

  it('emits an ISO timestamp rather than a Date', () => {
    expect(toQuoteDto(record).createdAt).toBe('2026-01-15T10:30:00.000Z');
  });

  it('orders offers by term regardless of how the database returned them', () => {
    expect(toQuoteDto(record).offers.map((offer) => offer.termYears)).toEqual([5, 10]);
  });

  it('derives total interest from what is actually paid', () => {
    const [fiveYear] = toQuoteDto(record).offers;

    expect(fiveYear?.totalPaid).toBe(8_200.8);
    expect(fiveYear?.totalInterest).toBeCloseTo(1_600.8, 2);
    expect(fiveYear?.numberOfPayments).toBe(60);
  });

  it('withholds the owner unless the caller is allowed to see it', () => {
    expect(toQuoteDto(record).owner).toBeUndefined();
    expect(toQuoteDto(record, true).owner).toEqual({
      id: 'user-1',
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
    });
  });
});

describe('toQuoteSummaryDto', () => {
  it('carries only what a table row needs', () => {
    const summary = toQuoteSummaryDto(record, true);

    expect(summary).toEqual({
      id: 'quote-1',
      createdAt: '2026-01-15T10:30:00.000Z',
      systemSizeKw: 6.5,
      systemPrice: 7_800,
      riskBand: 'B',
      apr: 0.089,
      aprPercent: 8.9,
      owner: { id: 'user-1', fullName: 'Ada Lovelace', email: 'ada@example.com' },
    });
  });
});
