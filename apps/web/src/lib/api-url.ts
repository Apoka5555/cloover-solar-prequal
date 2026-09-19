/**
 * Where the Next.js server reaches the API. Read on every call rather than at
 * module load so the value comes from the running environment, which is what
 * lets one built image run in development, staging and production unchanged.
 */
export function apiBaseUrl(): string {
  return process.env.API_INTERNAL_URL ?? 'http://localhost:3001';
}
