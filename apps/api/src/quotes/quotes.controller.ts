import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiOperation,
  ApiProduces,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  amortizationQuerySchema,
  createQuoteSchema,
  quotePdfQuerySchema,
  listQuotesQuerySchema,
  type CreateQuotePayload,
  type AmortizationQuery,
  type AmortizationScheduleDto,
  type ListQuotesQuery,
  type QuotePdfQuery,
  type PageDto,
  type QuoteDto,
  type QuoteSummaryDto,
} from '@cloover/contracts';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { openApiSchemaOf } from '../common/openapi/zod-openapi.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { QuotePdfService } from './quote-pdf.service.js';
import { QuotesService } from './quotes.service.js';

@ApiTags('quotes')
@ApiCookieAuth()
@Controller('quotes')
export class QuotesController {
  constructor(
    private readonly quotes: QuotesService,
    private readonly pdf: QuotePdfService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Price a pre-qualification request and store it' })
  @ApiBody({ schema: openApiSchemaOf(createQuoteSchema) })
  @ApiResponse({ status: 201, description: 'Quote created with three instalment offers' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createQuoteSchema)) body: CreateQuotePayload,
  ): Promise<QuoteDto> {
    return this.quotes.create(user, body);
  }

  @Get()
  @ApiOperation({ summary: "List the signed-in user's own quotes" })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listQuotesQuerySchema)) query: ListQuotesQuery,
  ): Promise<PageDto<QuoteSummaryDto>> {
    return this.quotes.listForOwner(user.id, query);
  }

  @Get(':id/schedule')
  @ApiOperation({ summary: 'Expand one offer into its month-by-month instalments' })
  @ApiQuery({ name: 'termYears', enum: [5, 10, 15], description: 'Which offer to expand' })
  @ApiResponse({ status: 404, description: 'No such quote, or no offer for that term' })
  schedule(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query(new ZodValidationPipe(amortizationQuerySchema)) query: AmortizationQuery,
  ): Promise<AmortizationScheduleDto> {
    return this.quotes.findScheduleFor(id, user, query.termYears);
  }

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Download the quote as a formatted PDF' })
  @ApiQuery({
    name: 'termYears',
    enum: [5, 10, 15],
    required: false,
    description: 'Append this offer\u2019s full payment schedule to the document',
  })
  @ApiProduces('application/pdf')
  @ApiResponse({ status: 200, description: 'The quote as a PDF attachment' })
  async download(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query(new ZodValidationPipe(quotePdfQuerySchema)) query: QuotePdfQuery,
  ): Promise<StreamableFile> {
    // Ownership is enforced by the same reads the JSON endpoints use, so the
    // export cannot reach a quote the caller may not see.
    const quote = await this.quotes.findOneFor(id, user);
    const schedule = query.termYears
      ? await this.quotes.findScheduleFor(id, user, query.termYears)
      : undefined;

    return new StreamableFile(await this.pdf.render(quote, schedule), {
      type: 'application/pdf',
      disposition: `attachment; filename="cloover-quote-${id.slice(0, 8)}.pdf"`,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Fetch one quote' })
  @ApiResponse({ status: 404, description: 'No such quote, or it belongs to another user' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<QuoteDto> {
    return this.quotes.findOneFor(id, user);
  }
}
