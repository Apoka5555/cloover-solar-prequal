import { Module } from '@nestjs/common';
import { AdminQuotesController } from './admin-quotes.controller.js';
import { QuotesController } from './quotes.controller.js';
import { QuotesService } from './quotes.service.js';

@Module({
  controllers: [QuotesController, AdminQuotesController],
  providers: [QuotesService],
})
export class QuotesModule {}
