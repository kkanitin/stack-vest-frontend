import { axisDates, describeChart, formatAxisDate, formatFullDate, nearestIndex } from './dcaChart';

describe('dcaChart', () => {
  it('spreads axis dates evenly including both ends', () => {
    expect(axisDates('2024-01-01', '2024-01-31', 3)).toEqual(['2024-01-01', '2024-01-16', '2024-01-31']);
  });

  it('returns just the first date when the range is empty', () => {
    expect(axisDates('2024-01-01', '2024-01-01', 5)).toEqual(['2024-01-01']);
  });

  it('labels short ranges with day and long ranges with year', () => {
    expect(formatAxisDate('2024-03-05', '2024-01-01', '2024-12-31')).toBe('Mar 5');
    expect(formatAxisDate('2024-03-05', '2021-01-01', '2024-12-31')).toBe("Mar '24");
    expect(formatFullDate('2024-03-05')).toBe('Mar 5, 2024');
  });

  it('finds the nearest index, including both ends and ties going left', () => {
    const times = [0, 10, 20, 40];
    expect(nearestIndex(times, -5)).toBe(0);
    expect(nearestIndex(times, 4)).toBe(0);
    expect(nearestIndex(times, 6)).toBe(1);
    expect(nearestIndex(times, 30)).toBe(2);
    expect(nearestIndex(times, 31)).toBe(3);
    expect(nearestIndex(times, 999)).toBe(3);
  });

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
