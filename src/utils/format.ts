/** Shared number/value formatting helpers. */

export function fmtMoney(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return `$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function fmtPct(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

export function fmtShares(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 8 });
}

/** Zero-padded count, e.g. 7 → "07". */
export function fmtCount(n: number): string {
  return String(n).padStart(2, '0');
}
