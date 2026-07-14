import React, { useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import DimensionCard from './DimensionCard';
import { usePortfolioAnalysis } from '../hooks/usePortfolioAnalysis';
import type { Portfolio } from '../api/portfolios';
import './AnalyzePortfolioModal.css';

interface Props {
  open: boolean;
  onClose: () => void;
  portfolio: Portfolio | null;
}

const SparkleIcon: React.FC = () => (
  <svg className="apm-sparkle" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2l1.7 5.1L19 9l-5.3 1.9L12 16l-1.7-5.1L5 9l5.3-1.9z" />
    <path d="M18.5 14l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9z" />
  </svg>
);

const AnalyzePortfolioModal: React.FC<Props> = ({ open, onClose, portfolio }) => {
  const { summary, dimensions, status, error, start, reset } = usePortfolioAnalysis(portfolio?.id);

  // Stream on open; abort + clear on close.
  useEffect(() => {
    if (open) {
      start();
    } else {
      reset();
    }
  }, [open, start, reset]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-[960px]">
        <DialogHeader>
          <DialogTitle>
            <span className="apm-head-title">
              <SparkleIcon />
              AI Strategy Analysis
            </span>
          </DialogTitle>
        </DialogHeader>
        <div className="apm">
        {status === 'error' ? (
          <section className="apm-section">
            <h3 className="apm-label">Analysis Summary</h3>
            <div className="apm-error">
              <p className="apm-error-text">⚠ {error ?? 'Failed to analyze portfolio'}</p>
              <Button variant="outline" onClick={() => start()}>Retry</Button>
            </div>
          </section>
        ) : summary === '' ? (
          status === 'done' ? (
            <section className="apm-section">
              <p className="apm-empty">No analysis was returned for this portfolio.</p>
            </section>
          ) : (
            <section className="apm-section">
              <div className="apm-loading" role="status">
                <span className="apm-spinner" aria-hidden="true" />
                <span>Analyzing your portfolio…</span>
              </div>
            </section>
          )
        ) : (
          <>
            <section className="apm-section">
              <h3 className="apm-label">Analysis Summary</h3>
              <div className="apm-markdown">
                <ReactMarkdown>{summary}</ReactMarkdown>
              </div>
            </section>

            {dimensions.length > 0 && (
              <section className="apm-section">
                <h3 className="apm-label">Portfolio Dimensions</h3>
                <div className="apm-dims">
                  {dimensions.map(d => (
                    <DimensionCard key={d.name} dimension={d} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
      </DialogContent>
    </Dialog>
  );
};

export default AnalyzePortfolioModal;
