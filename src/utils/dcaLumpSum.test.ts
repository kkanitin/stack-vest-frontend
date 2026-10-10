import { computeLumpSum } from './dcaLumpSum';
import type { DcaDataPoint } from '../api/simulations';

function point(date: string, price: number, totalUnits: number, totalInvested: number): DcaDataPoint {
  return {
    date, price, unitsPurchased: 0, totalUnits, totalInvested,
    portfolioValue: totalUnits * price, returnPct: 0,
  };
}

// $100 at $10, then $100 at $20, then price ends at $30 (closing point).
const rising = [
  point('2024-01-02', 10, 10, 100),
  point('2024-02-01', 20, 15, 200),
  point('2024-03-01', 30, 15, 200),
];

describe('computeLumpSum', () => {
  it('invests the whole total at the first purchase price and values it at each price', () => {
    const r = computeLumpSum(rising)!;
    // 200 / 10 = 20 units
    expect(r.values).toEqual([200, 400, 600]);
    expect(r.finalValue).toBe(600);
    expect(r.returnPct).toBe(200);
  });

  it('reports the difference from DCA and which did better', () => {
    const r = computeLumpSum(rising)!;
    // DCA ends at 15 units * 30 = 450
    expect(r.diff).toBe(150);
    expect(r.diffPct).toBe(75);
    expect(r.better).toBe('lump');
  });

  it('says DCA did better when the price falls after the start', () => {
    const falling = [
      point('2024-01-02', 20, 5, 100),
      point('2024-02-01', 10, 15, 200),
      point('2024-03-01', 10, 15, 200),
    ];
    const r = computeLumpSum(falling)!;
    expect(r.finalValue).toBe(100); // 10 units * 10
    expect(r.diff).toBe(-50); // DCA = 150
    expect(r.better).toBe('dca');
  });

  it('calls it a tie when the difference is under half a cent', () => {
    const flat = [point('2024-01-02', 10, 10, 100), point('2024-02-01', 10, 20, 200)];
    expect(computeLumpSum(flat)!.better).toBe('tie');
  });

  it('returns null with nothing to compare', () => {
    expect(computeLumpSum([])).toBeNull();
    expect(computeLumpSum([point('2024-01-02', 0, 0, 0)])).toBeNull();
  });
});
