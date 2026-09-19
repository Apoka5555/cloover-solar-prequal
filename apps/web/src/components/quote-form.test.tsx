import type { AuthUserDto } from '@cloover/contracts';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QuoteForm } from './quote-form';
import { routerMock } from '@/test/setup';

const user: AuthUserDto = {
  id: 'user-1',
  email: 'sam@test.com',
  fullName: 'Sam Homeowner',
  role: 'USER',
};

function mockFetch(response: { ok: boolean; status?: number; body: unknown }) {
  const spy = vi.fn().mockResolvedValue({
    ok: response.ok,
    status: response.status ?? (response.ok ? 201 : 400),
    json: async () => response.body,
  });
  vi.stubGlobal('fetch', spy);
  return spy;
}

async function fillValidQuote() {
  const person = userEvent.setup();
  await person.type(screen.getByLabelText('Installation address'), 'Hauptstrasse 1, 10115 Berlin');
  await person.type(screen.getByLabelText('Monthly consumption'), '450');
  await person.type(screen.getByLabelText('System size'), '6');
  return person;
}

describe('QuoteForm', () => {
  beforeEach(() => {
    render(<QuoteForm user={user} />);
  });

  it('prefills the applicant from the signed-in account', () => {
    expect(screen.getByLabelText('Full name')).toHaveValue('Sam Homeowner');
    expect(screen.getByLabelText('Email')).toHaveValue('sam@test.com');
  });

  it('labels every control so it can be reached by name', () => {
    for (const label of [
      'Full name',
      'Email',
      'Installation address',
      'Monthly consumption',
      'System size',
      'Down payment (optional)',
    ]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
  });

  it('refuses to submit an empty form and says which fields are missing', async () => {
    const send = mockFetch({ ok: true, body: {} });
    const person = userEvent.setup();

    await person.click(screen.getByRole('button', { name: 'Get pre-qualification' }));

    expect(await screen.findByText('Address must be at least 5 characters')).toBeInTheDocument();
    expect(send).not.toHaveBeenCalled();
  });

  it('marks an invalid field with aria-invalid rather than colour alone', async () => {
    const person = userEvent.setup();
    await person.click(screen.getByRole('button', { name: 'Get pre-qualification' }));

    await waitFor(() => {
      expect(screen.getByLabelText('Installation address')).toHaveAttribute('aria-invalid', 'true');
    });
  });

  it('rejects a down payment above the system price before calling the API', async () => {
    const send = mockFetch({ ok: true, body: {} });
    const person = await fillValidQuote();

    await person.type(screen.getByLabelText('Down payment (optional)'), '99999');
    await person.click(screen.getByRole('button', { name: 'Get pre-qualification' }));

    expect(
      await screen.findByText('Down payment cannot be more than the system price'),
    ).toBeInTheDocument();
    expect(send).not.toHaveBeenCalled();
  });

  it('previews the system price as the size is typed', async () => {
    const person = userEvent.setup();
    await person.type(screen.getByLabelText('System size'), '6');

    expect(await screen.findByText(/7\.200,00/)).toBeInTheDocument();
  });

  it('sends a valid request and navigates to the new quote', async () => {
    const send = mockFetch({ ok: true, status: 201, body: { id: 'quote-42' } });
    const person = await fillValidQuote();

    await person.click(screen.getByRole('button', { name: 'Get pre-qualification' }));

    await waitFor(() => expect(send).toHaveBeenCalledTimes(1));

    const [url, init] = send.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/quotes');
    expect(JSON.parse(String(init.body))).toMatchObject({
      address: 'Hauptstrasse 1, 10115 Berlin',
      monthlyConsumptionKwh: 450,
      systemSizeKw: 6,
    });

    await waitFor(() => expect(routerMock.push).toHaveBeenCalledWith('/quotes/quote-42'));
  });

  it('surfaces a server-side field error on the field it belongs to', async () => {
    mockFetch({
      ok: false,
      status: 400,
      body: {
        message: 'Validation failed',
        fieldErrors: [{ field: 'address', message: 'That address is not serviceable' }],
      },
    });
    const person = await fillValidQuote();

    await person.click(screen.getByRole('button', { name: 'Get pre-qualification' }));

    expect(await screen.findByText('That address is not serviceable')).toBeInTheDocument();
    expect(await screen.findByRole('alert')).toHaveTextContent('Validation failed');
  });
});
