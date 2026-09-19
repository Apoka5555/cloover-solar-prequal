import {
  centsToEuros,
  type QuoteDto,
  type QuoteOfferDto,
  type QuoteOwnerDto,
  type QuoteSummaryDto,
  type RiskBand,
} from '@cloover/contracts';
import type { Quote, QuoteOffer, User } from '../generated/prisma/client.js';

const BASIS_POINTS_PER_UNIT = 10_000;
const BASIS_POINTS_PER_PERCENT = 100;
const MONTHS_PER_YEAR = 12;

export type QuoteRecord = Quote & {
  offers: QuoteOffer[];
  user?: Pick<User, 'id' | 'fullName' | 'email'> | null;
};

/**
 * Translates persisted rows into the wire format.
 *
 * The database stores integers only: cents for money, watts for capacity and
 * basis points for rates. The public contract is expressed in the units a
 * person reads, so the conversion happens here and nowhere else.
 */
export function toQuoteDto(quote: QuoteRecord, includeOwner = false): QuoteDto {
  return {
    id: quote.id,
    createdAt: quote.createdAt.toISOString(),
    input: {
      fullName: quote.fullName,
      email: quote.email,
      address: quote.address,
      monthlyConsumptionKwh: quote.monthlyConsumptionKwh,
      systemSizeKw: quote.systemSizeWatts / 1000,
      downPayment: centsToEuros(quote.downPaymentCents),
    },
    derived: {
      systemPrice: centsToEuros(quote.systemPriceCents),
      downPayment: centsToEuros(quote.downPaymentCents),
      principal: centsToEuros(quote.principalCents),
      riskBand: quote.riskBand as RiskBand,
      apr: quote.aprBps / BASIS_POINTS_PER_UNIT,
      aprPercent: quote.aprBps / BASIS_POINTS_PER_PERCENT,
      pricingVersion: quote.pricingVersion,
    },
    offers: [...quote.offers]
      .sort((left, right) => left.termYears - right.termYears)
      .map(toOfferDto),
    ...(includeOwner && quote.user ? { owner: toOwnerDto(quote.user) } : {}),
  };
}

export function toQuoteSummaryDto(quote: QuoteRecord, includeOwner = false): QuoteSummaryDto {
  return {
    id: quote.id,
    createdAt: quote.createdAt.toISOString(),
    systemSizeKw: quote.systemSizeWatts / 1000,
    systemPrice: centsToEuros(quote.systemPriceCents),
    riskBand: quote.riskBand as RiskBand,
    apr: quote.aprBps / BASIS_POINTS_PER_UNIT,
    aprPercent: quote.aprBps / BASIS_POINTS_PER_PERCENT,
    ...(includeOwner && quote.user ? { owner: toOwnerDto(quote.user) } : {}),
  };
}

function toOfferDto(offer: QuoteOffer): QuoteOfferDto {
  return {
    termYears: offer.termYears,
    apr: offer.aprBps / BASIS_POINTS_PER_UNIT,
    aprPercent: offer.aprBps / BASIS_POINTS_PER_PERCENT,
    principalUsed: centsToEuros(offer.principalCents),
    monthlyPayment: centsToEuros(offer.monthlyPaymentCents),
    numberOfPayments: offer.termYears * MONTHS_PER_YEAR,
    totalPaid: centsToEuros(offer.totalPaidCents),
    totalInterest: centsToEuros(offer.totalPaidCents - offer.principalCents),
  };
}

function toOwnerDto(user: Pick<User, 'id' | 'fullName' | 'email'>): QuoteOwnerDto {
  return { id: user.id, fullName: user.fullName, email: user.email };
}
