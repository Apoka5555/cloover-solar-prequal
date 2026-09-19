import { z } from 'zod';
import { INPUT_LIMITS, OFFER_TERM_YEARS, systemPriceCents } from './domain.js';
import { eurosToCents } from './money.js';

/**
 * Number inputs arrive as strings from HTML form controls and as numbers from
 * JSON clients, so every numeric field is coerced once, here, rather than in
 * each caller. An empty control is treated as "not provided".
 */
const blankToUndefined = (value: unknown) => (value === '' || value === null ? undefined : value);

const trimmedString = z.string().trim();

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(INPUT_LIMITS.email.max, 'Email is too long')
  .pipe(z.email('Enter a valid email address'));

export const passwordSchema = z
  .string()
  .min(
    INPUT_LIMITS.password.min,
    `Password must be at least ${INPUT_LIMITS.password.min} characters`,
  )
  .max(INPUT_LIMITS.password.max, 'Password is too long');

export const fullNameSchema = trimmedString
  .min(INPUT_LIMITS.fullName.min, 'Full name must be at least 2 characters')
  .max(INPUT_LIMITS.fullName.max, 'Full name is too long');

export const registerSchema = z.object({
  fullName: fullNameSchema,
  email: emailSchema,
  password: passwordSchema,
});
export type RegisterInput = z.input<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});
export type LoginInput = z.input<typeof loginSchema>;

export const createQuoteSchema = z
  .object({
    fullName: fullNameSchema.meta({ description: 'Applicant name', examples: ['Ada Lovelace'] }),
    email: emailSchema.meta({ description: 'Applicant email', examples: ['ada@example.com'] }),
    address: trimmedString
      .min(INPUT_LIMITS.address.min, 'Address must be at least 5 characters')
      .max(INPUT_LIMITS.address.max, 'Address is too long')
      .meta({
        description: 'Installation address',
        examples: ['Hauptstrasse 1, 10115 Berlin'],
      }),
    monthlyConsumptionKwh: z
      .preprocess(
        blankToUndefined,
        z.coerce
          .number('Monthly consumption must be a number')
          .int('Monthly consumption must be a whole number of kWh')
          .min(INPUT_LIMITS.monthlyConsumptionKwh.min, 'Monthly consumption must be at least 1 kWh')
          .max(INPUT_LIMITS.monthlyConsumptionKwh.max, 'Monthly consumption looks too high'),
      )
      .meta({
        description: 'Household electricity use per month, in whole kilowatt hours',
        examples: [450],
      }),
    systemSizeKw: z
      .preprocess(
        blankToUndefined,
        z.coerce
          .number('System size must be a number')
          .min(INPUT_LIMITS.systemSizeKw.min, 'System size must be at least 0.1 kW')
          .max(INPUT_LIMITS.systemSizeKw.max, 'System size must be 100 kW or less'),
      )
      .meta({
        description: 'Peak capacity of the proposed array, in kilowatts',
        examples: [6],
      }),
    downPayment: z
      .preprocess(
        blankToUndefined,
        z.coerce
          .number('Down payment must be a number')
          .min(INPUT_LIMITS.downPayment.min, 'Down payment cannot be negative')
          .optional(),
      )
      .meta({
        description:
          'Cash paid upfront in euros. Defaults to zero and may not exceed the system price',
        examples: [1200],
      }),
  })
  .refine(
    (value) =>
      value.downPayment === undefined ||
      eurosToCents(value.downPayment) <= systemPriceCents(value.systemSizeKw),
    {
      path: ['downPayment'],
      error: 'Down payment cannot be more than the system price',
    },
  );

export type CreateQuoteInput = z.input<typeof createQuoteSchema>;
export type CreateQuotePayload = z.output<typeof createQuoteSchema>;

const pageSchema = z.preprocess(blankToUndefined, z.coerce.number().int().min(1).default(1));
const pageSizeSchema = z.preprocess(
  blankToUndefined,
  z.coerce.number().int().min(1).max(100).default(20),
);

export const listQuotesQuerySchema = z.object({
  page: pageSchema,
  pageSize: pageSizeSchema,
});
export type ListQuotesQuery = z.output<typeof listQuotesQuerySchema>;

export const adminListQuotesQuerySchema = z.object({
  page: pageSchema,
  pageSize: pageSizeSchema,
  /** Free-text match against the owner's name or email. */
  search: z.preprocess(blankToUndefined, trimmedString.max(254).optional()),
  userId: z.preprocess(blankToUndefined, z.uuid('userId must be a UUID').optional()),
});
export type AdminListQuotesQuery = z.output<typeof adminListQuotesQuerySchema>;

export const amortizationQuerySchema = z.object({
  termYears: z.preprocess(
    blankToUndefined,
    z.coerce
      .number('Term must be a number')
      .int()
      .refine(
        (value): value is (typeof OFFER_TERM_YEARS)[number] =>
          (OFFER_TERM_YEARS as readonly number[]).includes(value),
        `Term must be one of ${OFFER_TERM_YEARS.join(', ')} years`,
      ),
  ),
});
export type AmortizationQuery = z.output<typeof amortizationQuerySchema>;
