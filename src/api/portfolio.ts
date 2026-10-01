export interface PortfolioPosition {
  id: string;
  symbol: string;
  name: string;
  shares: number;
  avgCost: number;
  valueUsd: number;
  change24h: number;
  addedAt: string;
}

export interface AddPositionBody {
  symbol: string;
  name: string;
  shares: number;
  avgCost: number;
}

export interface UpdatePositionBody {
  shares?: number;
  avgCost?: number;
}
