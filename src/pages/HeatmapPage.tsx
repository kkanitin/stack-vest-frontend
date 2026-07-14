import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useWatchlistQuotes } from '../hooks/useWatchlistQuotes';
import { useSparklineData } from '../hooks/useSparklineData';
import HeatmapTile from '../components/HeatmapTile';
import SparklineList from '../components/SparklineList';
import PerformanceBarChart from '../components/PerformanceBarChart';
import ComparisonChart from '../components/ComparisonChart';
import AssetDetailModal from '../components/AssetDetailModal';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Button } from '@/components/ui/button';
import type { WatchlistEntry } from '../hooks/useWatchlistQuotes';
import type { HistoryPoint } from '../api/stocks';
import type { Period } from '../components/HeatmapTile';
// PERIOD_KEY used by child components via their own imports
import './HeatmapPage.css';

type ViewMode = 'heatmap' | 'list' | 'performance' | 'compare';
type SparklineLookback = '7D' | '30D' | '90D';
type CompareRange = '7D' | '30D' | '90D' | '1Y' | 'All';
type FilterValue = 'all' | 'technology' | 'healthcare' | 'finance';
type Segment<T extends string> = { value: T; label: string };

const VIEW_SEGS: Segment<ViewMode>[] = [
  { value: 'heatmap', label: 'Heatmap' },
  { value: 'list', label: 'List' },
  { value: 'performance', label: 'Performance' },
  { value: 'compare', label: 'Compare' },
];

const PERIOD_SEGS: Segment<Period>[] = [
  { value: '1D', label: '1D' },
  { value: '1W', label: '1W' },
  { value: '1M', label: '1M' },
  { value: 'YTD', label: 'YTD' },
];

const LOOKBACK_SEGS: Segment<SparklineLookback>[] = [
  { value: '7D', label: '7D' },
  { value: '30D', label: '30D' },
  { value: '90D', label: '90D' },
];

const COMPARE_RANGE_SEGS: Segment<CompareRange>[] = [
  { value: '7D', label: '7D' },
  { value: '30D', label: '30D' },
  { value: '90D', label: '90D' },
  { value: '1Y', label: '1Y' },
  // 'All' omitted from toolbar to keep it compact; 1Y is the widest shown
];

const CATEGORY_SEGS: Segment<FilterValue>[] = [
  { value: 'all', label: 'All' },
  { value: 'technology', label: 'Tech' },
  { value: 'healthcare', label: 'Health' },
  { value: 'finance', label: 'Finance' },
];

const CATEGORY_MAP: Record<Exclude<FilterValue, 'all'>, string> = {
  technology: 'Technology',
  healthcare: 'Healthcare',
  finance: 'Finance',
};

const SKELETON_COUNT = 8;

const HeatmapPage: React.FC = () => {
  const { entries, watchlistStatus, watchlistError, lastUpdated, refresh } =
    useWatchlistQuotes();

  const [viewMode, setViewMode] = useState<ViewMode>('heatmap');
  const [period, setPeriod] = useState<Period>('1D');
  const [sparklineLookback, setSparklineLookback] = useState<SparklineLookback>('7D');
  const [comparisonRange, setComparisonRange] = useState<CompareRange>('30D');
  const [filter, setFilter] = useState<FilterValue>('all');
  const [detailSymbol, setDetailSymbol] = useState<string | null>(null);

  // selectedSymbols with URL persistence
  const [selectedSymbols, setSelectedSymbols] = useState<Set<string>>(() => {
    const compare = new URLSearchParams(window.location.search).get('compare');
    return compare ? new Set(compare.split(',').filter(Boolean)) : new Set();
  });

  useEffect(() => {
    const url = new URL(window.location.href);
    if (selectedSymbols.size > 0) {
      url.searchParams.set('compare', [...selectedSymbols].join(','));
    } else {
      url.searchParams.delete('compare');
    }
    window.history.replaceState(null, '', url.toString());
  }, [selectedSymbols]);

  const maxCompare = Number(import.meta.env.VITE_MAX_COMPARE_ASSETS) || 5;

  const tiles: WatchlistEntry[] = entries;

  const allSymbols = useMemo(() => tiles.map(e => e.item.symbol).sort(), [tiles]);

  const { data: sparklineItems } = useSparklineData(allSymbols, sparklineLookback);
  const sparklineMap = useMemo<Map<string, HistoryPoint[]>>(() => {
    const m = new Map<string, HistoryPoint[]>();
    sparklineItems?.forEach(item => m.set(item.symbol, item.points));
    return m;
  }, [sparklineItems]);

  const filteredTiles = useMemo(
    () =>
      filter === 'all'
        ? tiles
        : tiles.filter(e =>
            Array.isArray(e.item.category) &&
            e.item.category.includes(CATEGORY_MAP[filter as Exclude<FilterValue, 'all'>])
          ),
    [tiles, filter]
  );

  const formattedTime = lastUpdated
    ? lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : null;

  const handleToggleSymbol = useCallback(
    (symbol: string) => {
      setSelectedSymbols(prev => {
        const next = new Set(prev);
        if (next.has(symbol)) {
          next.delete(symbol);
        } else if (next.size < maxCompare) {
          next.add(symbol);
        }
        return next;
      });
    },
    [maxCompare]
  );

  return (
    <div className="hm">
      <header className="hm-head">
        <div className="hm-head-text">
          <h1 className="hm-title">Market Heatmap</h1>
          <p className="hm-sub">Real-time investment performance across tracked assets.</p>
        </div>
        <div className="hm-toolbar">
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={viewMode}
            onValueChange={(v) => v && setViewMode(v as ViewMode)}
          >
            {VIEW_SEGS.map((s) => (
              <ToggleGroupItem key={s.value} value={s.value}>{s.label}</ToggleGroupItem>
            ))}
          </ToggleGroup>
          {viewMode !== 'compare' && (
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              value={period}
              onValueChange={(v) => v && setPeriod(v as Period)}
            >
              {PERIOD_SEGS.map((s) => (
                <ToggleGroupItem key={s.value} value={s.value}>{s.label}</ToggleGroupItem>
              ))}
            </ToggleGroup>
          )}
          {(viewMode === 'heatmap' || viewMode === 'list') && (
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              value={sparklineLookback}
              onValueChange={(v) => v && setSparklineLookback(v as SparklineLookback)}
            >
              {LOOKBACK_SEGS.map((s) => (
                <ToggleGroupItem key={s.value} value={s.value}>{s.label}</ToggleGroupItem>
              ))}
            </ToggleGroup>
          )}
          {viewMode === 'compare' && (
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              value={comparisonRange}
              onValueChange={(v) => v && setComparisonRange(v as CompareRange)}
            >
              {COMPARE_RANGE_SEGS.map((s) => (
                <ToggleGroupItem key={s.value} value={s.value}>{s.label}</ToggleGroupItem>
              ))}
            </ToggleGroup>
          )}
          {viewMode === 'heatmap' && (
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              value={filter}
              onValueChange={(v) => v && setFilter(v as FilterValue)}
            >
              {CATEGORY_SEGS.map((s) => (
                <ToggleGroupItem key={s.value} value={s.value}>{s.label}</ToggleGroupItem>
              ))}
            </ToggleGroup>
          )}
          <Button variant="outline" onClick={refresh} className="hm-refresh">
            ↻ Refresh
          </Button>
        </div>
      </header>

      <div className="hm-legend">
        <span className="hm-legend-label">Performance Scale</span>
        <span className="hm-legend-scale" aria-hidden />
        <span className="hm-legend-range">
          <span>-5%</span>
          <span>0</span>
          <span>+5%</span>
        </span>
        {formattedTime && (
          <span className="hm-updated">Updated {formattedTime}</span>
        )}
      </div>

      {watchlistStatus === 'error' ? (
        <div className="hm-error">
          <span>⚠</span>
          <span className="hm-error-msg">{watchlistError}</span>
          <Button variant="outline" onClick={refresh}>Retry</Button>
        </div>
      ) : (
        <>
          {/* Heatmap view */}
          {viewMode === 'heatmap' && (
            <div className="hm-grid">
                {watchlistStatus === 'loading'
                  ? Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                      <div key={i} className="htile" style={{ pointerEvents: 'none' }}>
                        <div className="htile-top">
                          <div className="htile-skel" style={{ height: 14, width: '45%' }} />
                          <div className="htile-skel" style={{ height: 14, width: '25%' }} />
                        </div>
                        <div className="htile-skel" style={{ height: 11, width: '70%', marginBottom: 14 }} />
                        <div className="htile-skel htile-skel-lg" />
                        <div className="htile-skel htile-skel-sm" />
                      </div>
                    ))
                  : filteredTiles.length === 0 && filter !== 'all'
                  ? <div className="hm-empty">No assets in this category.</div>
                  : filteredTiles.map(entry => (
                      <HeatmapTile
                        key={entry.item.id}
                        entry={entry}
                        period={period}
                        sparklinePoints={sparklineMap.get(entry.item.symbol)}
                        onClick={setDetailSymbol}
                        isSelected={selectedSymbols.has(entry.item.symbol)}
                      />
                    ))
                }
            </div>
          )}

          {/* List view */}
          {viewMode === 'list' && (
            <SparklineList
              entries={tiles}
              sparklineMap={sparklineMap}
              period={period}
              selectedSymbols={selectedSymbols}
              onSelectSymbol={handleToggleSymbol}
              maxCompare={maxCompare}
              onTileClick={setDetailSymbol}
            />
          )}

          {/* Performance view */}
          {viewMode === 'performance' && (
            <PerformanceBarChart entries={tiles} period={period} />
          )}

          {/* Compare view */}
          {viewMode === 'compare' && (
            <div className="hm-compare">
              {selectedSymbols.size > 0 && (
                <div className="hm-chips">
                  {[...selectedSymbols].map(sym => (
                    <span key={sym} className="hm-chip">
                      {sym}
                      <button
                        onClick={() => handleToggleSymbol(sym)}
                        aria-label={`Remove ${sym} from comparison`}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <ComparisonChart
                symbols={[...selectedSymbols]}
                range={comparisonRange}
              />
            </div>
          )}
        </>
      )}

      <AssetDetailModal symbol={detailSymbol} onClose={() => setDetailSymbol(null)} />
    </div>
  );
};

export default HeatmapPage;
