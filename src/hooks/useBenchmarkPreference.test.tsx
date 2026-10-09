import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBenchmarkPreference } from './useBenchmarkPreference';

let currentUser: { id: string } | null = { id: 'u1' };
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: currentUser }) }));

const LIST = [
  { symbol: 'SPY', label: 'S&P 500' },
  { symbol: 'QQQ', label: 'Nasdaq 100' },
];

describe('useBenchmarkPreference', () => {
  beforeEach(() => {
    currentUser = { id: 'u1' };
    localStorage.clear();
  });
  afterEach(() => vi.restoreAllMocks());

  it('is off by default', () => {
    const { result } = renderHook(() => useBenchmarkPreference(LIST));
    expect(result.current[0]).toBeNull();
  });

  it('remembers the choice per user', () => {
    const { result } = renderHook(() => useBenchmarkPreference(LIST));
    act(() => result.current[1]('QQQ'));

    expect(result.current[0]).toBe('QQQ');
    expect(localStorage.getItem('stackvest:benchmark:u1')).toBe('QQQ');

    act(() => result.current[1](null));
    expect(result.current[0]).toBeNull();
    expect(localStorage.getItem('stackvest:benchmark:u1')).toBeNull();
  });

  it('restores a stored choice, but not for another user', () => {
    localStorage.setItem('stackvest:benchmark:u1', 'SPY');
    expect(renderHook(() => useBenchmarkPreference(LIST)).result.current[0]).toBe('SPY');

    currentUser = { id: 'u2' };
    expect(renderHook(() => useBenchmarkPreference(LIST)).result.current[0]).toBeNull();
  });

  it('ignores a stored symbol that is not offered, or while the list is loading', () => {
    localStorage.setItem('stackvest:benchmark:u1', 'XYZ');
    expect(renderHook(() => useBenchmarkPreference(LIST)).result.current[0]).toBeNull();

    localStorage.setItem('stackvest:benchmark:u1', 'SPY');
    expect(renderHook(() => useBenchmarkPreference(undefined)).result.current[0]).toBeNull();
  });

  it('survives storage that throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { result } = renderHook(() => useBenchmarkPreference(LIST));
    expect(result.current[0]).toBeNull();

    act(() => result.current[1]('SPY'));
    expect(result.current[0]).toBe('SPY');
  });
});
