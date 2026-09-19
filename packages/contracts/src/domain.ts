import { CENTS_PER_EURO } from './money.js';

export const RISK_BANDS = ['A', 'B', 'C'] as const;
export type RiskBand = (typeof RISK_BANDS)[number];

export const OFFER_TERM_YEARS = [5, 10, 15] as const;
export type OfferTermYears = (typeof OFFER_TERM_YEARS)[number];

export const USER_ROLES = ['USER', 'ADMIN'] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** Flat installed price per kilowatt of system capacity, in euros. */
export const PRICE_PER_KW_EUR = 1200;

/**
 * The single definition of system price. Shared so that the browser can bound
 * the down payment with exactly the number the server will compute.
 */
export function systemPriceCents(systemSizeKw: number): number {
  return Math.round(systemSizeKw * PRICE_PER_KW_EUR * CENTS_PER_EURO);
}

export const INPUT_LIMITS = {
  fullName: { min: 2, max: 120 },
  email: { max: 254 },
  address: { min: 5, max: 255 },
  password: { min: 8, max: 128 },
  monthlyConsumptionKwh: { min: 1, max: 100_000 },
  systemSizeKw: { min: 0.1, max: 100 },
  downPayment: { min: 0 },
} as const;
