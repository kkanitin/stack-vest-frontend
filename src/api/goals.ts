import { API_BASE } from './config';
import type { GoalKind } from '../utils/goalInputs';

/**
 * A saved financial goal (`/goals`, backend KAN-15). The backend stores inputs only; every
 * result is calculated in the browser. Optional numbers and `portfolioId` are `null` when
 * unset. Percentages are annual, e.g. 7 means 7%.
 */
export interface Goal {
  id: string;
  name: string;
  kind: GoalKind;
  currency: string;
  startingAmount: number;
  monthlyAmount: number | null;
  targetAmount: number | null;
  /** A whole number of years, 1–100. */
  years: number;
  expectedReturn: number;
  contributionGrowth: number | null;
  inflation: number | null;
  /**
   * Annual volatility, percent (0–100), for the chance of reaching the goal (KAN-32). Null when
   * not set; missing from older backends.
   */
  volatility?: number | null;
  /** Cleared by the backend when the linked portfolio is deleted. */
  portfolioId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Body of `POST /goals` and `PUT /goals/:id`. PUT replaces every field, so `null` clears one. */
export type GoalBody = Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>;

/** Thrown when the per-user goal limit is reached (HTTP 409). */
export class GoalLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GoalLimitError';
  }
}

/** Thrown for a goal that does not exist or is not the user's (HTTP 404). */
export class GoalNotFoundError extends Error {
  constructor(message = 'Goal not found') {
    super(message);
    this.name = 'GoalNotFoundError';
  }
}

/**
 * The backend caps goals per user (50 by default) and pages at up to 100, so one page holds
 * every goal.
 */
const LIST_PAGE_SIZE = 100;

function authHeaders(token: string, json = false): HeadersInit {
  return json
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { Authorization: `Bearer ${token}` };
}

const goalUrl = (id: string) => `${API_BASE}/goals/${encodeURIComponent(id)}`;

/** The user's goals, newest first (`GET /goals`, a list envelope). */
export async function listGoals(token: string): Promise<Goal[]> {
  const res = await fetch(`${API_BASE}/goals?page=1&size=${LIST_PAGE_SIZE}`, {
    headers: authHeaders(token),
  });
  const data = await res.json();
  if (res.ok && data.code === 200) return (data.results ?? []) as Goal[];
  throw new Error(data.errorMessage || 'Failed to load goals');
}

export async function getGoal(token: string, id: string): Promise<Goal> {
  const res = await fetch(goalUrl(id), { headers: authHeaders(token) });
  const data = await res.json().catch(() => ({}));
  if (res.ok && data.code === 200) return data.result as Goal;
  if (res.status === 404) throw new GoalNotFoundError(data.errorMessage || undefined);
  throw new Error(data.errorMessage || 'Failed to load goal');
}

export async function createGoal(token: string, body: GoalBody): Promise<Goal> {
  const res = await fetch(`${API_BASE}/goals`, {
    method: 'POST',
    headers: authHeaders(token, true),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (res.ok && data.code === 201) return data.result as Goal;
  if (res.status === 409) throw new GoalLimitError(data.errorMessage || 'Goal limit reached');
  throw new Error(data.errorMessage || 'Failed to save goal');
}

export async function updateGoal(token: string, id: string, body: GoalBody): Promise<Goal> {
  const res = await fetch(goalUrl(id), {
    method: 'PUT',
    headers: authHeaders(token, true),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (res.ok && data.code === 200) return data.result as Goal;
  if (res.status === 404) throw new GoalNotFoundError(data.errorMessage || undefined);
  throw new Error(data.errorMessage || 'Failed to save changes');
}

export async function deleteGoal(token: string, id: string): Promise<void> {
  const res = await fetch(goalUrl(id), { method: 'DELETE', headers: authHeaders(token) });
  if (res.status === 204 || res.ok) return;
  const data = await res.json().catch(() => ({}));
  throw new Error(data.errorMessage || 'Failed to delete goal');
}
