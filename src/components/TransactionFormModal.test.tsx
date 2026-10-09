import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TransactionFormModal from './TransactionFormModal';
import { createTransaction, updateTransaction } from '../api/transactions';
import type { Transaction } from '../api/transactions';

vi.mock('../api/transactions', () => ({
  createTransaction: vi.fn(),
  updateTransaction: vi.fn(),
  deleteTransaction: vi.fn(),
  listTransactions: vi.fn(),
}));
vi.mock('../hooks/useStockSearch', () => ({
  useStockSearch: () => ({
    results: [{ symbol: 'AAPL', name: 'Apple Inc.' }],
    status: 'success',
    error: null,
  }),
}));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ token: 'test-token' }) }));
vi.mock('../context/ToastContext', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}));

const mockedCreate = vi.mocked(createTransaction);
const mockedUpdate = vi.mocked(updateTransaction);

function renderModal(props: Partial<React.ComponentProps<typeof TransactionFormModal>> = {}) {
  const onClose = vi.fn();
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <TransactionFormModal open onClose={onClose} portfolioId="p1" {...props} />
    </QueryClientProvider>
  );
  return { onClose };
}

const existing: Transaction = {
  id: 't1', symbol: 'AAPL', name: 'Apple Inc.', side: 'buy', quantity: 5, price: 100, fee: 1,
  note: 'first', date: '2026-01-02', isOpening: false, runningShares: 5,
};

function fill(label: RegExp, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

describe('TransactionFormModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('records a buy for a symbol picked from search', async () => {
    mockedCreate.mockResolvedValue({ transaction: existing, position: null });
    const { onClose } = renderModal();

    fireEvent.change(screen.getByLabelText('Search assets'), { target: { value: 'app' } });
    fireEvent.click(screen.getByRole('button', { name: /AAPL/ }));
    fill(/^quantity/i, '3');
    fill(/price per share/i, '190.5');
    fill(/fee/i, '1.25');
    fill(/note/i, 'dip');
    fireEvent.click(screen.getByRole('button', { name: 'Record Buy' }));

    await waitFor(() => expect(mockedCreate).toHaveBeenCalled());
    const [token, pid, body] = mockedCreate.mock.calls[0];
    expect(token).toBe('test-token');
    expect(pid).toBe('p1');
    expect(body).toMatchObject({
      symbol: 'AAPL', name: 'Apple Inc.', side: 'buy', quantity: 3, price: 190.5, fee: 1.25, note: 'dip',
    });
    expect(body.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('toggles to Sell and locks the symbol for an existing holding', async () => {
    mockedCreate.mockResolvedValue({ transaction: existing, position: null });
    renderModal({ symbol: { symbol: 'MSFT', name: 'Microsoft' }, initialSide: 'sell' });

    expect(screen.getByRole('heading', { name: 'Sell MSFT' })).toBeInTheDocument();
    expect(screen.getByText('Locked')).toBeInTheDocument();
    expect(screen.queryByLabelText('Search assets')).toBeNull();

    fill(/^quantity/i, '1');
    fill(/price per share/i, '10');
    fireEvent.click(screen.getByRole('button', { name: 'Record Sell' }));
    await waitFor(() => expect(mockedCreate).toHaveBeenCalled());
    expect(mockedCreate.mock.calls[0][2]).toMatchObject({ symbol: 'MSFT', side: 'sell' });
    expect(mockedCreate.mock.calls[0][2]).not.toHaveProperty('note');
  });

  it('shows the server message inline when a sell is refused (409)', async () => {
    mockedCreate.mockRejectedValue(new Error('This would leave you selling 5 AAPL on 2026-03-02 when you held 3.'));
    const { onClose } = renderModal({ symbol: { symbol: 'AAPL', name: 'Apple' }, initialSide: 'sell' });

    fill(/^quantity/i, '5');
    fill(/price per share/i, '10');
    fireEvent.click(screen.getByRole('button', { name: 'Record Sell' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This would leave you selling 5 AAPL on 2026-03-02 when you held 3.'
    );
    expect(onClose).not.toHaveBeenCalled();
  });

  it('blocks submit until quantity and price are valid and rejects future dates', () => {
    renderModal({ symbol: { symbol: 'AAPL', name: 'Apple' } });
    const submit = screen.getByRole('button', { name: 'Record Buy' });
    expect(submit).toBeDisabled();

    fill(/^quantity/i, '2');
    fill(/price per share/i, '10');
    expect(submit).toBeEnabled();

    fill(/^date/i, '2999-01-01');
    expect(submit).toBeDisabled();
    expect(screen.getByText(/not in the future/i)).toBeInTheDocument();

    fill(/^date/i, '2026-01-01');
    fill(/^quantity/i, '0');
    expect(submit).toBeDisabled();
  });

  it('edits an existing transaction with its symbol locked and prefilled values', async () => {
    mockedUpdate.mockResolvedValue({ transaction: existing, position: null });
    renderModal({ transaction: existing });

    expect(screen.getByRole('heading', { name: /edit AAPL transaction/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^quantity/i)).toHaveValue(5);
    expect(screen.getByLabelText(/^date/i)).toHaveValue('2026-01-02');

    fill(/^quantity/i, '6');
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => expect(mockedUpdate).toHaveBeenCalled());
    const [, , txId, body] = mockedUpdate.mock.calls[0];
    expect(txId).toBe('t1');
    expect(body).toMatchObject({ side: 'buy', quantity: 6, price: 100, fee: 1, note: 'first', date: '2026-01-02' });
    expect(body).not.toHaveProperty('symbol');
  });

  it('disables Cancel and ignores Escape while the save is in flight', async () => {
    mockedCreate.mockReturnValue(new Promise(() => {}));
    const { onClose } = renderModal({ symbol: { symbol: 'AAPL', name: 'Apple' } });

    fill(/^quantity/i, '5');
    fill(/price per share/i, '10');
    fireEvent.click(screen.getByRole('button', { name: 'Record Buy' }));

    expect(await screen.findByRole('button', { name: 'Cancel' })).toBeDisabled();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('describes the dialog and links an inline field error to its input', () => {
    renderModal({ symbol: { symbol: 'AAPL', name: 'Apple' } });
    expect(screen.getByRole('dialog')).toHaveAccessibleDescription(/record a buy or sell/i);

    fill(/^quantity/i, '-1');
    const input = screen.getByLabelText(/^quantity/i);
    expect(input).toHaveAccessibleDescription('Must be greater than 0.');
  });
});
