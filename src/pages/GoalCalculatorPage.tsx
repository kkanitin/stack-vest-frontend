import React, { useMemo, useState } from 'react';
import { Card, CardTitle } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  DEFAULT_GOAL_FORM,
  hasErrors,
  parseGoalInputs,
  validateGoalInputs,
  type GoalFormInputs,
  type GoalInputErrors,
  type GoalKind,
} from '../utils/goalInputs';
import { computeGoalResult, type GoalResult } from '../utils/goalResult';
import { fmtAmount, fmtRate } from '../utils/format';
import ShortGoalNotice from '../components/ShortGoalNotice';
import type { GoalRange } from '../utils/goalMath';
import { useElementSize } from '../hooks/useElementSize';
import GoalGrowthChart from '../components/GoalGrowthChart';
import './GoalCalculatorPage.css';

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

function GrowthCard({ result }: { result: GoalResult }) {
  // Match the SVG viewBox to the rendered box so axis text is not stretched.
  const [wrapRef, size] = useElementSize<HTMLDivElement>({ initialWidth: 760, initialHeight: 260 });
  if (!result.chart) return null;
  const isTarget = result.kind === 'target';
  return (
    <Card className="goal-chart-card px-6" data-testid="goal-chart-card">
      <CardTitle className="label-caps">Growth over time</CardTitle>
      <div className="goal-chart-wrap" ref={wrapRef}>
        <GoalGrowthChart
          points={result.chart}
          returns={result.returns}
          currency={result.currency}
          target={isTarget ? result.targetNominal : undefined}
          width={size.width}
          height={size.height}
        />
      </div>
      <div className="goal-chart-legend">
        <span className="goal-legend-item">
          <span className="goal-legend-swatch" />
          Expected value
        </span>
        <span className="goal-legend-item">
          <span className="goal-legend-swatch goal-legend-swatch--band" />
          Low–high return
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

function Results({ result, stale }: { result: GoalResult; stale: boolean }) {
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

      <GrowthCard result={result} />

      <Card className="goal-range-card px-6">
        <CardTitle className="label-caps">
          {isTarget ? 'Monthly amount needed by return' : 'Final value by return'}
        </CardTitle>
        <RangeRow range={result.range} returns={result.returns} currency={currency} perMonth={isTarget} />
        <p className="goal-note">
          A single steady return never happens in practice. The low and high cases show how much the
          result depends on it.
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

const GoalCalculatorPage: React.FC = () => {
  const [form, setForm] = useState<GoalFormInputs>(DEFAULT_GOAL_FORM);
  const [todaysMoney, setTodaysMoney] = useState(false);

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

  const update = (field: TextField, value: string) => setForm(f => ({ ...f, [field]: value }));
  const setKind = (kind: GoalKind) => setForm(f => ({ ...f, kind }));
  const currencyLabel = form.currency.trim() || undefined;
  const isTarget = form.kind === 'target';

  return (
    <div className="goal">
      <header className="goal-head">
        <h1 className="goal-title">Goal Calculator</h1>
        <p className="goal-sub">Plan toward a goal: see what you could have, or what you need to save each month.</p>
        <p className="goal-disclaimer">
          A projection at a steady return you choose. Real returns vary from year to year. This is not investment advice.
        </p>
      </header>

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
                hint="Label only, no conversion." />
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

          <div className="goal-field-row">
            <Field field="years" label="Years" form={form} errors={errors} onChange={update} suffix="yrs" />
            <Field field="expectedReturn" label="Expected return a year" form={form} errors={errors}
              onChange={update} suffix="%" />
          </div>

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
            <Results result={result} stale={!valid} />
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
};

export default GoalCalculatorPage;
