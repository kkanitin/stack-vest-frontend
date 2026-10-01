/** Shared number/value formatting helpers. */

export function fmtMoney(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return `$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export type ChangeTone = 'positive' | 'negative' | 'neutral';

/**
 * Gain/loss tone for a signed figure, judged on the value as displayed: anything that
 * rounds to zero at `digits` decimals is neutral, so "-0.00" never reads as a loss.
 */
export function changeTone(n: number | null | undefined, digits = 2): ChangeTone {
  if (n == null || !Number.isFinite(n)) return 'neutral';
  const rounded = Number(n.toFixed(digits));
  return rounded > 0 ? 'positive' : rounded < 0 ? 'negative' : 'neutral';
}

export function fmtPct(n: number | null | undefined, digits = 2): string {
  if (n == null || !Number.isFinite(n)) return '—';
  const tone = changeTone(n, digits);
  if (tone === 'neutral') return `${(0).toFixed(digits)}%`;
  return `${tone === 'positive' ? '+' : ''}${n.toFixed(digits)}%`;
}

/** Signed money, e.g. "+$12.50" / "-$12.50"; a figure that displays as zero is unsigned. */
export function fmtSignedMoney(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  const tone = changeTone(n);
  const sign = tone === 'positive' ? '+' : tone === 'negative' ? '-' : '';
  return `${sign}${fmtMoney(n)}`;
}

export function fmtShares(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 8 });
}

/**
 * Compact "how long ago" for a timestamp: "just now", "5m ago", "3h ago", "2d ago",
 * then a short date once it is a week or more old. Returns '' for an unparseable input.
 */
export function fmtRelativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return '';
  const minutes = Math.floor((now.getTime() - then.getTime()) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return then.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(then.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' }),
  });
}

/** Zero-padded count, e.g. 7 → "07". */
export function fmtCount(n: number): string {
  return String(n).padStart(2, '0');
}
