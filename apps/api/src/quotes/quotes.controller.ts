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
} from '@nestjs/common';
import { ApiBody, ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  createQuoteSchema,
  listQuotesQuerySchema,
  type CreateQuotePayload,
  type ListQuotesQuery,
  type PageDto,
  type QuoteDto,
  type QuoteSummaryDto,
} from '@cloover/contracts';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { openApiSchemaOf } from '../common/openapi/zod-openapi.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { QuotesService } from './quotes.service.js';

@ApiTags('quotes')
@ApiCookieAuth()
@Controller('quotes')
export class QuotesController {
  constructor(private readonly quotes: QuotesService) {}

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
