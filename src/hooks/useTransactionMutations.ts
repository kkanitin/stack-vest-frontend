import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { createTransaction, updateTransaction, deleteTransaction } from '../api/transactions';
import type { CreateTransactionBody, UpdateTransactionBody } from '../api/transactions';

/**
 * Create / update / delete mutations for a portfolio's ledger. Every ledger change alters
 * shares, cost, P&L, value history and activity, so each settles by invalidating the
 * portfolio's own queries (positions, transactions, summary, history) and all cross-portfolio
 * ones (`['portfolios', ...]`: list, summary, history, activity).
 */
export function useTransactionMutations(portfolioId: string) {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const onSettled = () => {
    queryClient.invalidateQueries({ queryKey: ['portfolio', portfolioId] });
    queryClient.invalidateQueries({ queryKey: ['portfolios'] });
    // Dividends depend on shares held, so the calendar (1h stale) must refetch too.
    queryClient.invalidateQueries({ queryKey: ['dividendCalendar'] });
  };

  const create = useMutation({
    mutationFn: (body: CreateTransactionBody) => {
      if (!token) throw new Error('Session expired, please log in again.');
      return createTransaction(token, portfolioId, body);
    },
    onSettled,
  });

  const update = useMutation({
    mutationFn: ({ txId, body }: { txId: string; body: UpdateTransactionBody }) => {
      if (!token) throw new Error('Session expired, please log in again.');
      return updateTransaction(token, portfolioId, txId, body);
    },
    onSettled,
  });

  const remove = useMutation({
    mutationFn: (txId: string) => {
      if (!token) throw new Error('Session expired, please log in again.');
      return deleteTransaction(token, portfolioId, txId);
    },
    onSettled,
  });

  return { create, update, remove };
}
