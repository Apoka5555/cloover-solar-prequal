import type { RiskBand, UserRole } from './domain.js';

/** Every monetary field below is expressed in euros. */

export interface QuoteInputDto {
  fullName: string;
  email: string;
  address: string;
  monthlyConsumptionKwh: number;
  systemSizeKw: number;
  downPayment: number;
}

export interface QuoteDerivedDto {
  systemPrice: number;
  downPayment: number;
  principal: number;
  riskBand: RiskBand;
  /** Annual rate as a decimal fraction, for example 0.069. */
  apr: number;
  /** The same rate as a percentage, for example 6.9. */
  aprPercent: number;
  pricingVersion: string;
}

export interface QuoteOfferDto {
  termYears: number;
  apr: number;
  aprPercent: number;
  principalUsed: number;
  monthlyPayment: number;
  numberOfPayments: number;
  totalPaid: number;
  totalInterest: number;
}

export interface QuoteOwnerDto {
  id: string;
  fullName: string;
  email: string;
}

export interface QuoteDto {
  id: string;
  createdAt: string;
  input: QuoteInputDto;
  derived: QuoteDerivedDto;
  offers: QuoteOfferDto[];
  /** Present only when the caller is allowed to see who the quote belongs to. */
  owner?: QuoteOwnerDto;
}

export interface QuoteSummaryDto {
  id: string;
  createdAt: string;
  systemSizeKw: number;
  systemPrice: number;
  riskBand: RiskBand;
  apr: number;
  aprPercent: number;
  owner?: QuoteOwnerDto;
}

export interface PageDto<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface AuthUserDto {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
}

export interface SessionDto {
  user: AuthUserDto;
}

export interface HealthDto {
  status: 'ok' | 'error' | 'shutting_down';
  info?: Record<string, { status: string }>;
  error?: Record<string, { status: string }>;
  details: Record<string, { status: string }>;
}

export interface FieldErrorDto {
  field: string;
  message: string;
}

export interface ApiErrorDto {
  statusCode: number;
  error: string;
  message: string;
  requestId?: string;
  /** Populated for validation failures so a form can map them back to inputs. */
  fieldErrors?: FieldErrorDto[];
}

/**
 * One instalment in an amortisation schedule: what is paid, how it splits
 * between interest and repayment, and what is still owed afterwards.
 */
export interface AmortizationRowDto {
  period: number;
  payment: number;
  interest: number;
  principal: number;
  remainingBalance: number;
}

export interface AmortizationScheduleDto {
  quoteId: string;
  termYears: number;
  apr: number;
  aprPercent: number;
  principal: number;
  monthlyPayment: number;
  totalPaid: number;
  totalInterest: number;
  rows: AmortizationRowDto[];
}
