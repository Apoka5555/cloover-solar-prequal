import { describe, expect, it } from 'vitest';
import {
  adminListQuotesQuerySchema,
  createQuoteSchema,
  listQuotesQuerySchema,
  loginSchema,
  registerSchema,
} from './schemas.js';

const validQuote = {
  fullName: 'Ada Lovelace',
  email: 'ada@example.com',
  address: 'Hauptstrasse 1, 10115 Berlin',
  monthlyConsumptionKwh: 450,
  systemSizeKw: 6,
  downPayment: 1200,
};

function errorFor(result: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }) {
  return result.error?.issues.map((issue) => issue.path.join('.')) ?? [];
}

describe('createQuoteSchema', () => {
  it('accepts a well formed quote request', () => {
    const result = createQuoteSchema.safeParse(validQuote);
    expect(result.success).toBe(true);
  });

  it('treats the down payment as optional', () => {
    const { downPayment: _ignored, ...withoutDownPayment } = validQuote;
    const result = createQuoteSchema.safeParse(withoutDownPayment);
    expect(result.success).toBe(true);
    expect(result.data?.downPayment).toBeUndefined();
  });

  it('coerces the numeric strings that HTML inputs produce', () => {
    const result = createQuoteSchema.safeParse({
      ...validQuote,
      monthlyConsumptionKwh: '450',
      systemSizeKw: '6.5',
      downPayment: '1200',
    });
    expect(result.success).toBe(true);
    expect(result.data?.systemSizeKw).toBe(6.5);
  });

  it('treats an empty down payment field as not provided', () => {
    const result = createQuoteSchema.safeParse({ ...validQuote, downPayment: '' });
    expect(result.success).toBe(true);
    expect(result.data?.downPayment).toBeUndefined();
  });

  it('normalises the email to lower case and trims whitespace', () => {
    const result = createQuoteSchema.safeParse({
      ...validQuote,
      email: '  ADA@Example.COM ',
      fullName: '  Ada Lovelace  ',
    });
    expect(result.data?.email).toBe('ada@example.com');
    expect(result.data?.fullName).toBe('Ada Lovelace');
  });

  it('rejects a down payment larger than the system price', () => {
    const result = createQuoteSchema.safeParse({ ...validQuote, downPayment: 7200.01 });
    expect(result.success).toBe(false);
    expect(errorFor(result)).toContain('downPayment');
  });

  it('accepts a down payment exactly equal to the system price', () => {
    const result = createQuoteSchema.safeParse({ ...validQuote, downPayment: 7200 });
    expect(result.success).toBe(true);
  });

  it('rejects a negative down payment', () => {
    const result = createQuoteSchema.safeParse({ ...validQuote, downPayment: -1 });
    expect(errorFor(result)).toContain('downPayment');
  });

  it.each([
    ['a non-numeric system size', { systemSizeKw: 'six' }, 'systemSizeKw'],
    ['a zero system size', { systemSizeKw: 0 }, 'systemSizeKw'],
    ['an oversized system', { systemSizeKw: 101 }, 'systemSizeKw'],
    ['zero consumption', { monthlyConsumptionKwh: 0 }, 'monthlyConsumptionKwh'],
    ['an invalid email', { email: 'not-an-email' }, 'email'],
    ['a one-character name', { fullName: 'A' }, 'fullName'],
    ['a too-short address', { address: 'abc' }, 'address'],
  ])('rejects %s', (_label, patch, expectedPath) => {
    const result = createQuoteSchema.safeParse({ ...validQuote, ...patch });
    expect(result.success).toBe(false);
    expect(errorFor(result)).toContain(expectedPath);
  });
});

describe('registerSchema', () => {
  it('requires a password of at least eight characters', () => {
    const base = { fullName: 'Ada Lovelace', email: 'ada@example.com' };
    expect(registerSchema.safeParse({ ...base, password: 'short' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, password: 'longenough1' }).success).toBe(true);
  });
});

describe('loginSchema', () => {
  it('does not impose password rules on sign-in', () => {
    const result = loginSchema.safeParse({ email: 'ADA@example.com', password: 'x' });
    expect(result.success).toBe(true);
    expect(result.data?.email).toBe('ada@example.com');
  });
});

describe('list query schemas', () => {
  it('applies defaults when no pagination is supplied', () => {
    expect(listQuotesQuerySchema.parse({})).toEqual({ page: 1, pageSize: 20 });
  });

  it('caps the page size', () => {
    expect(listQuotesQuerySchema.safeParse({ pageSize: '500' }).success).toBe(false);
  });

  it('accepts an optional owner filter on the admin query', () => {
    const parsed = adminListQuotesQuerySchema.parse({ search: '  ada  ', userId: '' });
    expect(parsed.search).toBe('ada');
    expect(parsed.userId).toBeUndefined();
  });

  it('rejects a non-UUID owner filter', () => {
    expect(adminListQuotesQuerySchema.safeParse({ userId: 'nope' }).success).toBe(false);
  });
});
