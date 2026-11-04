import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Link, useBlocker, useNavigate, useParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  hasErrors,
  parseGoalInputs,
  validateGoalInputs,
  type GoalFormInputs,
  type GoalInputErrors,
  type GoalKind,
} from '../utils/goalInputs';
import {
  computeGoalResult,
  computeGoalSimulation,
  type GoalResult,
  type GoalSimulationResult,
} from '../utils/goalResult';
import { bandLegend, type GoalChartBand } from '../utils/goalChart';
import { chanceNote, describeChance, noChanceText } from '../utils/goalChance';
import { fmtAmount, fmtRate } from '../utils/format';
import ShortGoalNotice from '../components/ShortGoalNotice';
import type { GoalRange } from '../utils/goalMath';
import { useElementSize } from '../hooks/useElementSize';
import GoalGrowthChart from '../components/GoalGrowthChart';
import GoalPortfolioLink from '../components/GoalPortfolioLink';
import { useSuggestedReturn } from '../hooks/useSuggestedReturn';
import { suggestedRate, suggestedVolatility } from '../utils/suggestedReturn';
import {
  applySuggestions,
  initialSuggestedFields,
  linkChanged,
  markTyped,
  restoreSuggestion,
  SUGGESTED_FIELDS,
  type SuggestedField,
} from '../utils/suggestedFields';
import { usePortfolios } from '../hooks/usePortfolios';
import { useGoal } from '../hooks/useGoals';
import { useGoalMutations } from '../hooks/useGoalMutations';
import { GoalNotFoundError, type Goal } from '../api/goals';
import { useToast } from '../context/ToastContext';
import InlineConfirm from '../components/InlineConfirm';
import GoalProgressPanel from '../components/GoalProgressPanel';
import {
  NEW_GOAL_DRAFT,
  draftToBody,
  goalToDraft,
  sameDraft,
  saveProblem,
  type GoalDraft,
} from '../utils/savedGoal';
import './GoalCalculatorPage.css';

/**
 * Navigation state that lets a page leave without the unsaved-changes check, for moves the
 * page makes itself right after saving or deleting (before the cleared flag has rendered).
 */
const LEAVE_SAVED = { goalSaved: true } as const;

function leavesSaved(state: unknown): boolean {
  return typeof state === 'object' && state !== null && (state as { goalSaved?: unknown }).goalSaved === true;
}

function errorText(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

type TextField = Exclude<keyof GoalFormInputs, 'kind'>;

function fmtYears(n: number): string {
  return `${Number(n.toFixed(2))} ${n === 1 ? 'year' : 'years'}`;
}

function FieldError({ id, children }: { id: string; children: React.ReactNode }) {
  return <div id={id} className="goal-field-error" role="alert">{children}</div>;
}

interface FieldProps {
  field: TextField;
  label: string;
  form: GoalFormInputs;
  errors: GoalInputErrors;
  onChange: (field: TextField, value: string) => void;
  /** Shown inside the input on the right, e.g. the currency label or "%". */
  suffix?: string;
  hint?: string;
  numeric?: boolean;
  placeholder?: string;
}

function Field({ field, label, form, errors, onChange, suffix, hint, numeric = true, placeholder }: FieldProps) {
  const id = `goal-${field}`;
  const error = errors[field];
  const describedBy = [error ? `${id}-err` : null, hint ? `${id}-hint` : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className="goal-field">
      <label className="goal-label" htmlFor={id}>{label}</label>
      <div className="goal-input-wrap">
        <input
          id={id}
          className={`goal-input${numeric ? ' goal-input--mono' : ''}${suffix ? ' goal-input--suffixed' : ''}`}
          type={numeric ? 'number' : 'text'}
          inputMode={numeric ? 'decimal' : undefined}
          step="any"
          value={form[field]}
          placeholder={placeholder}
          onChange={e => onChange(field, e.target.value)}
          aria-invalid={!!error}
          aria-describedby={describedBy}
        />
        {suffix && <span className="goal-input-suffix" aria-hidden="true">{suffix}</span>}
      </div>
      {hint && <div id={`${id}-hint`} className="goal-hint">{hint}</div>}
      {error && <FieldError id={`${id}-err`}>{error}</FieldError>}
    </div>
  );
}

function RangeRow({
  range,
  returns,
  currency,
  perMonth,
}: {
  range: GoalRange<number | null>;
  returns: GoalRange<number>;
  currency: string;
  perMonth: boolean;
}) {
  const cells: { key: keyof GoalRange<number>; label: string }[] = [
    { key: 'low', label: 'Low' },
    { key: 'expected', label: 'Expected' },
    { key: 'high', label: 'High' },
  ];
  return (
    <div className="goal-range" data-testid="goal-range">
      {cells.map(({ key, label }) => {
        const value = range[key];
        return (
          <div key={key} className={`goal-range-cell${key === 'expected' ? ' goal-range-cell--expected' : ''}`}>
            <div className="goal-range-label">{label} · {fmtRate(returns[key])} a year</div>
            <div className="goal-range-value">
              {value == null ? 'Not reachable' : (
                <>
                  {fmtAmount(value, currency)}
                  {perMonth && <span className="goal-per-month"> / month</span>}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * The chance of reaching the target (target mode) or the range of simulated outcomes
 * (projection mode), or one line saying a volatility is needed (KAN-35).
 */
function ChanceCard({
  result,
  simulation,
  pending,
}: {
  result: GoalResult;
  simulation: GoalSimulationResult | null;
  /** The simulation is still catching up with the latest inputs. */
  pending: boolean;
}) {
  if (result.kind === 'target' && result.headline == null) return null;
  if (!simulation) {
    return <p className="goal-chance-none" data-testid="goal-chance-none">{noChanceText(result.kind)}</p>;
  }
  return (
    <Card className={`goal-chance px-6${pending ? ' goal-chance--pending' : ''}`} data-testid="goal-chance" aria-busy={pending}>
      <CardTitle className="label-caps">
        {result.kind === 'target' ? 'Chance of reaching it' : 'Likely range'}
      </CardTitle>
      <p className="goal-chance-text" data-testid="goal-chance-text">{describeChance(result, simulation)}</p>
      <p className="goal-note" role="note">{chanceNote(simulation)}</p>
    </Card>
  );
}

function GrowthCard({ result, simulation }: { result: GoalResult; simulation: GoalSimulationResult | null }) {
  // Match the SVG viewBox to the rendered box so axis text is not stretched.
  const [wrapRef, size] = useElementSize<HTMLDivElement>({ initialWidth: 760, initialHeight: 260 });
  if (!result.chart) return null;
  const isTarget = result.kind === 'target';
  // With a volatility the band is the simulated percentiles and the line their median (KAN-36).
  const band: GoalChartBand = simulation
    ? { kind: 'percentiles', percentiles: simulation.percentiles, paths: simulation.paths }
    : { kind: 'returns', returns: result.returns };
  const points = simulation ? simulation.chart : result.chart;
  return (
    <Card className="goal-chart-card px-6" data-testid="goal-chart-card">
      <CardTitle className="label-caps">Growth over time</CardTitle>
      <div className="goal-chart-wrap" ref={wrapRef}>
        <GoalGrowthChart
          points={points}
          band={band}
          currency={result.currency}
          target={isTarget ? result.targetNominal : undefined}
          width={size.width}
          height={size.height}
        />
      </div>
      <div className="goal-chart-legend">
        <span className="goal-legend-item">
          <span className="goal-legend-swatch" />
          {simulation ? 'Median of simulations' : 'Expected value'}
        </span>
        <span className="goal-legend-item" data-testid="goal-legend-band">
          <span className="goal-legend-swatch goal-legend-swatch--band" />
          {bandLegend(band)}
        </span>
        <span className="goal-legend-item">
          <span className="goal-legend-swatch goal-legend-swatch--dashed" />
          Amount invested
        </span>
        {isTarget && (
          <span className="goal-legend-item">
            <span className="goal-legend-swatch goal-legend-swatch--target" />
            Target
          </span>
        )}
      </div>
    </Card>
  );
}

function Results({
  result,
  simulation,
  simulationPending,
  stale,
}: {
  result: GoalResult;
  simulation: GoalSimulationResult | null;
  simulationPending: boolean;
  stale: boolean;
}) {
  const { currency } = result;
  const isTarget = result.kind === 'target';
  const figures = result.figures;

  return (
    <div className={`goal-results${stale ? ' goal-results--stale' : ''}`} data-testid="goal-results">
      {stale && (
        <p className="goal-stale-note" role="status">
          Showing the last valid result. Fix the highlighted fields to update it.
        </p>
      )}

      <Card className="goal-headline px-6">
        <div className="goal-headline-label">
          {isTarget ? 'You need to invest each month' : `You could have in ${fmtYears(result.years)}`}
        </div>
        <div className="goal-headline-value" data-testid="goal-headline">
          {result.headline == null
            ? 'Not reachable'
            : `${fmtAmount(result.headline, currency)}${isTarget ? ' / month' : ''}`}
        </div>
        {result.kind === 'target' && result.headline == null && (
          <p className="goal-note">No monthly amount reaches this target at this return. Try a longer time or a higher return.</p>
        )}
        {result.kind === 'target' && result.headline === 0 && (
          <p className="goal-note">Your starting amount already reaches the target at the expected return.</p>
        )}
        <div className="goal-headline-sub">at the expected return of {fmtRate(result.returns.expected)} a year</div>
      </Card>

      <ChanceCard result={result} simulation={simulation} pending={simulationPending} />

      {result.cashComparison && (
        <ShortGoalNotice
          kind={result.kind}
          comparison={result.cashComparison}
          expectedReturnPct={result.returns.expected}
          currency={currency}
        />
      )}

      {figures && (
        <div className={`goal-kpis${isTarget ? '' : ' goal-kpis--two'}`}>
          {/* In projection mode the headline already is the final value. */}
          {isTarget && (
            <div className="goal-kpi">
              <div className="goal-kpi-label">Final value</div>
              <div className="goal-kpi-value">{fmtAmount(figures.finalValue, currency)}</div>
            </div>
          )}
          <div className="goal-kpi">
            <div className="goal-kpi-label">Total invested</div>
            <div className="goal-kpi-value">{fmtAmount(figures.totalInvested, currency)}</div>
          </div>
          <div className="goal-kpi">
            <div className="goal-kpi-label">Growth</div>
            <div className={`goal-kpi-value ${figures.gain >= 0 ? 'positive' : 'negative'}`}>
              {fmtAmount(figures.gain, currency)}
            </div>
          </div>
        </div>
      )}

      <GrowthCard result={result} simulation={simulation} />

      <Card className="goal-range-card px-6">
        <CardTitle className="label-caps">
          {isTarget ? 'Monthly amount needed by return' : 'Final value by return'}
        </CardTitle>
        <RangeRow range={result.range} returns={result.returns} currency={currency} perMonth={isTarget} />
        <p className="goal-note">
          A single steady return never happens in practice. The low and high cases show how much the
          result depends on it.
          {simulation && ' The chart’s band shows the spread of simulated outcomes instead.'}
        </p>
      </Card>

      <p className="goal-basis-note" data-testid="goal-basis-note">
        {result.kind === 'projection'
          ? result.todaysMoney
            ? `In today's money: amounts are divided by ${fmtRate(result.inflationPct)} inflation over ${fmtYears(result.years)}, to show what they would buy today.`
            : 'In future money: amounts are not adjusted for inflation.'
          : result.todaysMoney
            ? `Target in today's money: ${fmtAmount(result.targetAmount, currency)} today is ${fmtAmount(result.targetNominal, currency)} in ${fmtYears(result.years)} at ${fmtRate(result.inflationPct)} inflation. The other amounts are future money.`
            : 'In future money: the target and amounts are not adjusted for inflation.'}
      </p>
    </div>
  );
}

/** The calculator for a new goal (`saved` null) or a saved one, loaded into the form. */
function GoalCalculator({ saved }: { saved: Goal | null }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { create: createMutation, update: updateMutation, remove: removeMutation } = useGoalMutations();

  // What was last saved (or the blank form for a new goal); the form is dirty when it differs.
  const [baseline, setBaseline] = useState<GoalDraft>(() => (saved ? goalToDraft(saved) : NEW_GOAL_DRAFT));
  const [form, setForm] = useState<GoalFormInputs>(baseline.form);
  const [todaysMoney, setTodaysMoney] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Inputs are checked on every render. Invalid inputs never produce results; the last valid
  // inputs stay on screen until the form is valid again.
  const errors = validateGoalInputs(form);
  const valid = !hasErrors(errors);
  const [lastValidForm, setLastValidForm] = useState<GoalFormInputs | null>(null);
  if (valid && lastValidForm !== form) {
    // Adjusting state while rendering (React's documented pattern): no effect, no extra paint.
    setLastValidForm(form);
  }
  const shownForm = valid ? form : lastValidForm;

  const result = useMemo(
    () => (shownForm ? computeGoalResult(parseGoalInputs(shownForm), todaysMoney) : null),
    [shownForm, todaysMoney],
  );
  // The Monte Carlo (KAN-35) runs on a deferred copy of the inputs, so typing stays smooth;
  // the deterministic figures above update at once. Same inputs → same seeded result.
  const simForm = useDeferredValue(shownForm);
  const simulation = useMemo(
    () => (simForm ? computeGoalSimulation(parseGoalInputs(simForm), todaysMoney) : null),
    [simForm, todaysMoney],
  );

  // Optional portfolio link (KAN-21, KAN-34). The suggested return and volatility fill their
  // fields unless the user typed a value there themselves; an empty field is always free to
  // fill. The rules live in `suggestedFields`.
  const [portfolioId, setPortfolioId] = useState(baseline.portfolioId);
  // A saved goal's values are the user's choice: a suggestion never overwrites them.
  const [suggestedFields, setSuggestedFields] = useState(() => initialSuggestedFields(saved !== null));
  // A saved goal can point at a portfolio that has since been deleted.
  const portfolios = usePortfolios();
  const linkRemoved =
    portfolioId !== '' && !!portfolios.data && !portfolios.data.some(p => p.id === portfolioId);
  // Ask for a suggestion once the portfolio is known to exist (or the list failed to load),
  // so a deleted one is never asked for.
  const linkKnown = portfolios.data ? !linkRemoved : portfolios.isError;
  const linkedId = portfolioId && linkKnown ? portfolioId : undefined;
  const suggestion = useSuggestedReturn(linkedId);
  const suggestedValues = {
    expectedReturn: linkedId ? suggestedRate(suggestion.data) : null,
    volatility: linkedId ? suggestedVolatility(suggestion.data) : null,
  };
  const filled = applySuggestions(suggestedFields, form, portfolioId, suggestedValues);
  if (filled) {
    // Adjusting state while rendering, as above: fill each field once per new suggestion.
    setSuggestedFields(filled.state);
    setForm(filled.form);
    // A saved goal whose own link fills a field it saved empty (e.g. a volatility saved
    // before the field existed): the fill is not the user's edit, so it is not "unsaved".
    if (saved && portfolioId === baseline.portfolioId) {
      const autoFilled = SUGGESTED_FIELDS.filter(
        f => baseline.form[f] === '' && form[f] === '' && filled.form[f] !== '',
      );
      if (autoFilled.length > 0) {
        const fills = Object.fromEntries(autoFilled.map(f => [f, filled.form[f]]));
        setBaseline(b => ({ ...b, form: { ...b.form, ...fills } }));
      }
    }
  }

  const changePortfolio = (id: string) => {
    setPortfolioId(id);
    // Filled-in suggestions belonged to the old portfolio; typed values are the user's to keep.
    const next = linkChanged(suggestedFields, form);
    setSuggestedFields(next.state);
    setForm(next.form);
  };
  const applySuggested = (field: SuggestedField, value: number) => {
    const next = restoreSuggestion(suggestedFields, form, field, value);
    setSuggestedFields(next.state);
    setForm(next.form);
  };

  const update = (field: TextField, value: string) => {
    if (field === 'expectedReturn' || field === 'volatility') {
      setSuggestedFields(state => markTyped(state, field));
    }
    setForm(f => ({ ...f, [field]: value }));
  };
  const setKind = (kind: GoalKind) => setForm(f => ({ ...f, kind }));
  const currencyLabel = form.currency.trim() || undefined;
  const isTarget = form.kind === 'target';

  // Saving (KAN-22).
  const dirty = !sameDraft({ form, portfolioId }, baseline);
  const problem = valid ? saveProblem(form) : null;
  const saving = createMutation.isPending || updateMutation.isPending;
  const canSave = valid && !problem && !saving && (saved === null || dirty || linkRemoved);
  let saveHint: string | null = null;
  if (!valid && (saved !== null || dirty)) saveHint = 'Fix the highlighted fields to save.';
  else if (problem) saveHint = problem;

  const applySaved = (goal: Goal) => {
    const draft = goalToDraft(goal);
    setBaseline(draft);
    setForm(draft.form);
    setPortfolioId(draft.portfolioId);
    setSuggestedFields(state => ({ ...state, typed: initialSuggestedFields(true).typed }));
  };

  const save = () => {
    if (!canSave) return;
    const body = draftToBody({ form, portfolioId: linkRemoved ? '' : portfolioId });
    const onError = (err: unknown) => toast.error(errorText(err, 'Failed to save goal'));
    if (saved) {
      updateMutation.mutate({ id: saved.id, body }, {
        onSuccess: goal => {
          applySaved(goal);
          toast.success('Changes saved');
        },
        onError,
      });
    } else {
      createMutation.mutate(body, {
        onSuccess: goal => {
          toast.success('Goal saved');
          navigate(`/dashboard/goals/${goal.id}`, { replace: true, state: LEAVE_SAVED });
        },
        onError,
      });
    }
  };

  const deleteGoal = () => {
    if (!saved) return;
    removeMutation.mutate(saved.id, {
      onSuccess: () => {
        toast.success('Goal deleted');
        navigate('/dashboard/goals', { state: LEAVE_SAVED });
      },
      onError: err => {
        setConfirmDelete(false);
        toast.error(errorText(err, 'Failed to delete goal'));
      },
    });
  };

  // Unsaved changes are flagged before leaving: in-app moves ask in the page, closing or
  // reloading the tab gets the browser's own prompt.
  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    dirty && currentLocation.pathname !== nextLocation.pathname && !leavesSaved(nextLocation.state),
  );
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  return (
    <div className="goal">
      <header className="goal-head">
        <Link to="/dashboard/goals" className="goal-back">← All goals</Link>
        <div className="goal-head-row">
          <h1 className="goal-title">{saved ? baseline.form.name : 'Goal Calculator'}</h1>
          <div className="goal-save-bar">
            {dirty && <span className="goal-unsaved" data-testid="goal-unsaved">Unsaved changes</span>}
            {saved && (
              <Button type="button" variant="ghost" onClick={() => setConfirmDelete(true)} disabled={removeMutation.isPending}>
                Delete
              </Button>
            )}
            <Button type="button" onClick={save} disabled={!canSave}>
              {saving ? 'Saving…' : saved ? 'Save changes' : 'Save'}
            </Button>
          </div>
        </div>
        {saveHint && <p className="goal-save-hint" data-testid="goal-save-hint">{saveHint}</p>}
        {blocker.state === 'blocked' && (
          <InlineConfirm
            className="goal-head-confirm"
            message="You have unsaved changes. Leave this page without saving them?"
            confirmLabel="Leave without saving"
            cancelLabel="Stay"
            onConfirm={() => blocker.proceed()}
            onCancel={() => blocker.reset()}
          />
        )}
        {saved && confirmDelete && (
          <InlineConfirm
            className="goal-head-confirm"
            message={`Delete “${baseline.form.name}”? This cannot be undone.`}
            confirmLabel="Delete goal"
            danger
            busy={removeMutation.isPending}
            onConfirm={deleteGoal}
            onCancel={() => setConfirmDelete(false)}
          />
        )}
        <p className="goal-sub">Plan toward a goal: see what you could have, or what you need to save each month.</p>
        <p className="goal-disclaimer">
          A projection at a steady return you choose. Real returns vary from year to year. This is not investment advice.
        </p>
      </header>

      {saved && <GoalProgressPanel goal={saved} unsaved={dirty} />}

      <div className="goal-grid">
        <Card className="goal-form px-6">
          <CardTitle className="label-caps">Your Goal</CardTitle>
          <ToggleGroup
            type="single"
            variant="outline"
            value={form.kind}
            onValueChange={v => v && setKind(v as GoalKind)}
            aria-label="What to calculate"
            className="goal-mode"
          >
            <ToggleGroupItem value="projection">How much will I have?</ToggleGroupItem>
            <ToggleGroupItem value="target">How much must I save?</ToggleGroupItem>
          </ToggleGroup>

          <div className="goal-field-row">
            <Field field="name" label="Goal name" form={form} errors={errors} onChange={update} numeric={false}
              placeholder={isTarget ? 'House down payment' : 'Retirement'} />
            <div className="goal-field-narrow">
              <Field field="currency" label="Currency" form={form} errors={errors} onChange={update} numeric={false}
                hint={portfolioId ? 'A code such as THB lets progress convert the portfolio value.' : 'Label only, no conversion.'} />
            </div>
          </div>

          <Field field="startingAmount" label="Starting amount (optional)" form={form} errors={errors}
            onChange={update} suffix={currencyLabel} placeholder="0" />

          {isTarget ? (
            <Field field="targetAmount" label="Target amount" form={form} errors={errors} onChange={update}
              suffix={currencyLabel} />
          ) : (
            <Field field="monthlyAmount" label="Monthly amount" form={form} errors={errors} onChange={update}
              suffix={currencyLabel} />
          )}

          <GoalPortfolioLink
            portfolioId={portfolioId}
            onPortfolioChange={changePortfolio}
            suggestion={suggestion}
            expectedReturnText={form.expectedReturn}
            volatilityText={form.volatility}
            onUseSuggested={applySuggested}
            linkRemoved={linkRemoved}
          />

          <div className="goal-field-row">
            <Field field="years" label="Years" form={form} errors={errors} onChange={update} suffix="yrs" />
            <Field field="expectedReturn" label="Expected return a year" form={form} errors={errors}
              onChange={update} suffix="%" />
          </div>

          <Field field="volatility" label="Volatility a year (optional)" form={form} errors={errors}
            onChange={update} suffix="%"
            hint={suggestedValues.volatility != null
              ? 'How much the yearly return swings. Used for the chance of reaching your goal.'
              : 'Leave empty to skip the chance of reaching your goal. Broad stock funds are often 15–20%.'} />

          <div className="goal-field-row">
            <Field field="contributionGrowth" label="Yearly increase in monthly amount (optional)" form={form}
              errors={errors} onChange={update} suffix="%" placeholder="0" />
            <Field field="inflation" label="Inflation a year (optional)" form={form} errors={errors}
              onChange={update} suffix="%" placeholder="0" />
          </div>
        </Card>

        <div className="goal-right" aria-live="polite">
          <label className="goal-check">
            <input type="checkbox" checked={todaysMoney} onChange={e => setTodaysMoney(e.target.checked)} />
            Show in today's money
          </label>
          {result ? (
            <Results
              result={result}
              simulation={simulation}
              simulationPending={simForm !== shownForm}
              stale={!valid}
            />
          ) : (
            <Card className="goal-empty px-6" data-testid="goal-empty">
              <p className="goal-empty-text">
                Fill in the form to see {isTarget ? 'how much you need to save each month' : 'what you could have'}.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function SavedGoal({ id }: { id: string }) {
  const goal = useGoal(id);
  if (goal.data) return <GoalCalculator key={id} saved={goal.data} />;
  if (goal.isPending) {
    return (
      <Card className="goal-empty px-6" data-testid="goal-loading">
        <p className="goal-empty-text" role="status">Loading your goal…</p>
      </Card>
    );
  }
  const notFound = goal.error instanceof GoalNotFoundError;
  return (
    <Card className="goal-empty px-6" data-testid="goal-load-error">
      <p className="goal-empty-text" role="alert">
        {notFound ? 'This goal does not exist. It may have been deleted.' : errorText(goal.error, 'Could not load this goal.')}
      </p>
      <div className="goal-load-actions">
        {!notFound && <Button type="button" variant="outline" onClick={() => goal.refetch()}>Try again</Button>}
        <Button asChild variant="ghost"><Link to="/dashboard/goals">All goals</Link></Button>
      </div>
    </Card>
  );
}

/** `/dashboard/goals/new` starts a blank goal; `/dashboard/goals/:id` opens a saved one. */
const GoalCalculatorPage: React.FC = () => {
  const { id } = useParams();
  return id ? <SavedGoal key={id} id={id} /> : <GoalCalculator key="new" saved={null} />;
};

export default GoalCalculatorPage;
