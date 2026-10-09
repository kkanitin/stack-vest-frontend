import type { PortfolioPosition } from './portfolio';
import { API_BASE } from './config';

export type TransactionSide = 'buy' | 'sell';

/** One ledger row (`/portfolios/{id}/transactions`). `date` is `YYYY-MM-DD`. */
export interface Transaction {
  id: string;
  symbol: string;
  name: string;
  side: TransactionSide;
  quantity: number;
  price: number;
  fee: number;
  note?: string;
  date: string;
  /** Carried over from a pre-ledger holding; shown as "Opening balance". */
  isOpening: boolean;
  /** Shares held after this row, in ledger order. */
  runningShares: number;
  /** Profit realised by this sell (fees included); absent on buys. */
  realisedPnl?: number;
}

export interface CreateTransactionBody {
  symbol: string;
  name: string;
  side: TransactionSide;
  quantity: number;
  price: number;
  fee?: number;
  note?: string;
  date: string;
}

/** The symbol cannot change on an existing transaction. */
export interface UpdateTransactionBody {
  side?: TransactionSide;
  quantity?: number;
  price?: number;
  fee?: number;
  note?: string;
  date?: string;
}

export interface TransactionListParams {
  symbol?: string;
  page?: number;
  size?: number;
}

export interface TransactionPage {
  transactions: Transaction[];
  /** Total rows matching the filter, when the server reports it. */
  total?: number;
}

/** Result of a create/update: the saved row plus the refreshed holding. */
export interface TransactionResult {
  transaction: Transaction;
  position: PortfolioPosition | null;
}

function base(portfolioId: string): string {
  return `${API_BASE}/portfolios/${encodeURIComponent(portfolioId)}/transactions`;
}

function jsonHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

/**
 * Newest-first ledger rows (`GET /portfolios/{id}/transactions`). A rejected edit
 * that would oversell surfaces as HTTP 409; its `errorMessage` becomes the Error message.
 */
export async function listTransactions(
  token: string,
  portfolioId: string,
  params: TransactionListParams = {}
): Promise<TransactionPage> {
  const qs = new URLSearchParams();
  if (params.symbol) qs.set('symbol', params.symbol);
  if (params.page !== undefined) qs.set('page', String(params.page));
  if (params.size !== undefined) qs.set('size', String(params.size));
  const query = qs.toString();
  const res = await fetch(`${base(portfolioId)}${query ? `?${query}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (res.ok && data.code === 200) {
    return {
      transactions: (data.results ?? []) as Transaction[],
      total: data.meta?.total,
    };
  }
  throw new Error(data.errorMessage || 'Failed to load transactions');
}

/** 409 (open-position limit, or a sell larger than the holding) throws with the server's message. */
export async function createTransaction(
  token: string,
  portfolioId: string,
  body: CreateTransactionBody
): Promise<TransactionResult> {
  const res = await fetch(base(portfolioId), {
    method: 'POST',
    headers: jsonHeaders(token),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (res.ok && data.code === 201) return data.result as TransactionResult;
  throw new Error(data.errorMessage || 'Failed to record transaction');
}

/** 409 when the edit would leave a later sell with too few shares; the message says where. */
export async function updateTransaction(
  token: string,
  portfolioId: string,
  txId: string,
  body: UpdateTransactionBody
): Promise<TransactionResult> {
  const res = await fetch(`${base(portfolioId)}/${encodeURIComponent(txId)}`, {
    method: 'PATCH',
    headers: jsonHeaders(token),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (res.ok && data.code === 200) return data.result as TransactionResult;
  throw new Error(data.errorMessage || 'Failed to update transaction');
}

export async function deleteTransaction(
  token: string,
  portfolioId: string,
  txId: string
): Promise<void> {
  const res = await fetch(`${base(portfolioId)}/${encodeURIComponent(txId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 204 || res.ok) return;
  const data = await res.json().catch(() => ({}));
  throw new Error(data.errorMessage || 'Failed to delete transaction');
}
