import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common';
import type { FieldErrorDto } from '@cloover/contracts';
import type { ZodType, z } from 'zod';

/**
 * Validates and normalises a request payload against a schema from
 * `@cloover/contracts`, so the API enforces exactly the rules the browser
 * enforces. Failures are reported per field, which lets a form map them back
 * onto its inputs instead of showing one opaque message.
 */
@Injectable()
export class ZodValidationPipe<TSchema extends ZodType> implements PipeTransform {
  constructor(private readonly schema: TSchema) {}

  transform(value: unknown): z.output<TSchema> {
    const result = this.schema.safeParse(value);

    if (result.success) {
      return result.data;
    }

    const fieldErrors: FieldErrorDto[] = result.error.issues.map((issue) => ({
      field: issue.path.map(String).join('.') || '_',
      message: issue.message,
    }));

    throw new BadRequestException({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Validation failed',
      fieldErrors,
    });
  }
}
