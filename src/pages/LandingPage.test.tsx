import { fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import LandingPage from './LandingPage';

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ token: 'test-token', user: null, logout: vi.fn() }),
}));

function renderShell(path = '/dashboard/visualization') {
  const router = createMemoryRouter(
    [
      {
        path: '/dashboard',
        element: <LandingPage />,
        children: [
          { path: 'visualization', element: <h1>Overview page</h1> },
          { path: 'dca', element: <h1>DCA page</h1> },
          { path: 'goals', element: <h1>Goals page</h1> },
        ],
      },
    ],
    { initialEntries: [path] },
  );
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

const linkNames = (container: HTMLElement) =>
  within(container).getAllByRole('link').map((a) => a.textContent?.trim());

describe('LandingPage sidebar', () => {
  it('lists the pages in order: own money, plan, then market', () => {
    renderShell();
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(linkNames(nav)).toEqual([
      'Overview',
      'Portfolios',
      'Goals',
      'DCA Simulation',
      'Watchlist',
      'Heatmap',
    ]);
  });

  it('groups Goals and DCA under Plan, and Watchlist and Heatmap under Market', () => {
    renderShell();
    expect(linkNames(screen.getByRole('group', { name: 'Plan' }))).toEqual([
      'Goals',
      'DCA Simulation',
    ]);
    expect(linkNames(screen.getByRole('group', { name: 'Market' }))).toEqual([
      'Watchlist',
      'Heatmap',
    ]);
  });

  it('names the footer button after the simulation it opens', () => {
    const router = renderShell();
    fireEvent.click(screen.getByRole('button', { name: /new dca simulation/i }));
    expect(router.state.location.pathname).toBe('/dashboard/dca');
  });
});
