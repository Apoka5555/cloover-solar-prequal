import { z, type ZodType } from 'zod';

type OpenApiSchema = Record<string, unknown>;

/**
 * Derives an OpenAPI schema from a validation schema, so the published
 * documentation is generated from the rules the API actually enforces and
 * cannot drift away from them.
 */
export function openApiSchemaOf(schema: ZodType): OpenApiSchema {
  return z.toJSONSchema(schema, {
    io: 'input',
    target: 'openapi-3.0',
    unrepresentable: 'any',
  }) as OpenApiSchema;
}
