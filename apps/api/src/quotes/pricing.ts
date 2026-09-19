import { OFFER_TERM_YEARS, systemPriceCents, type RiskBand } from '@cloover/contracts';

/**
 * Identifies the rule set that produced a quote. Stored on every quote so an
 * issued offer can still be explained after the rules change.
 */
export const PRICING_VERSION = '2026-01-flat-1200';

/** Base annual percentage rate per risk band, in basis points. 690 is 6.9%. */
export const APR_BPS_BY_BAND: Readonly<Record<RiskBand, number>> = Object.freeze({
  A: 690,
  B: 890,
  C: 1190,
});

const BASIS_POINTS_PER_UNIT = 10_000;
const MONTHS_PER_YEAR = 12;

export interface PricingInput {
  monthlyConsumptionKwh: number;
  systemSizeWatts: number;
  downPaymentCents: number;
}

export interface PricedOffer {
  termYears: number;
  aprBps: number;
  principalCents: number;
  monthlyPaymentCents: number;
  totalPaidCents: number;
}

export interface PricingResult {
  systemPriceCents: number;
  downPaymentCents: number;
  principalCents: number;
  riskBand: RiskBand;
  aprBps: number;
  pricingVersion: string;
  offers: PricedOffer[];
}

/**
 * A coarse credit grade. A household that already consumes a lot but wants a
 * modest system is the safest borrower, because the savings comfortably cover
 * the instalment.
 */
export function determineRiskBand(monthlyConsumptionKwh: number, systemSizeKw: number): RiskBand {
  if (monthlyConsumptionKwh >= 400 && systemSizeKw <= 6) {
    return 'A';
  }
  if (monthlyConsumptionKwh >= 250) {
    return 'B';
  }
  return 'C';
}

/**
 * Standard amortisation: the fixed payment that retires `principalCents` over
 * `termYears` at `aprBps`, where every payment covers the interest accrued that
 * month and the remainder reduces the balance.
 *
 *   payment = principal * i / (1 - (1 + i)^-n)
 *
 * with i the monthly rate and n the number of payments.
 *
 * Two edge cases the closed form cannot express are handled explicitly: a
 * fully prepaid system has nothing to finance, and a zero rate degenerates to
 * an equal split of the principal.
 */
export function monthlyPaymentCents(
  principalCents: number,
  aprBps: number,
  termYears: number,
): number {
  if (!Number.isFinite(principalCents) || principalCents < 0) {
    throw new RangeError('principalCents must be a non-negative, finite number');
  }
  if (!Number.isFinite(aprBps) || aprBps < 0) {
    throw new RangeError('aprBps must be a non-negative, finite number');
  }
  if (!Number.isInteger(termYears) || termYears <= 0) {
    throw new RangeError('termYears must be a positive whole number of years');
  }

  const numberOfPayments = termYears * MONTHS_PER_YEAR;

  if (principalCents === 0) {
    return 0;
  }
  if (aprBps === 0) {
    return Math.round(principalCents / numberOfPayments);
  }

  const monthlyRate = aprBps / BASIS_POINTS_PER_UNIT / MONTHS_PER_YEAR;
  const discountFactor = 1 - Math.pow(1 + monthlyRate, -numberOfPayments);

  return Math.round((principalCents * monthlyRate) / discountFactor);
}

/**
 * Prices a pre-qualification request end to end: system price, principal after
 * the down payment, risk band, rate, and one instalment offer per term.
 */
export function priceQuote(input: PricingInput): PricingResult {
  const { monthlyConsumptionKwh, systemSizeWatts, downPaymentCents } = input;

  if (!Number.isInteger(systemSizeWatts) || systemSizeWatts <= 0) {
    throw new RangeError('systemSizeWatts must be a positive whole number of watts');
  }
  if (!Number.isInteger(downPaymentCents) || downPaymentCents < 0) {
    throw new RangeError('downPaymentCents must be a non-negative whole number of cents');
  }

  const systemSizeKw = systemSizeWatts / 1000;
  const priceCents = systemPriceCents(systemSizeKw);

  if (downPaymentCents > priceCents) {
    throw new RangeError('downPaymentCents cannot exceed the system price');
  }

  const principalCents = priceCents - downPaymentCents;
  const riskBand = determineRiskBand(monthlyConsumptionKwh, systemSizeKw);
  const aprBps = APR_BPS_BY_BAND[riskBand];

  const offers = OFFER_TERM_YEARS.map<PricedOffer>((termYears) => {
    const payment = monthlyPaymentCents(principalCents, aprBps, termYears);
    return {
      termYears,
      aprBps,
      principalCents,
      monthlyPaymentCents: payment,
      totalPaidCents: payment * termYears * MONTHS_PER_YEAR,
    };
  });

  return {
    systemPriceCents: priceCents,
    downPaymentCents,
    principalCents,
    riskBand,
    aprBps,
    pricingVersion: PRICING_VERSION,
    offers,
  };
}

export interface ScheduleRow {
  period: number;
  paymentCents: number;
  interestCents: number;
  principalCents: number;
  remainingBalanceCents: number;
}

/**
 * Expands a loan into its instalments.
 *
 * Each month, interest accrues on the outstanding balance and the rest of the
 * payment reduces it. Early instalments are therefore mostly interest, which
 * is the point of showing the schedule at all.
 *
 * Because the monthly payment is rounded to whole cents, replaying it for the
 * full term leaves a small remainder. The final instalment absorbs it, so the
 * balance ends at exactly zero, which is how a lender actually closes a loan.
 */
export function buildSchedule(
  principalCents: number,
  aprBps: number,
  termYears: number,
): ScheduleRow[] {
  const payment = monthlyPaymentCents(principalCents, aprBps, termYears);

  if (principalCents === 0) {
    return [];
  }

  const numberOfPayments = termYears * MONTHS_PER_YEAR;
  const monthlyRate = aprBps / BASIS_POINTS_PER_UNIT / MONTHS_PER_YEAR;
  const rows: ScheduleRow[] = [];

  let balance = principalCents;

  for (let period = 1; period <= numberOfPayments; period += 1) {
    const interest = Math.round(balance * monthlyRate);
    const isFinal = period === numberOfPayments;

    const repaid = isFinal ? balance : Math.min(payment - interest, balance);
    const paid = interest + repaid;

    balance -= repaid;

    rows.push({
      period,
      paymentCents: paid,
      interestCents: interest,
      principalCents: repaid,
      remainingBalanceCents: balance,
    });

    if (balance === 0) {
      break;
    }
  }

  return rows;
}
