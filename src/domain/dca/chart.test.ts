import { describeChart } from './chart';

describe('dca chart', () => {
  it('describes the chart for screen readers', () => {
    const text = describeChart([
      { date: '2024-01-02', invested: 100, value: 100 },
      { date: '2024-06-03', invested: 200, value: 260 },
      { date: '2024-12-31', invested: 300, value: 250 },
    ]);
    expect(text).toContain('Jan 2, 2024 to Dec 31, 2024');
    expect(text).toContain('Invested $300; final value $250');
    expect(text).toContain('Highest value $260 on Jun 3, 2024');
  });

  it('copes with no data', () => {
    expect(describeChart([])).toMatch(/no data/);
  });
});
