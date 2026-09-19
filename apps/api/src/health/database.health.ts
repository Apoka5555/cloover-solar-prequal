import { Injectable } from '@nestjs/common';
import { HealthIndicatorService, type HealthIndicatorResult } from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service.js';

const PROBE_TIMEOUT_MS = 3_000;
const PROBE_CACHE_MS = 2_000;

@Injectable()
export class DatabaseHealthIndicator {
  constructor(
    private readonly health: HealthIndicatorService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * A trivial round trip is enough: it proves a connection can be taken from
   * the pool and that the server answers. Results are cached briefly so that
   * frequent probes cannot themselves exhaust the pool.
   */
  check(): PromiseLike<HealthIndicatorResult> {
    return this.health
      .check('database')
      .attempt(async () => {
        await this.prisma.$queryRaw`SELECT 1`;
      })
      .withTimeout(PROBE_TIMEOUT_MS)
      .cacheFor(PROBE_CACHE_MS);
  }
}
