import type { PortfolioPosition } from '../api/portfolio';

export type MarketSentiment = 'bullish' | 'bearish' | 'mixed' | 'empty';

export interface MarketStatus {
  sentiment: MarketSentiment;
  label: string;
  descriptor: string;
  upCount: number;
  downCount: number;
  flatCount: number;
}

const LABELS: Record<Exclude<MarketSentiment, 'empty'>, { label: string; descriptor: string }> = {
  bullish: {
    label: 'Broadly Bullish',
    descriptor: 'Most of your holdings are trading higher over the last 24 hours.',
  },
  bearish: {
    label: 'Broadly Bearish',
    descriptor: 'Most of your holdings are trading lower over the last 24 hours.',
  },
  mixed: {
    label: 'Mixed Signals',
    descriptor: 'Your holdings are split between gains and losses over the last 24 hours.',
  },
};

export function computeMarketStatus(positions: PortfolioPosition[]): MarketStatus {
  if (positions.length === 0) {
    return {
      sentiment: 'empty',
      label: 'No Data',
      descriptor: 'Add positions to see how your holdings are moving.',
      upCount: 0,
      downCount: 0,
      flatCount: 0,
    };
  }

  let upCount = 0;
  let downCount = 0;
  let flatCount = 0;
  for (const p of positions) {
    if (p.change24h > 0) upCount++;
    else if (p.change24h < 0) downCount++;
    else flatCount++;
  }

  // Thresholds are evaluated against each direction's own share (not "% up" alone) so that
  // an all-flat portfolio — neither up- nor down-heavy — lands on "mixed" rather than "bearish".
  const upRatio = upCount / positions.length;
  const downRatio = downCount / positions.length;
  const sentiment: Exclude<MarketSentiment, 'empty'> =
    upRatio >= 0.6 ? 'bullish' : downRatio >= 0.6 ? 'bearish' : 'mixed';

  return { sentiment, ...LABELS[sentiment], upCount, downCount, flatCount };
}
