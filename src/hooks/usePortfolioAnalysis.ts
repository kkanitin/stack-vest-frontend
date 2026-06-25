import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  analyzePortfolio,
  parsePortfolioAnalysis,
  DEFAULT_ANALYSIS_DIMENSIONS,
  type AnalysisDimension,
} from '../api/portfolios';

export type AnalysisStatus = 'idle' | 'streaming' | 'done' | 'error';

/**
 * Drives the streaming AI analysis for a single portfolio.
 *
 * Not a React Query hook — an SSE stream isn't a cacheable query. Manages the
 * accumulating text, the lifecycle status, and an AbortController so the request
 * is cancelled when the consumer (the modal) closes.
 */
export function usePortfolioAnalysis(portfolioId: string | undefined) {
  const { token } = useAuth();
  const [text, setText] = useState('');
  const [status, setStatus] = useState<AnalysisStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const start = useCallback(async () => {
    if (!token || !portfolioId) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setText('');
    setError(null);
    setStatus('streaming');
    try {
      await analyzePortfolio(token, portfolioId, DEFAULT_ANALYSIS_DIMENSIONS, {
        signal: controller.signal,
        onChunk: chunk => setText(prev => prev + chunk),
      });
      setStatus('done');
    } catch (err) {
      if (controller.signal.aborted) return; // consumer closed/restarted — not an error
      setError(err instanceof Error ? err.message : 'Failed to analyze portfolio');
      setStatus('error');
    }
  }, [token, portfolioId]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setText('');
    setError(null);
    setStatus('idle');
  }, []);

  // Abort any in-flight stream if the component unmounts.
  useEffect(() => () => abortRef.current?.abort(), []);

  // The stream concatenates into a JSON document; parse it once complete. While
  // streaming the partial text isn't valid JSON, so `analysis` stays null.
  const analysis = useMemo(() => parsePortfolioAnalysis(text), [text]);
  // Fall back to the raw text as the summary if the response wasn't the expected
  // JSON (e.g. a plain-prose backend) so something still renders on completion.
  const summary = analysis ? analysis.summary : status === 'done' ? text : '';
  const dimensions: AnalysisDimension[] = analysis?.dimensions ?? [];

  return { text, summary, dimensions, status, error, start, reset };
}
