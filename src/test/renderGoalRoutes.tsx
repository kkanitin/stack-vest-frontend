import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { ToastProvider } from '../context/ToastContext';
import GoalsPage from '../pages/GoalsPage';
import GoalCalculatorPage from '../pages/GoalCalculatorPage';

/**
 * Renders the goal routes in a data router (the calculator uses `useBlocker`) with a fresh
 * query client and toasts. Mock `../context/AuthContext` in the test file for a token.
 */
export function renderGoalRoutes(path = '/dashboard/goals/new') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const router = createMemoryRouter(
    [
      { path: '/dashboard/goals', element: <GoalsPage /> },
      { path: '/dashboard/goals/new', element: <GoalCalculatorPage /> },
      { path: '/dashboard/goals/:id', element: <GoalCalculatorPage /> },
      { path: '/dashboard/dca', element: <h1>DCA page</h1> },
    ],
    { initialEntries: [path] },
  );
  const view = render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </QueryClientProvider>,
  );
  return { ...view, router, queryClient };
}
