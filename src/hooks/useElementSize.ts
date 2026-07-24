import { useCallback, useEffect, useRef, useState } from 'react';

interface ElementSize {
  width: number;
  height: number;
}

interface UseElementSizeOptions {
  /** Initial size returned before the element is measured. */
  initialWidth?: number;
  initialHeight?: number;
  /**
   * Debounce (ms) applied to live ResizeObserver updates — the initial
   * synchronous measurement on (re)mount is never debounced. Use this when
   * the measured value feeds something expensive to recompute on every
   * resize frame (e.g. a prop that re-triggers a third-party library's own
   * effect). Defaults to 0 (commit every observed change immediately).
   */
  debounceMs?: number;
}

/**
 * Measures an element's rendered box via ResizeObserver, exposed as a
 * callback ref so measurement re-runs correctly even if the element is
 * conditionally unmounted and remounted (a plain useRef + one-time effect
 * would go stale after a remount).
 */
export function useElementSize<T extends Element>(
  options: UseElementSizeOptions = {}
): [(el: T | null) => void, ElementSize] {
  const { initialWidth = 0, initialHeight = 0, debounceMs = 0 } = options;
  const [size, setSize] = useState<ElementSize>({ width: initialWidth, height: initialHeight });
  const roRef = useRef<ResizeObserver | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const commit = useCallback((width: number, height: number) => {
    setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
  }, []);

  const ref = useCallback((el: T | null) => {
    roRef.current?.disconnect();
    clearTimeout(debounceRef.current);
    if (!el) return;

    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) commit(rect.width, rect.height);

    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width <= 0 || height <= 0) return;
      if (debounceMs > 0) {
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => commit(width, height), debounceMs);
      } else {
        commit(width, height);
      }
    });
    ro.observe(el);
    roRef.current = ro;
  }, [commit, debounceMs]);

  useEffect(() => () => {
    roRef.current?.disconnect();
    clearTimeout(debounceRef.current);
  }, []);

  return [ref, size];
}
