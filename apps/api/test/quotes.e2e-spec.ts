import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  createTestContext,
  registerUser,
  VALID_QUOTE,
  type TestContext,
  type TestUser,
} from './test-app.js';

describe('quotes', () => {
  let context: TestContext;
  let owner: TestUser;
  let stranger: TestUser;
  let admin: TestUser;

  beforeAll(async () => {
    context = await createTestContext();
  });

  beforeEach(async () => {
    await context.reset();
    owner = await registerUser(context, { email: 'owner@test.com', fullName: 'Olive Owner' });
    stranger = await registerUser(context, {
      email: 'stranger@test.com',
      fullName: 'Stan Stranger',
    });
    admin = await registerUser(context, {
      email: 'admin@test.com',
      fullName: 'Ada Admin',
      role: 'ADMIN',
    });
  });

  afterAll(async () => {
    await context.close();
  });

  const createQuote = (user: TestUser, body: Record<string, unknown> = {}) =>
    context
      .http()
      .post('/api/quotes')
      .set('Cookie', user.cookie)
      .send({ ...VALID_QUOTE, ...body });

  describe('POST /api/quotes', () => {
    it('turns a request into a priced quote with three offers', async () => {
      const response = await createQuote(owner).expect(201);

      expect(response.body.input).toMatchObject({
        monthlyConsumptionKwh: 450,
        systemSizeKw: 6,
        downPayment: 1200,
      });
      expect(response.body.derived).toMatchObject({
        systemPrice: 7200,
        principal: 6000,
        riskBand: 'A',
        aprPercent: 6.9,
      });
      expect(response.body.offers).toHaveLength(3);
      expect(response.body.offers.map((offer: { termYears: number }) => offer.termYears)).toEqual([
        5, 10, 15,
      ]);
      expect(
        response.body.offers.map((offer: { monthlyPayment: number }) => offer.monthlyPayment),
      ).toEqual([118.52, 69.36, 53.59]);
    });

    it('persists the result so a reload shows the same numbers', async () => {
      const created = await createQuote(owner).expect(201);

      const reloaded = await context
        .http()
        .get(`/api/quotes/${created.body.id}`)
        .set('Cookie', owner.cookie)
        .expect(200);

      expect(reloaded.body).toEqual(created.body);
    });

    it('records which pricing rules produced the quote', async () => {
      const response = await createQuote(owner).expect(201);
      expect(response.body.derived.pricingVersion).toBeTruthy();
    });

    it('treats a missing down payment as zero', async () => {
      const response = await createQuote(owner, { downPayment: undefined }).expect(201);

      expect(response.body.derived.downPayment).toBe(0);
      expect(response.body.derived.principal).toBe(7200);
    });

    it.each([
      ['band B', { monthlyConsumptionKwh: 300, systemSizeKw: 9 }, 'B', 8.9],
      ['band C', { monthlyConsumptionKwh: 100, systemSizeKw: 4 }, 'C', 11.9],
    ])('grades %s and prices it accordingly', async (_label, patch, band, aprPercent) => {
      const response = await createQuote(owner, { ...patch, downPayment: 0 }).expect(201);

      expect(response.body.derived.riskBand).toBe(band);
      expect(response.body.derived.aprPercent).toBe(aprPercent);
    });

    it('refuses an anonymous request', async () => {
      await context.http().post('/api/quotes').send(VALID_QUOTE).expect(401);
    });

    it('reports validation failures field by field', async () => {
      const response = await createQuote(owner, {
        fullName: 'A',
        email: 'not-an-email',
        systemSizeKw: 0,
      }).expect(400);

      const fields = response.body.fieldErrors.map((error: { field: string }) => error.field);
      expect(fields).toEqual(expect.arrayContaining(['fullName', 'email', 'systemSizeKw']));
    });

    it('refuses a down payment larger than the system price', async () => {
      const response = await createQuote(owner, { systemSizeKw: 5, downPayment: 99_999 }).expect(
        400,
      );

      expect(response.body.fieldErrors).toContainEqual(
        expect.objectContaining({ field: 'downPayment' }),
      );
    });

    it('files the quote against the signed-in user, not the email in the form', async () => {
      const created = await createQuote(owner, { email: 'someone.else@example.com' }).expect(201);
      const stored = await context.prisma.quote.findUniqueOrThrow({
        where: { id: created.body.id },
      });

      expect(stored.userId).toBe(owner.id);
    });
  });

  describe('GET /api/quotes', () => {
    it('lists only the caller’s own quotes', async () => {
      await createQuote(owner).expect(201);
      await createQuote(owner).expect(201);
      await createQuote(stranger).expect(201);

      const response = await context
        .http()
        .get('/api/quotes')
        .set('Cookie', owner.cookie)
        .expect(200);

      expect(response.body.total).toBe(2);
      expect(response.body.items).toHaveLength(2);
    });

    it('returns the newest quote first', async () => {
      await createQuote(owner, { systemSizeKw: 4 }).expect(201);
      await createQuote(owner, { systemSizeKw: 8 }).expect(201);

      const response = await context
        .http()
        .get('/api/quotes')
        .set('Cookie', owner.cookie)
        .expect(200);

      expect(response.body.items[0].systemSizeKw).toBe(8);
    });

    it('paginates', async () => {
      await createQuote(owner).expect(201);
      await createQuote(owner).expect(201);
      await createQuote(owner).expect(201);

      const response = await context
        .http()
        .get('/api/quotes?page=2&pageSize=2')
        .set('Cookie', owner.cookie)
        .expect(200);

      expect(response.body).toMatchObject({ page: 2, pageSize: 2, total: 3, totalPages: 2 });
      expect(response.body.items).toHaveLength(1);
    });

    it('rejects a page size beyond the cap', async () => {
      await context.http().get('/api/quotes?pageSize=1000').set('Cookie', owner.cookie).expect(400);
    });
  });

  describe('GET /api/quotes/:id', () => {
    it('reports another user’s quote as missing rather than forbidden', async () => {
      const created = await createQuote(owner).expect(201);

      await context
        .http()
        .get(`/api/quotes/${created.body.id}`)
        .set('Cookie', stranger.cookie)
        .expect(404);
    });

    it('lets an administrator read any quote, with its owner attached', async () => {
      const created = await createQuote(owner).expect(201);

      const response = await context
        .http()
        .get(`/api/quotes/${created.body.id}`)
        .set('Cookie', admin.cookie)
        .expect(200);

      expect(response.body.owner).toMatchObject({ id: owner.id, email: 'owner@test.com' });
    });

    it('does not disclose the owner to the owner’s own request', async () => {
      const created = await createQuote(owner).expect(201);

      const response = await context
        .http()
        .get(`/api/quotes/${created.body.id}`)
        .set('Cookie', owner.cookie)
        .expect(200);

      expect(response.body.owner).toBeUndefined();
    });

    it('rejects an identifier that is not a UUID', async () => {
      await context.http().get('/api/quotes/not-a-uuid').set('Cookie', owner.cookie).expect(400);
    });

    it('returns 404 for a well-formed identifier that does not exist', async () => {
      await context
        .http()
        .get('/api/quotes/00000000-0000-4000-8000-000000000000')
        .set('Cookie', owner.cookie)
        .expect(404);
    });
  });

  describe('GET /api/quotes/:id/schedule', () => {
    it('expands an offer into one row per instalment', async () => {
      const created = await createQuote(owner).expect(201);

      const response = await context
        .http()
        .get(`/api/quotes/${created.body.id}/schedule?termYears=10`)
        .set('Cookie', owner.cookie)
        .expect(200);

      expect(response.body).toMatchObject({
        quoteId: created.body.id,
        termYears: 10,
        aprPercent: 6.9,
        principal: 6000,
        monthlyPayment: 69.36,
      });
      expect(response.body.rows).toHaveLength(120);
      expect(response.body.rows.at(-1).remainingBalance).toBe(0);
    });

    it('starts mostly as interest and ends mostly as repayment', async () => {
      const created = await createQuote(owner).expect(201);

      const { body } = await context
        .http()
        .get(`/api/quotes/${created.body.id}/schedule?termYears=15`)
        .set('Cookie', owner.cookie)
        .expect(200);

      const first = body.rows[0];
      const last = body.rows.at(-1);

      expect(first.interest).toBeGreaterThan(first.principal);
      expect(last.principal).toBeGreaterThan(last.interest);
    });

    it('rejects a term that is not offered', async () => {
      const created = await createQuote(owner).expect(201);

      await context
        .http()
        .get(`/api/quotes/${created.body.id}/schedule?termYears=7`)
        .set('Cookie', owner.cookie)
        .expect(400);
    });

    it('will not expand another user\u2019s quote', async () => {
      const created = await createQuote(owner).expect(201);

      await context
        .http()
        .get(`/api/quotes/${created.body.id}/schedule?termYears=5`)
        .set('Cookie', stranger.cookie)
        .expect(404);
    });
  });

  describe('GET /api/quotes/:id/pdf', () => {
    it('returns a PDF as a named attachment', async () => {
      const created = await createQuote(owner).expect(201);

      const response = await context
        .http()
        .get(`/api/quotes/${created.body.id}/pdf`)
        .set('Cookie', owner.cookie)
        .expect(200)
        .expect('Content-Type', 'application/pdf');

      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('.pdf');
      expect(response.body.subarray(0, 5).toString()).toBe('%PDF-');
    });

    it('grows when a payment schedule is appended', async () => {
      const created = await createQuote(owner).expect(201);

      const withoutSchedule = await context
        .http()
        .get(`/api/quotes/${created.body.id}/pdf`)
        .set('Cookie', owner.cookie)
        .expect(200);

      const withSchedule = await context
        .http()
        .get(`/api/quotes/${created.body.id}/pdf?termYears=15`)
        .set('Cookie', owner.cookie)
        .expect(200);

      expect(withSchedule.body.length).toBeGreaterThan(withoutSchedule.body.length);
    });

    it('rejects a term that is not offered', async () => {
      const created = await createQuote(owner).expect(201);

      await context
        .http()
        .get(`/api/quotes/${created.body.id}/pdf?termYears=7`)
        .set('Cookie', owner.cookie)
        .expect(400);
    });

    it('will not export another user\u2019s quote', async () => {
      const created = await createQuote(owner).expect(201);

      await context
        .http()
        .get(`/api/quotes/${created.body.id}/pdf`)
        .set('Cookie', stranger.cookie)
        .expect(404);
    });

    it('refuses an anonymous request', async () => {
      const created = await createQuote(owner).expect(201);

      await context.http().get(`/api/quotes/${created.body.id}/pdf`).expect(401);
    });
  });

  describe('GET /api/admin/quotes', () => {
    it('refuses an ordinary user even though the route exists', async () => {
      await context.http().get('/api/admin/quotes').set('Cookie', owner.cookie).expect(403);
    });

    it('refuses an anonymous caller', async () => {
      await context.http().get('/api/admin/quotes').expect(401);
    });

    it('lists every user’s quotes with their owners', async () => {
      await createQuote(owner).expect(201);
      await createQuote(stranger).expect(201);

      const response = await context
        .http()
        .get('/api/admin/quotes')
        .set('Cookie', admin.cookie)
        .expect(200);

      expect(response.body.total).toBe(2);
      expect(
        response.body.items.map((quote: { owner: { email: string } }) => quote.owner.email).sort(),
      ).toEqual(['owner@test.com', 'stranger@test.com']);
    });

    it('filters by a free-text search over owner name and email', async () => {
      await createQuote(owner).expect(201);
      await createQuote(stranger).expect(201);

      const byEmail = await context
        .http()
        .get('/api/admin/quotes?search=stranger@')
        .set('Cookie', admin.cookie)
        .expect(200);
      expect(byEmail.body.total).toBe(1);

      const byName = await context
        .http()
        .get('/api/admin/quotes?search=olive')
        .set('Cookie', admin.cookie)
        .expect(200);
      expect(byName.body.total).toBe(1);
      expect(byName.body.items[0].owner.email).toBe('owner@test.com');
    });

    it('filters by a specific owner', async () => {
      await createQuote(owner).expect(201);
      await createQuote(stranger).expect(201);

      const response = await context
        .http()
        .get(`/api/admin/quotes?userId=${stranger.id}`)
        .set('Cookie', admin.cookie)
        .expect(200);

      expect(response.body.total).toBe(1);
      expect(response.body.items[0].owner.id).toBe(stranger.id);
    });

    it('lists only users who actually have quotes, for the owner filter', async () => {
      await createQuote(owner).expect(201);

      const response = await context
        .http()
        .get('/api/admin/quotes/owners')
        .set('Cookie', admin.cookie)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].email).toBe('owner@test.com');
    });
  });
});
