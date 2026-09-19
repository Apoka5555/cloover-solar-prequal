import { describe, expect, it } from 'vitest';
import { PasswordService } from './password.service.js';

describe('PasswordService', () => {
  const passwords = new PasswordService();

  it('accepts the password it hashed', async () => {
    const hash = await passwords.hash('Password123!');
    await expect(passwords.verify(hash, 'Password123!')).resolves.toBe(true);
  });

  it('rejects any other password', async () => {
    const hash = await passwords.hash('Password123!');
    await expect(passwords.verify(hash, 'Password123?')).resolves.toBe(false);
  });

  it('produces a different hash each time, so equal passwords are not detectable', async () => {
    const [first, second] = await Promise.all([
      passwords.hash('Password123!'),
      passwords.hash('Password123!'),
    ]);

    expect(first).not.toBe(second);
  });

  it('uses argon2id', async () => {
    expect(await passwords.hash('Password123!')).toMatch(/^\$argon2id\$/);
  });

  it('treats a malformed stored hash as a failed verification rather than throwing', async () => {
    await expect(passwords.verify('not-a-hash', 'Password123!')).resolves.toBe(false);
  });
});
