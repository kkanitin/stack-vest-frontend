import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HoldingHistoryDialog from './HoldingHistoryDialog';
import { useHoldingTransactions } from '../hooks/useHoldingTransactions';
import { deleteTransaction } from '../api/transactions';
import type { Transaction } from '../api/transactions';

vi.mock('../hooks/useHoldingTransactions', () => ({ useHoldingTransactions: vi.fn() }));
vi.mock('../api/transactions', () => ({
  createTransaction: vi.fn(),
  updateTransaction: vi.fn(),
  deleteTransaction: vi.fn().mockResolvedValue(undefined),
  listTransactions: vi.fn(),
}));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ token: 'test-token' }) }));
vi.mock('../context/ToastContext', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}));

const txs: Transaction[] = [
  { id: 't3', symbol: 'AAPL', name: 'Apple', side: 'sell', quantity: 2, price: 120, fee: 1, date: '2026-03-02', isOpening: false, runningShares: 3, realisedPnl: 38, note: 'trim' },
  { id: 't2', symbol: 'AAPL', name: 'Apple', side: 'buy', quantity: 2, price: 90, fee: 0, date: '2026-02-01', isOpening: false, runningShares: 5 },
  { id: 't1', symbol: 'AAPL', name: 'Apple', side: 'buy', quantity: 3, price: 100, fee: 0, date: '2026-01-02', isOpening: true, runningShares: 3 },
];

function renderDialog(onEdit = vi.fn()) {
  vi.mocked(useHoldingTransactions).mockReturnValue({
    data: txs, isLoading: false, isError: false, error: null,
  } as unknown as ReturnType<typeof useHoldingTransactions>);
  render(
    <QueryClientProvider client={new QueryClient()}>
      <HoldingHistoryDialog open onClose={vi.fn()} portfolioId="p1" symbol="AAPL" name="Apple" onEdit={onEdit} />
    </QueryClientProvider>
  );
  return { onEdit };
}

describe('HoldingHistoryDialog', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists rows with side badge, running shares, fee, note, realised P&L and opening label', () => {
    renderDialog();

    expect(screen.getByText('SELL')).toBeInTheDocument();
    expect(screen.getAllByText('BUY')).toHaveLength(2);
    expect(screen.getByText('Opening balance')).toBeInTheDocument();
    expect(screen.getByText('5 held')).toBeInTheDocument();
    expect(screen.getByText(/fee \$1\.00/)).toBeInTheDocument();
    expect(screen.getByText('trim')).toBeInTheDocument();
    expect(screen.getByText('+$38.00 realised')).toHaveClass('hhd-pnl--positive');
  });

  it('hands the row to onEdit', () => {
    const { onEdit } = renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Edit sell on 2026-03-02' }));
    expect(onEdit).toHaveBeenCalledWith(txs[0]);
  });

  it('deletes a row only after confirmation', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    renderDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Delete buy on 2026-02-01' }));
    expect(deleteTransaction).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Delete buy on 2026-02-01' }));
    await waitFor(() => expect(deleteTransaction).toHaveBeenCalledWith('test-token', 'p1', 't2'));
    confirmSpy.mockRestore();
  });

  it('offers Load more while older rows remain', () => {
    const fetchNextPage = vi.fn();
    vi.mocked(useHoldingTransactions).mockReturnValue({
      data: txs, isLoading: false, isError: false, error: null, hasNextPage: true, fetchNextPage, isFetchingNextPage: false,
    } as unknown as ReturnType<typeof useHoldingTransactions>);
    render(
      <QueryClientProvider client={new QueryClient()}>
        <HoldingHistoryDialog open onClose={vi.fn()} portfolioId="p1" symbol="AAPL" name="Apple" onEdit={vi.fn()} />
      </QueryClientProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Load more' }));
    expect(fetchNextPage).toHaveBeenCalled();
  });
});
