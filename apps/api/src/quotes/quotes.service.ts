import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  eurosToCents,
  type AdminListQuotesQuery,
  type CreateQuotePayload,
  type ListQuotesQuery,
  type PageDto,
  type QuoteDto,
  type QuoteOwnerDto,
  type QuoteSummaryDto,
} from '@cloover/contracts';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { priceQuote } from './pricing.js';
import { toQuoteDto, toQuoteSummaryDto } from './quote.mapper.js';

const WITH_OFFERS_AND_OWNER = {
  offers: true,
  user: { select: { id: true, fullName: true, email: true } },
} as const;

@Injectable()
export class QuotesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Prices a request and stores the inputs together with everything derived
   * from them, so the quote can be reproduced exactly as it was issued.
   */
  async create(owner: AuthenticatedUser, input: CreateQuotePayload): Promise<QuoteDto> {
    // Capacity is persisted as whole watts, so the price is computed from the
    // rounded figure rather than the raw input. Otherwise a quote read back
    // from the database would not reprice to the number it was sold at.
    const systemSizeWatts = Math.round(input.systemSizeKw * 1000);
    const downPaymentCents = eurosToCents(input.downPayment ?? 0);

    let pricing;
    try {
      pricing = priceQuote({
        monthlyConsumptionKwh: input.monthlyConsumptionKwh,
        systemSizeWatts,
        downPaymentCents,
      });
    } catch (error) {
      // The shared schema already rejects these, so reaching here means a
      // client bypassed it. Report it as a client error, not a crash.
      throw new BadRequestException(
        error instanceof RangeError ? error.message : 'Quote could not be priced',
      );
    }

    const quote = await this.prisma.quote.create({
      data: {
        userId: owner.id,
        fullName: input.fullName,
        email: input.email,
        address: input.address,
        monthlyConsumptionKwh: input.monthlyConsumptionKwh,
        systemSizeWatts,
        downPaymentCents: pricing.downPaymentCents,
        systemPriceCents: pricing.systemPriceCents,
        principalCents: pricing.principalCents,
        riskBand: pricing.riskBand,
        aprBps: pricing.aprBps,
        pricingVersion: pricing.pricingVersion,
        offers: { create: pricing.offers },
      },
      include: WITH_OFFERS_AND_OWNER,
    });

    return toQuoteDto(quote, owner.role === 'ADMIN');
  }

  /**
   * Reads one quote on behalf of a caller.
   *
   * A quote that exists but belongs to someone else is reported as missing
   * rather than forbidden, so the endpoint cannot be used to discover which
   * identifiers are real.
   */
  async findOneFor(id: string, requester: AuthenticatedUser): Promise<QuoteDto> {
    const isAdmin = requester.role === 'ADMIN';

    const quote = await this.prisma.quote.findFirst({
      where: { id, ...(isAdmin ? {} : { userId: requester.id }) },
      include: WITH_OFFERS_AND_OWNER,
    });

    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    return toQuoteDto(quote, isAdmin);
  }

  listForOwner(ownerId: string, query: ListQuotesQuery): Promise<PageDto<QuoteSummaryDto>> {
    return this.paginate({ userId: ownerId }, query.page, query.pageSize, false);
  }

  listAll(query: AdminListQuotesQuery): Promise<PageDto<QuoteSummaryDto>> {
    const where: Prisma.QuoteWhereInput = {};

    if (query.userId) {
      where.userId = query.userId;
    }
    if (query.search) {
      where.user = {
        OR: [
          { fullName: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
        ],
      };
    }

    return this.paginate(where, query.page, query.pageSize, true);
  }

  /** Every user who has requested at least one quote, for the admin filter. */
  async listOwners(): Promise<QuoteOwnerDto[]> {
    const users = await this.prisma.user.findMany({
      where: { quotes: { some: {} } },
      select: { id: true, fullName: true, email: true },
      orderBy: { fullName: 'asc' },
    });

    return users;
  }

  private async paginate(
    where: Prisma.QuoteWhereInput,
    page: number,
    pageSize: number,
    includeOwner: boolean,
  ): Promise<PageDto<QuoteSummaryDto>> {
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.quote.count({ where }),
      this.prisma.quote.findMany({
        where,
        include: WITH_OFFERS_AND_OWNER,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items: rows.map((row) => toQuoteSummaryDto(row, includeOwner)),
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }
}
