import React, { memo, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { layoutTreemap } from '../utils/treemapLayout';
import { perfLevel, PERIOD_CLAMP } from '../utils/perfColor';
import type { HeatmapSector, HeatmapStock } from '../api/market';
import type { TileRect } from '../utils/treemapLayout';
import type { Period } from './HeatmapTile';

const HEADER_HEIGHT = 18;

function formatChange(val: number | null): string {
  if (val === null) return '—';
  return `${val >= 0 ? '+' : ''}${val.toFixed(2)}%`;
}

function formatCap(val: number): string {
  if (val >= 1e12) return `$${(val / 1e12).toFixed(2)}T`;
  if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
  return `$${(val / 1e6).toFixed(0)}M`;
}

/** Map height for a given width: landscape on desktop, portrait on phones so tiles stay legible. */
function mapHeight(width: number): number {
  if (width < 640) return Math.round(width * 1.6);
  return Math.round(Math.min(Math.max(width * 0.6, 480), 860));
}

function logoUrl(symbol: string): string {
  return `https://financialmodelingprep.com/image-stock/${encodeURIComponent(symbol)}.png`;
}

interface TileProps {
  tile: TileRect;
  period: Period;
  onSelect?: (symbol: string) => void;
  onHover: (tile: TileRect | null) => void;
}

const Tile: React.FC<TileProps> = memo(({ tile, period, onSelect, onHover }) => {
  const { stock, x0, y0, x1, y1 } = tile;
  const w = x1 - x0;
  const h = y1 - y0;
  const change = stock.change[period];
  const level = perfLevel(change, PERIOD_CLAMP[period]);

  // Content scales with the tile: logo + symbol + change, then symbol + change,
  // then symbol only, then nothing (the tooltip still has it all).
  const showSymbol = w >= 26 && h >= 14;
  const showChange = w >= 40 && h >= 30;
  const showLogo = w >= 84 && h >= 84;
  const symbolSize = Math.max(9, Math.min(w / 4.2, h / (showChange ? 3.4 : 1.8), 26));
  const changeSize = Math.max(9, symbolSize * 0.62);
  const logoSize = Math.min(Math.max(Math.min(w, h) * 0.3, 20), 52);

  return (
    <button
      type="button"
      className="itm-tile"
      data-level={level}
      style={{ left: x0, top: y0, width: w, height: h }}
      onClick={() => onSelect?.(stock.symbol)}
      onMouseEnter={() => onHover(tile)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(tile)}
      onBlur={() => onHover(null)}
      aria-label={`${stock.symbol} ${stock.name} ${formatChange(change)} ${period}`}
    >
      {showLogo && (
        <img
          className="itm-logo"
          src={logoUrl(stock.symbol)}
          alt=""
          width={logoSize}
          height={logoSize}
          loading="lazy"
          onError={e => { e.currentTarget.style.display = 'none'; }}
        />
      )}
      {showSymbol && (
        <span className="itm-symbol" style={{ fontSize: symbolSize }}>{stock.symbol}</span>
      )}
      {showChange && (
        <span className="itm-change" style={{ fontSize: changeSize }}>{formatChange(change)}</span>
      )}
    </button>
  );
});
Tile.displayName = 'IndexTreemapTile';

const Tooltip: React.FC<{ stock: HeatmapStock; sector: string; period: Period; style: React.CSSProperties }> = ({
  stock, sector, period, style,
}) => (
  <div className="itm-tip" style={style} role="tooltip">
    <div className="itm-tip-head">
      <span className="itm-tip-symbol">{stock.symbol}</span>
      <span className="itm-tip-name">{stock.name}</span>
    </div>
    <div className="itm-tip-sub">{stock.subSector ? `${sector} · ${stock.subSector}` : sector}</div>
    <dl className="itm-tip-grid">
      <dt>Price</dt><dd>${stock.price.toFixed(2)}</dd>
      <dt>Mkt cap</dt><dd>{formatCap(stock.marketCap)}</dd>
      {(['1D', '1W', '1M', 'YTD'] as const).map(p => (
        <React.Fragment key={p}>
          <dt className={p === period ? 'is-active' : undefined}>{p}</dt>
          <dd data-sign={stock.change[p] === null ? undefined : stock.change[p]! >= 0 ? 'up' : 'down'}>
            {formatChange(stock.change[p])}
          </dd>
        </React.Fragment>
      ))}
    </dl>
  </div>
);

interface Props {
  sectors: HeatmapSector[];
  period: Period;
  onSelect?: (symbol: string) => void;
}

/** Market-cap treemap of an index: sectors with labelled headers, tiles sized by market cap and coloured by change. */
const IndexTreemap: React.FC<Props> = ({ sectors, period, onSelect }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hovered, setHovered] = useState<TileRect | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(entries => setWidth(Math.floor(entries[0].contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const height = mapHeight(width);
  const layout = useMemo(
    () => layoutTreemap(sectors, width, height, { headerHeight: HEADER_HEIGHT }),
    [sectors, width, height]
  );

  // Place the tooltip beside the hovered tile, flipping to stay inside the map.
  let tipStyle: React.CSSProperties | undefined;
  if (hovered) {
    const tipW = 240;
    const right = hovered.x1 + 8;
    const left = right + tipW > width ? Math.max(hovered.x0 - tipW - 8, 0) : right;
    tipStyle = { left, top: Math.min(hovered.y0, Math.max(height - 190, 0)), width: tipW };
  }

  return (
    <div ref={ref} className="itm" style={{ height }}>
      {layout.sectors.map(s => (
        <div
          key={s.name}
          className="itm-sector"
          style={{ left: s.x0, top: s.y0, width: s.x1 - s.x0, height: s.y1 - s.y0 }}
        >
          {s.x1 - s.x0 >= 48 && <span className="itm-sector-label">{s.name} ›</span>}
        </div>
      ))}
      {layout.tiles.map(t => (
        <Tile key={t.stock.symbol} tile={t} period={period} onSelect={onSelect} onHover={setHovered} />
      ))}
      {hovered && tipStyle && (
        <Tooltip stock={hovered.stock} sector={hovered.sector} period={period} style={tipStyle} />
      )}
    </div>
  );
};

export default IndexTreemap;
