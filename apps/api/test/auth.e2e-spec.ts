import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, extractSessionCookie, registerUser, type TestContext } from './test-app.js';

describe('authentication', () => {
  let context: TestContext;

  beforeAll(async () => {
    context = await createTestContext();
  });

  beforeEach(async () => {
    await context.reset();
  });

  afterAll(async () => {
    await context.close();
  });

  describe('registration', () => {
    it('creates an account and starts a session', async () => {
      const response = await context
        .http()
        .post('/api/auth/register')
        .send({ fullName: 'Ada Lovelace', email: 'Ada@Example.com', password: 'Password123!' })
        .expect(201);

      expect(response.body.user).toMatchObject({
        email: 'ada@example.com',
        fullName: 'Ada Lovelace',
        role: 'USER',
      });

      const cookie = extractSessionCookie(response.headers['set-cookie']);
      expect(cookie).toContain('cloover_session=');
    });

    it('marks the session cookie httpOnly so scripts cannot read it', async () => {
      const response = await context
        .http()
        .post('/api/auth/register')
        .send({ fullName: 'Ada Lovelace', email: 'ada@example.com', password: 'Password123!' })
        .expect(201);

      const raw = response.headers['set-cookie'] as unknown as string[];
      expect(raw[0]).toMatch(/HttpOnly/i);
      expect(raw[0]).toMatch(/SameSite=Lax/i);
    });

    it('never returns the stored password hash', async () => {
      const response = await context
        .http()
        .post('/api/auth/register')
        .send({ fullName: 'Ada Lovelace', email: 'ada@example.com', password: 'Password123!' })
        .expect(201);

      expect(JSON.stringify(response.body)).not.toContain('argon2');
      expect(response.body.user.passwordHash).toBeUndefined();
    });

    it('rejects a second account on the same email', async () => {
      await registerUser(context, { email: 'ada@example.com' });

      await context
        .http()
        .post('/api/auth/register')
        .send({ fullName: 'Someone Else', email: 'ada@example.com', password: 'Password123!' })
        .expect(409);
    });

    it('rejects a password below the minimum length', async () => {
      const response = await context
        .http()
        .post('/api/auth/register')
        .send({ fullName: 'Ada Lovelace', email: 'ada@example.com', password: 'short' })
        .expect(400);

      expect(response.body.fieldErrors).toContainEqual(
        expect.objectContaining({ field: 'password' }),
      );
    });
  });

  describe('sign-in', () => {
    beforeEach(async () => {
      await registerUser(context, { email: 'ada@example.com', password: 'Password123!' });
    });

    it('accepts correct credentials regardless of email casing', async () => {
      const response = await context
        .http()
        .post('/api/auth/login')
        .send({ email: 'ADA@EXAMPLE.COM', password: 'Password123!' })
        .expect(200);

      expect(response.body.user.email).toBe('ada@example.com');
    });

    it('rejects a wrong password', async () => {
      await context
        .http()
        .post('/api/auth/login')
        .send({ email: 'ada@example.com', password: 'WrongPassword1!' })
        .expect(401);
    });

    it('gives an unknown email the same answer as a wrong password', async () => {
      const unknown = await context
        .http()
        .post('/api/auth/login')
        .send({ email: 'nobody@example.com', password: 'Password123!' })
        .expect(401);

      const wrong = await context
        .http()
        .post('/api/auth/login')
        .send({ email: 'ada@example.com', password: 'WrongPassword1!' })
        .expect(401);

      expect(unknown.body.message).toBe(wrong.body.message);
    });
  });

  describe('session', () => {
    it('refuses to identify an anonymous caller', async () => {
      await context.http().get('/api/auth/me').expect(401);
    });

    it('identifies the holder of a valid session cookie', async () => {
      const user = await registerUser(context, { email: 'ada@example.com' });

      const response = await context
        .http()
        .get('/api/auth/me')
        .set('Cookie', user.cookie)
        .expect(200);

      expect(response.body.user.id).toBe(user.id);
    });

    it('rejects a tampered token', async () => {
      const user = await registerUser(context, { email: 'ada@example.com' });

      await context
        .http()
        .get('/api/auth/me')
        .set('Cookie', `${user.cookie}tampered`)
        .expect(401);
    });

    it('stops accepting a session after the account is deleted', async () => {
      const user = await registerUser(context, { email: 'ada@example.com' });
      await context.prisma.user.delete({ where: { id: user.id } });

      await context.http().get('/api/auth/me').set('Cookie', user.cookie).expect(401);
    });

    it('clears the cookie on sign-out', async () => {
      const response = await context.http().post('/api/auth/logout').expect(204);
      const raw = response.headers['set-cookie'] as unknown as string[];

      expect(raw[0]).toMatch(/cloover_session=;/);
    });
  });
});
