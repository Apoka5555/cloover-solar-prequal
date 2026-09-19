import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService, type HealthCheckResult } from '@nestjs/terminus';
import { Public } from '../common/decorators/public.decorator.js';
import { DatabaseHealthIndicator } from './database.health.js';

interface LivenessDto {
  status: 'ok';
  uptimeSeconds: number;
}

/**
 * Liveness and readiness are deliberately separate.
 *
 * Liveness answers "is this process still working"; an orchestrator restarts
 * the container when it fails. Readiness answers "can this process serve
 * traffic right now"; failing it removes the instance from the load balancer.
 * Checking the database under liveness would turn a brief database outage into
 * a cluster-wide restart loop, so only readiness touches it.
 */
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly database: DatabaseHealthIndicator,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Liveness probe. Succeeds whenever the process is running' })
  @ApiResponse({ status: 200, description: 'Process is alive' })
  liveness(): LivenessDto {
    return { status: 'ok', uptimeSeconds: Math.round(process.uptime()) };
  }

  @Public()
  @Get('ready')
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness probe. Fails while the database is unreachable' })
  @ApiResponse({ status: 200, description: 'Ready to serve traffic' })
  @ApiResponse({ status: 503, description: 'A dependency is unavailable' })
  readiness(): Promise<HealthCheckResult> {
    return this.health.check([() => this.database.check()]);
  }
}
