import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AnalyzePortfolioModal from './AnalyzePortfolioModal';
import { analyzePortfolio } from '../api/portfolios';
import type { Portfolio } from '../api/portfolios';

// Keep the real parsePortfolioAnalysis / types; only stub the network call.
vi.mock('../api/portfolios', async importActual => {
  const actual = await importActual<typeof import('../api/portfolios')>();
  return { ...actual, analyzePortfolio: vi.fn() };
});
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ token: 'test-token' }) }));

const mockedAnalyze = vi.mocked(analyzePortfolio);

const portfolio: Portfolio = {
  id: 'p1',
  name: 'Growth',
  description: '',
  createdAt: '',
  updatedAt: '',
};

beforeEach(() => vi.clearAllMocks());

describe('AnalyzePortfolioModal', () => {
  it('parses the streamed JSON and renders the summary + dimension cards', async () => {
    const payload = JSON.stringify({
      summary: 'Heavy tech concentration.',
      dimensions: [
        { name: 'Risk Profile', score: 8.8, rating: 'HIGH', sentiment: 'caution', note: 'Elevated risk' },
        { name: 'Growth Potential', score: 9.2, rating: 'OUTSTANDING', sentiment: 'positive', note: 'Strong upside' },
      ],
    });
    mockedAnalyze.mockImplementation(async (_t, _id, _dims, opts) => {
      opts.onChunk(payload);
    });

    render(<AnalyzePortfolioModal open onClose={() => {}} portfolio={portfolio} />);

    expect(await screen.findByText('Heavy tech concentration.')).toBeInTheDocument();
    expect(screen.getByText('Risk Profile')).toBeInTheDocument();
    expect(screen.getByText('Growth Potential')).toBeInTheDocument();
    expect(screen.getByText('HIGH')).toBeInTheDocument();
    expect(screen.getByText('OUTSTANDING')).toBeInTheDocument();
    expect(mockedAnalyze).toHaveBeenCalledWith(
      'test-token',
      'p1',
      ['diversification', 'risk', 'fees'],
      expect.objectContaining({ onChunk: expect.any(Function) })
    );
  });

  it('shows the error message and a Retry button when the stream fails', async () => {
    mockedAnalyze.mockRejectedValueOnce(new Error('portfolio has no holdings to analyze'));

    render(<AnalyzePortfolioModal open onClose={() => {}} portfolio={portfolio} />);

    expect(await screen.findByText(/no holdings to analyze/i)).toBeInTheDocument();
    const retry = screen.getByRole('button', { name: /retry/i });

    // Retry re-invokes the stream; a plain-prose response falls back to raw summary text.
    mockedAnalyze.mockImplementationOnce(async (_t, _id, _dims, opts) => {
      opts.onChunk('Recovered.');
    });
    fireEvent.click(retry);
    await waitFor(() => expect(screen.getByText('Recovered.')).toBeInTheDocument());
  });
});
