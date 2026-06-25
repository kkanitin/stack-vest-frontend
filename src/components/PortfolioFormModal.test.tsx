import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PortfolioFormModal from './PortfolioFormModal';
import * as portfoliosApi from '../api/portfolios';

vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ token: 'test-token' }) }));
vi.mock('../context/ToastContext', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}));

function renderModal() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <PortfolioFormModal open onClose={() => {}} />
    </QueryClientProvider>
  );
}

describe('PortfolioFormModal', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('disables submit until a name is entered', () => {
    renderModal();
    const submit = screen.getByRole('button', { name: /create portfolio/i });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/portfolio name/i), { target: { value: 'Tech Growth' } });
    expect(submit).toBeEnabled();
  });

  it('calls createPortfolio with the trimmed name and description on submit', async () => {
    const spy = vi
      .spyOn(portfoliosApi, 'createPortfolio')
      .mockResolvedValue({
        id: 'p1',
        name: 'Tech Growth',
        description: 'US tech',
        createdAt: '',
        updatedAt: '',
      });

    renderModal();
    fireEvent.change(screen.getByLabelText(/portfolio name/i), { target: { value: '  Tech Growth  ' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'US tech' } });
    fireEvent.click(screen.getByRole('button', { name: /create portfolio/i }));

    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith('test-token', { name: 'Tech Growth', description: 'US tech' })
    );
  });
});
