import { Controller, Get, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  adminListQuotesQuerySchema,
  type AdminListQuotesQuery,
  type PageDto,
  type QuoteOwnerDto,
  type QuoteSummaryDto,
} from '@cloover/contracts';
import { Roles } from '../common/decorators/roles.decorator.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { QuotesService } from './quotes.service.js';

/**
 * Administrative reads over every user's quotes. The role requirement lives on
 * the controller, so every route added here is restricted by default.
 */
@ApiTags('admin')
@ApiCookieAuth()
@Roles('ADMIN')
@Controller('admin/quotes')
export class AdminQuotesController {
  constructor(private readonly quotes: QuotesService) {}

  @Get()
  @ApiOperation({ summary: 'List all quotes, optionally filtered by owner' })
  @ApiResponse({ status: 403, description: 'Caller is not an administrator' })
  list(
    @Query(new ZodValidationPipe(adminListQuotesQuerySchema)) query: AdminListQuotesQuery,
  ): Promise<PageDto<QuoteSummaryDto>> {
    return this.quotes.listAll(query);
  }

  @Get('owners')
  @ApiOperation({ summary: 'List the users who have requested quotes' })
  listOwners(): Promise<QuoteOwnerDto[]> {
    return this.quotes.listOwners();
  }
}
