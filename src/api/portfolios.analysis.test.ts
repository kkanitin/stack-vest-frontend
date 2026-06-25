import { parsePortfolioAnalysis } from './portfolios';

describe('parsePortfolioAnalysis', () => {
  it('parses a complete JSON document into summary + dimensions', () => {
    const r = parsePortfolioAnalysis(
      JSON.stringify({
        summary: 'Concentrated portfolio.',
        dimensions: [
          { name: 'Diversification', score: 2.5, rating: 'CONCENTRATED', sentiment: 'caution', note: 'Limited spread' },
        ],
      })
    );
    expect(r).not.toBeNull();
    expect(r!.summary).toBe('Concentrated portfolio.');
    expect(r!.dimensions).toHaveLength(1);
    expect(r!.dimensions[0]).toMatchObject({ name: 'Diversification', score: 2.5, sentiment: 'caution' });
  });

  it('returns null for partial/invalid JSON (mid-stream)', () => {
    expect(parsePortfolioAnalysis('{ "summary": "The portfo')).toBeNull();
    expect(parsePortfolioAnalysis('')).toBeNull();
    expect(parsePortfolioAnalysis('not json')).toBeNull();
  });

  it('normalizes unknown sentiment to neutral and drops malformed dimensions', () => {
    const r = parsePortfolioAnalysis(
      JSON.stringify({
        summary: 'S',
        dimensions: [
          { name: 'A', score: 5, rating: 'X', sentiment: 'bogus', note: '' },
          { name: 'B' }, // no score → dropped
          { score: 3 }, // no name → dropped
        ],
      })
    );
    expect(r!.dimensions).toHaveLength(1);
    expect(r!.dimensions[0].sentiment).toBe('neutral');
  });
});
