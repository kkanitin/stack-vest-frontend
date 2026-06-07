import type { FearGreedStatus } from '../api/sentiment';

export interface FearGreedBand {
  status: FearGreedStatus;
  color: string;
  descriptor: string;
}

// Mirrors the loss -> neutral -> gain diverging palette used by the heatmap legend
// (see .hm-legend-scale in HeatmapPage.css) so fear/greed reads consistently with
// the rest of the app's gain/loss color language.
export const FEAR_GREED_BANDS: FearGreedBand[] = [
  {
    status: 'Extreme Fear',
    color: 'var(--loss)',
    descriptor: 'Investors are very worried — markets may be oversold.',
  },
  {
    status: 'Fear',
    color: 'rgba(255, 180, 171, 0.55)',
    descriptor: 'Caution is dominating sentiment.',
  },
  {
    status: 'Neutral',
    color: 'var(--surface-highest)',
    descriptor: 'Sentiment is balanced, with no strong bias either way.',
  },
  {
    status: 'Greed',
    color: 'rgba(74, 222, 128, 0.55)',
    descriptor: 'Optimism is building across the market.',
  },
  {
    status: 'Extreme Greed',
    color: 'var(--success)',
    descriptor: 'Investors are highly confident — markets may be overheated.',
  },
];

export const STATUS_TONE = {
  'Extreme Fear': 'error',
  Fear: 'error',
  Neutral: 'neutral',
  Greed: 'success',
  'Extreme Greed': 'success',
} as const satisfies Record<FearGreedStatus, 'success' | 'error' | 'primary' | 'neutral' | 'warning'>;

export function scoreToNeedleAngle(score: number): number {
  const clamped = Math.min(100, Math.max(0, score));
  return (clamped / 100) * 180 - 90;
}

export function descriptorForStatus(status: FearGreedStatus): string {
  return FEAR_GREED_BANDS.find(band => band.status === status)?.descriptor ?? '';
}
