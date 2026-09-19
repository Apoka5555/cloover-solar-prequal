import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// The components under test navigate after a successful submit. The router is
// stubbed so a test can assert where the user is sent without a real router.
export const routerMock = {
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
};

vi.mock('next/navigation', () => ({
  useRouter: () => routerMock,
  usePathname: () => '/quotes/new',
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
