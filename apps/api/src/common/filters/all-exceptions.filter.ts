import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { ApiErrorDto, FieldErrorDto } from '@cloover/contracts';
import type { Request, Response } from 'express';

const SERVER_ERROR_THRESHOLD = 500;

interface HttpExceptionBody {
  message?: string | string[];
  error?: string;
  fieldErrors?: FieldErrorDto[];
}

/**
 * Turns every failure into one response shape, so clients never have to guess
 * how an error is encoded. Unexpected failures are logged with their stack and
 * reported as a generic 500, so internal detail does not leak to callers.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const request = http.getRequest<Request & { id?: string }>();
    const requestId = typeof request.id === 'string' ? request.id : undefined;

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const body: ApiErrorDto = {
      statusCode: status,
      error: HttpStatus[status] ?? 'Error',
      message: 'Internal server error',
      ...(requestId ? { requestId } : {}),
    };

    if (exception instanceof HttpException) {
      const payload = exception.getResponse();

      if (typeof payload === 'string') {
        body.message = payload;
      } else {
        const details = payload as HttpExceptionBody;
        body.message = Array.isArray(details.message)
          ? details.message.join('; ')
          : (details.message ?? exception.message);
        body.error = details.error ?? body.error;
        if (details.fieldErrors) {
          body.fieldErrors = details.fieldErrors;
        }
      }
    }

    if (status >= SERVER_ERROR_THRESHOLD) {
      this.logger.error(
        `${request.method} ${request.url} failed`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json(body);
  }
}
