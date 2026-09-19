import { Injectable } from '@nestjs/common';
import argon2 from 'argon2';

/**
 * Argon2id with the parameters OWASP recommends as a floor: 19 MiB of memory,
 * two iterations, one lane. Argon2 embeds the salt and parameters in the hash,
 * so stored hashes remain verifiable after the cost is raised.
 */
const HASH_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

/**
 * A hash of a value no one will ever submit. Verifying against it lets an
 * unknown-email sign-in attempt cost the same as a known one, so response time
 * does not reveal which addresses are registered.
 */
let decoyHash: string | undefined;

@Injectable()
export class PasswordService {
  hash(plain: string): Promise<string> {
    return argon2.hash(plain, HASH_OPTIONS);
  }

  async verify(hash: string, plain: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plain);
    } catch {
      return false;
    }
  }

  async burnTime(plain: string): Promise<void> {
    decoyHash ??= await argon2.hash('cloover-timing-decoy', HASH_OPTIONS);
    await this.verify(decoyHash, plain);
  }
}
