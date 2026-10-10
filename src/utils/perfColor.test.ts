import { describe, it, expect } from 'vitest';
import { perfLevel, PERIOD_CLAMP } from './perfColor';

describe('perfLevel', () => {
  it('steps by a third of the clamp in each direction', () => {
    expect(perfLevel(0.5, 3)).toBe(1);
    expect(perfLevel(1.5, 3)).toBe(2);
    expect(perfLevel(2.5, 3)).toBe(3);
    expect(perfLevel(-0.5, 3)).toBe(-1);
    expect(perfLevel(-2.9, 3)).toBe(-3);
  });

  it('saturates beyond the clamp', () => {
    expect(perfLevel(40, PERIOD_CLAMP.YTD)).toBe(3);
    expect(perfLevel(-12, 3)).toBe(-3);
  });

  it('treats tiny moves and missing values as flat', () => {
    expect(perfLevel(0, 3)).toBe(0);
    expect(perfLevel(0.05, 3)).toBe(0);
    expect(perfLevel(null, 3)).toBe(0);
  });

  it('uses a wider clamp for longer periods', () => {
    expect(perfLevel(5, PERIOD_CLAMP['1D'])).toBe(3);
    expect(perfLevel(5, PERIOD_CLAMP.YTD)).toBe(1);
  });
});
