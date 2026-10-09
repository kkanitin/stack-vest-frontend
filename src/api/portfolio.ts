export interface PortfolioPosition {
  id: string;
  symbol: string;
  name: string;
  shares: number;
  avgCost: number;
  valueUsd: number;
  change24h: number;
  addedAt: string;
  /** Total cost of the open shares (fees included). */
  costBasis: number;
  unrealisedPnl: number;
  unrealisedPnlPct: number;
  /** Profit realised by sells on this symbol (survives a full close). */
  realisedPnl: number;
  /** True when every share has been sold; only returned with `includeClosed`. */
  closed: boolean;
}

