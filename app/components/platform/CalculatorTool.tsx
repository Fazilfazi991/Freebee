import { useState, type FormEvent } from 'react';
import { Calculator, RotateCcw } from 'lucide-react';
import { track } from '~/lib/analytics';
import {
  CalculatorError,
  ageBetween,
  bmi,
  calculateDate,
  calories,
  carLoan,
  compoundInterest,
  dateDifference,
  durationSeconds,
  formatCurrency,
  formatDate,
  formatNumber,
  loanPayment,
  mortgage,
  percentage,
  simpleInterest,
  timeCalculation,
} from '~/lib/tools/calculators/engine';

type Field = {
  name: string;
  label: string;
  type?: string;
  value?: string;
  min?: number;
  max?: number;
  step?: string;
  options?: [string, string][];
};
type Result = { label: string; value: string; primary?: boolean };

const guidance: Record<string, { method: string; example: string; disclaimer?: string }> = {
  'age-calculator': {
    method:
      'Uses calendar years and months first, then counts remaining days. It does not divide elapsed milliseconds by 365.',
    example: 'A birth date of 15 June 1990 is compared with the chosen target date using real month lengths.',
  },
  'date-calculator': {
    method:
      'Adds or subtracts calendar years and months before weeks and days. End-of-month dates are clamped to the last valid day.',
    example: 'Adding one month to 31 January lands on the last valid day of February.',
  },
  'date-difference-calculator': {
    method: 'Finds complete calendar years and months, then remaining days; total days use UTC date-only values.',
    example: 'Reverse date order is accepted and identified in the result.',
  },
  'time-calculator': {
    method: 'Converts each duration to seconds, performs the operation, then normalizes the result.',
    example: '30 hours remains a 30-hour duration rather than wrapping to a six o’clock time.',
  },
  'bmi-calculator': {
    method:
      'Metric: kg ÷ m². Imperial: 703 × lb ÷ in². Adult reference categories use the standard 18.5 and 25 BMI thresholds.',
    example: 'The healthy-weight range shows the weights corresponding to BMI 18.5–24.9 for the entered height.',
    disclaimer:
      'BMI is a screening metric, not a diagnosis. It does not account for every difference in body composition; discuss health concerns with a qualified clinician.',
  },
  'percentage-calculator': {
    method: 'Supports part-of, ratio-as-percent, relative change, and percentage adjustment formulas.',
    example: 'A change from 80 to 100 is (100 − 80) ÷ 80 × 100 = 25%.',
  },
  'simple-interest-calculator': {
    method: 'A = P(1 + rt), with monthly durations converted to a fraction of a year.',
    example: 'AED 10,000 at 5% for 5 years earns AED 2,500 simple interest.',
    disclaimer: 'This is a mathematical estimate, not financial advice or a guarantee of returns.',
  },
  'compound-interest-calculator': {
    method: 'Applies the periodic rate to the current balance, then adds recurring contributions for each period.',
    example: 'Changing compounding or contribution frequency changes when growth and deposits are applied.',
    disclaimer: 'Results are estimates. Rates and returns are not guaranteed, and fees or taxes are not included.',
  },
  'investment-calculator': {
    method: 'Uses the compound-growth engine with the selected return, frequency, and contributions.',
    example: 'The result separates money contributed from estimated growth.',
    disclaimer:
      'Projected returns are estimates, not guarantees or financial advice. Actual investments can lose value.',
  },
  'loan-calculator': {
    method:
      'Uses the standard reducing-balance amortization formula; at 0% interest, principal is divided evenly by the term.',
    example: 'Extra payments are applied monthly and may shorten the schedule.',
    disclaimer: 'Loan results are estimates and exclude lender-specific fees unless entered elsewhere.',
  },
  'emi-calculator': {
    method: 'Uses the same reducing-balance amortization formula as the loan calculator.',
    example: 'EMI is shown with the total interest and total amount payable.',
    disclaimer: 'This estimate is not a lender quote or financial advice.',
  },
  'mortgage-calculator': {
    method:
      'Financed principal equals home price minus down payment. Optional annual costs are divided by 12 and added to principal and interest.',
    example: 'Taxes, insurance, and HOA values affect the monthly estimate but not the loan amortization.',
    disclaimer: 'This is an estimate, not a lending offer. Taxes, insurance, fees, and rates vary.',
  },
  'car-loan-calculator': {
    method:
      'Financed amount = vehicle price − down payment − trade-in + financed fees, then the standard amortizing-loan formula is applied.',
    example: 'Cash fees should be left out; include only fees financed into the loan.',
    disclaimer: 'This estimate is not a lender or dealer quote and excludes unentered costs.',
  },
  'amortization-calculator': {
    method:
      'Each payment first covers periodic interest; the remainder reduces principal. Rounding is deferred until display.',
    example: 'The first year is shown monthly and longer schedules are summarized at year-end.',
    disclaimer: 'The schedule is an estimate and may differ from a lender’s rounding or payment dates.',
  },
  'calorie-calculator': {
    method:
      'Uses the Mifflin–St Jeor adult BMR equation and multiplies BMR by the selected activity factor to estimate TDEE.',
    example: 'Maintenance calories describe an estimate for stable weight, not a prescribed intake.',
    disclaimer:
      'Calorie needs vary. This calculator is educational, not medical advice, and is not intended for children, pregnancy, or treatment planning.',
  },
};
const today = () => new Date().toISOString().slice(0, 10);
const n = (form: FormData, name: string) => Number(form.get(name) || 0);
const s = (form: FormData, name: string) => String(form.get(name) || '');
const money = (v: number) => formatCurrency(v, 'AED');
const result = (label: string, value: string, primary = false): Result => ({ label, value, primary });

const fields: Record<string, Field[]> = {
  'age-calculator': [
    { name: 'birth', label: 'Date of birth', type: 'date' },
    { name: 'target', label: 'Calculate age on', type: 'date', value: today() },
  ],
  'date-calculator': [
    { name: 'start', label: 'Start date', type: 'date', value: today() },
    {
      name: 'mode',
      label: 'Operation',
      options: [
        ['add', 'Add'],
        ['subtract', 'Subtract'],
      ],
    },
    { name: 'years', label: 'Years', type: 'number', value: '0', min: 0 },
    { name: 'months', label: 'Months', type: 'number', value: '0', min: 0 },
    { name: 'weeks', label: 'Weeks', type: 'number', value: '0', min: 0 },
    { name: 'days', label: 'Days', type: 'number', value: '0', min: 0 },
  ],
  'date-difference-calculator': [
    { name: 'start', label: 'Start date', type: 'date' },
    { name: 'end', label: 'End date', type: 'date', value: today() },
    {
      name: 'inclusive',
      label: 'Counting method',
      options: [
        ['exclusive', 'Exclude end date'],
        ['inclusive', 'Include both dates'],
      ],
    },
  ],
  'time-calculator': [
    {
      name: 'mode',
      label: 'Operation',
      options: [
        ['add', 'Add durations'],
        ['subtract', 'Subtract second duration'],
        ['difference', 'Difference'],
      ],
    },
    { name: 'aHours', label: 'First: hours', type: 'number', value: '1', min: 0 },
    { name: 'aMinutes', label: 'First: minutes', type: 'number', value: '0', min: 0 },
    { name: 'aSeconds', label: 'First: seconds', type: 'number', value: '0', min: 0 },
    { name: 'bHours', label: 'Second: hours', type: 'number', value: '0', min: 0 },
    { name: 'bMinutes', label: 'Second: minutes', type: 'number', value: '30', min: 0 },
    { name: 'bSeconds', label: 'Second: seconds', type: 'number', value: '0', min: 0 },
  ],
  'bmi-calculator': [
    {
      name: 'unit',
      label: 'Unit system',
      options: [
        ['metric', 'Metric (kg / cm)'],
        ['imperial', 'Imperial (lb / in)'],
      ],
    },
    { name: 'weight', label: 'Weight', type: 'number', value: '70', min: 1, step: '0.1' },
    { name: 'height', label: 'Height', type: 'number', value: '170', min: 1, step: '0.1' },
  ],
  'percentage-calculator': [
    {
      name: 'mode',
      label: 'Question',
      options: [
        ['of', 'What is X% of Y?'],
        ['whatPercent', 'X is what percent of Y?'],
        ['change', 'Percentage change from X to Y'],
        ['adjust', 'Change X by Y%'],
      ],
    },
    { name: 'x', label: 'X', type: 'number', value: '20', step: 'any' },
    { name: 'y', label: 'Y', type: 'number', value: '100', step: 'any' },
    {
      name: 'direction',
      label: 'Adjustment',
      options: [
        ['increase', 'Increase'],
        ['decrease', 'Decrease'],
      ],
    },
  ],
  'simple-interest-calculator': [
    { name: 'principal', label: 'Principal (AED)', type: 'number', value: '10000', min: 0, step: '0.01' },
    { name: 'rate', label: 'Annual interest rate (%)', type: 'number', value: '5', min: 0, step: '0.01' },
    { name: 'duration', label: 'Duration', type: 'number', value: '5', min: 0.01, step: '0.01' },
    {
      name: 'durationUnit',
      label: 'Duration unit',
      options: [
        ['years', 'Years'],
        ['months', 'Months'],
      ],
    },
  ],
  'compound-interest-calculator': [],
  'investment-calculator': [],
  'loan-calculator': [],
  'emi-calculator': [],
  'amortization-calculator': [],
  'mortgage-calculator': [],
  'car-loan-calculator': [],
  'calorie-calculator': [],
};

const compoundFields: Field[] = [
  { name: 'principal', label: 'Initial amount (AED)', type: 'number', value: '10000', min: 0, step: '0.01' },
  { name: 'rate', label: 'Annual rate (%)', type: 'number', value: '5', min: 0, step: '0.01' },
  { name: 'years', label: 'Duration (years)', type: 'number', value: '10', min: 0.01, step: '0.01' },
  {
    name: 'frequency',
    label: 'Compounding',
    options: [
      ['1', 'Annually'],
      ['2', 'Semi-annually'],
      ['4', 'Quarterly'],
      ['12', 'Monthly'],
      ['365', 'Daily'],
    ],
  },
  { name: 'contribution', label: 'Recurring contribution (AED)', type: 'number', value: '0', min: 0, step: '0.01' },
  {
    name: 'contributionFrequency',
    label: 'Contribution frequency',
    options: [
      ['monthly', 'Monthly'],
      ['annually', 'Annually'],
    ],
  },
];
const loanFields: Field[] = [
  { name: 'principal', label: 'Loan amount (AED)', type: 'number', value: '100000', min: 0, step: '0.01' },
  { name: 'rate', label: 'Annual interest rate (%)', type: 'number', value: '5', min: 0, step: '0.01' },
  { name: 'term', label: 'Term', type: 'number', value: '5', min: 0.01, step: '0.01' },
  {
    name: 'termUnit',
    label: 'Term unit',
    options: [
      ['years', 'Years'],
      ['months', 'Months'],
    ],
  },
];
fields['compound-interest-calculator'] = compoundFields;
fields['investment-calculator'] = compoundFields.map((f) =>
  f.name === 'rate' ? { ...f, label: 'Expected annual return (%)' } : f,
);
fields['loan-calculator'] = [
  ...loanFields,
  { name: 'extra', label: 'Extra monthly payment (AED)', type: 'number', value: '0', min: 0, step: '0.01' },
];
fields['emi-calculator'] = loanFields;
fields['amortization-calculator'] = loanFields;
fields['mortgage-calculator'] = [
  { name: 'price', label: 'Home price (AED)', type: 'number', value: '1000000', min: 1 },
  { name: 'down', label: 'Down payment (AED)', type: 'number', value: '200000', min: 0 },
  { name: 'rate', label: 'Annual interest rate (%)', type: 'number', value: '4.5', min: 0, step: '0.01' },
  { name: 'term', label: 'Mortgage term (years)', type: 'number', value: '25', min: 0.01, step: '0.01' },
  { name: 'tax', label: 'Estimated property tax / year', type: 'number', value: '0', min: 0 },
  { name: 'insurance', label: 'Estimated insurance / year', type: 'number', value: '0', min: 0 },
  { name: 'hoa', label: 'HOA / month', type: 'number', value: '0', min: 0 },
];
fields['car-loan-calculator'] = [
  { name: 'price', label: 'Vehicle price (AED)', type: 'number', value: '120000', min: 1 },
  { name: 'down', label: 'Down payment (AED)', type: 'number', value: '20000', min: 0 },
  { name: 'trade', label: 'Trade-in value (AED)', type: 'number', value: '0', min: 0 },
  { name: 'fees', label: 'Fees financed (AED)', type: 'number', value: '0', min: 0 },
  { name: 'rate', label: 'Annual interest rate (%)', type: 'number', value: '4', min: 0, step: '0.01' },
  { name: 'term', label: 'Term (months)', type: 'number', value: '60', min: 1 },
];
fields['calorie-calculator'] = [
  {
    name: 'unit',
    label: 'Unit system',
    options: [
      ['metric', 'Metric (kg / cm)'],
      ['imperial', 'Imperial (lb / in)'],
    ],
  },
  {
    name: 'sex',
    label: 'Sex used by the equation',
    options: [
      ['male', 'Male'],
      ['female', 'Female'],
    ],
  },
  { name: 'age', label: 'Age', type: 'number', value: '30', min: 18, max: 120 },
  { name: 'weight', label: 'Weight', type: 'number', value: '70', min: 1, step: '0.1' },
  { name: 'height', label: 'Height', type: 'number', value: '170', min: 1, step: '0.1' },
  {
    name: 'activity',
    label: 'Activity level',
    options: [
      ['sedentary', 'Sedentary'],
      ['light', 'Light exercise'],
      ['moderate', 'Moderate exercise'],
      ['active', 'Very active'],
      ['veryActive', 'Extremely active'],
    ],
  },
];

function calculate(
  slug: string,
  f: FormData,
): { results: Result[]; rows?: ReturnType<typeof loanPayment>['schedule'] } {
  if (slug === 'age-calculator') {
    const v = ageBetween(s(f, 'birth'), s(f, 'target'));
    return {
      results: [
        result('Exact age', `${v.years} years, ${v.months} months, ${v.days} days`, true),
        result('Total months', formatNumber(v.totalMonths, 0)),
        result('Total weeks', formatNumber(v.totalWeeks, 0)),
        result('Total days', formatNumber(v.totalDays, 0)),
        result('Next birthday', formatDate(v.nextBirthday)),
        result('Days until next birthday', formatNumber(v.daysUntilNextBirthday, 0)),
      ],
    };
  }

  if (slug === 'date-calculator') {
    const d = calculateDate(s(f, 'start'), s(f, 'mode') as 'add' | 'subtract', {
      years: n(f, 'years'),
      months: n(f, 'months'),
      weeks: n(f, 'weeks'),
      days: n(f, 'days'),
    });
    return {
      results: [
        result('Resulting date', formatDate(d), true),
        result('ISO date', d.toISOString().slice(0, 10)),
        result('Weekday', new Intl.DateTimeFormat('en', { weekday: 'long', timeZone: 'UTC' }).format(d)),
      ],
    };
  }

  if (slug === 'date-difference-calculator') {
    const v = dateDifference(s(f, 'start'), s(f, 'end'), s(f, 'inclusive') === 'inclusive');
    return {
      results: [
        result('Calendar difference', `${v.years} years, ${v.months} months, ${v.days} days`, true),
        result('Total days', formatNumber(v.totalDays, 0)),
        result('Total weeks', formatNumber(v.totalWeeks)),
        result('Total hours', formatNumber(v.totalHours, 0)),
        ...(v.reversed ? [result('Date order', 'Dates were compared in reverse order')] : []),
      ],
    };
  }

  if (slug === 'time-calculator') {
    const a = durationSeconds(n(f, 'aHours'), n(f, 'aMinutes'), n(f, 'aSeconds')),
      b = durationSeconds(n(f, 'bHours'), n(f, 'bMinutes'), n(f, 'bSeconds'));
    const v = timeCalculation(a, b, s(f, 'mode') as 'add' | 'subtract' | 'difference');

    return {
      results: [
        result('Normalized duration', `${v.hours}h ${v.minutes}m ${v.seconds}s`, true),
        result('Total hours', formatNumber(v.totalHours)),
        result('Total minutes', formatNumber(v.totalMinutes)),
        result('Total seconds', formatNumber(v.totalSeconds, 0)),
      ],
    };
  }

  if (slug === 'bmi-calculator') {
    const v = bmi(n(f, 'weight'), n(f, 'height'), s(f, 'unit') as 'metric' | 'imperial');
    const unit = s(f, 'unit') === 'metric' ? 'kg' : 'lb';

    return {
      results: [
        result('BMI', formatNumber(v.value, 1), true),
        result('Adult screening category', v.category),
        result('Healthy BMI reference', '18.5–24.9'),
        result(
          'Corresponding weight range',
          `${formatNumber(v.healthyMinimumWeight, 1)}–${formatNumber(v.healthyMaximumWeight, 1)} ${unit}`,
        ),
      ],
    };
  }

  if (slug === 'percentage-calculator') {
    const mode = s(f, 'mode') as 'of' | 'whatPercent' | 'change' | 'adjust';
    const v = percentage(mode, n(f, 'x'), n(f, 'y'), s(f, 'direction') as 'increase' | 'decrease');

    return {
      results: [
        result(
          mode === 'whatPercent' || mode === 'change' ? 'Percentage' : 'Result',
          `${formatNumber(v)}${mode === 'whatPercent' || mode === 'change' ? '%' : ''}`,
          true,
        ),
      ],
    };
  }

  if (slug === 'simple-interest-calculator') {
    const v = simpleInterest(
      n(f, 'principal'),
      n(f, 'rate'),
      n(f, 'duration'),
      s(f, 'durationUnit') as 'years' | 'months',
    );
    return {
      results: [
        result('Final amount', money(v.finalAmount), true),
        result('Interest', money(v.interest)),
        result('Principal', money(v.principal)),
      ],
    };
  }

  if (slug === 'compound-interest-calculator' || slug === 'investment-calculator') {
    const v = compoundInterest(
      n(f, 'principal'),
      n(f, 'rate'),
      n(f, 'years'),
      n(f, 'frequency'),
      n(f, 'contribution'),
      s(f, 'contributionFrequency') as 'monthly' | 'annually',
    );
    return {
      results: [
        result(slug.startsWith('investment') ? 'Estimated final value' : 'Final balance', money(v.finalBalance), true),
        result('Total contributions', money(v.totalContributions)),
        result(slug.startsWith('investment') ? 'Estimated growth' : 'Total interest', money(v.totalInterest)),
      ],
    };
  }

  const months = s(f, 'termUnit') === 'months' ? n(f, 'term') : n(f, 'term') * 12;

  if (slug === 'loan-calculator' || slug === 'emi-calculator' || slug === 'amortization-calculator') {
    const v = loanPayment(n(f, 'principal'), n(f, 'rate'), months, slug === 'loan-calculator' ? n(f, 'extra') : 0);
    return {
      results: [
        result(slug === 'emi-calculator' ? 'EMI' : 'Monthly payment', money(v.monthlyPayment), true),
        result('Total interest', money(v.totalInterest)),
        result('Total amount payable', money(v.totalPayment)),
      ],
      rows: slug === 'amortization-calculator' ? v.schedule : undefined,
    };
  }

  if (slug === 'mortgage-calculator') {
    const v = mortgage(
      n(f, 'price'),
      n(f, 'down'),
      n(f, 'rate'),
      n(f, 'term') * 12,
      n(f, 'tax'),
      n(f, 'insurance'),
      n(f, 'hoa'),
    );
    return {
      results: [
        result('Estimated monthly total', money(v.estimatedMonthlyTotal), true),
        result('Loan principal', money(v.principal)),
        result('Principal + interest / month', money(v.principalAndInterest)),
        result('Total interest', money(v.totalInterest)),
        result('Total repayment', money(v.totalRepayment)),
      ],
    };
  }

  if (slug === 'car-loan-calculator') {
    const v = carLoan(n(f, 'price'), n(f, 'down'), n(f, 'trade'), n(f, 'fees'), n(f, 'rate'), n(f, 'term'));
    return {
      results: [
        result('Monthly payment', money(v.monthlyPayment), true),
        result('Financed amount', money(v.financedAmount)),
        result('Total interest', money(v.totalInterest)),
        result('Total repayment', money(v.totalPayment)),
      ],
    };
  }

  const v = calories(
    n(f, 'age'),
    s(f, 'sex') as 'male' | 'female',
    n(f, 'weight'),
    n(f, 'height'),
    s(f, 'activity') as 'sedentary',
    s(f, 'unit') as 'metric' | 'imperial',
  );

  return {
    results: [
      result('Estimated maintenance calories', `${formatNumber(v.tdee, 0)} kcal/day`, true),
      result('Estimated BMR', `${formatNumber(v.bmr, 0)} kcal/day`),
    ],
  };
}

export function CalculatorTool({ slug }: { slug: string }) {
  const [output, setOutput] = useState<ReturnType<typeof calculate> | null>(null);
  const [error, setError] = useState('');
  const [key, setKey] = useState(0);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    try {
      setOutput(calculate(slug, new FormData(event.currentTarget)));
      track('tool_process_completed', {
        toolSlug: `calculator/${slug}`,
        category: 'calculator',
        status: 'success',
        processingLocation: 'browser',
      });
    } catch (e) {
      setOutput(null);
      setError(e instanceof CalculatorError ? e.message : 'Check the entered values and try again.');
      track('tool_error', { toolSlug: `calculator/${slug}`, category: 'calculator', status: 'validation' });
    }
  };

  return (
    <>
      <div className="tp-calculator" key={key}>
        <form className="tp-calculator-form" onSubmit={submit} noValidate>
          <div className="tp-calculator-fields">
            {fields[slug].map((field) => (
              <label key={field.name}>
                <span>{field.label}</span>
                {field.options ? (
                  <select name={field.name} defaultValue={field.value}>
                    {field.options.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    name={field.name}
                    type={field.type ?? 'text'}
                    defaultValue={field.value}
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    required
                  />
                )}
              </label>
            ))}
          </div>
          {error && (
            <p className="tp-calculator-error" role="alert">
              {error}
            </p>
          )}
          <div className="tp-calculator-actions">
            <button className="tp-primary" type="submit">
              <Calculator size={18} /> Calculate
            </button>
            <button
              type="button"
              onClick={() => {
                setKey((v) => v + 1);
                setOutput(null);
                setError('');
              }}
            >
              <RotateCcw size={18} /> Reset
            </button>
          </div>
        </form>
        <section className="tp-calculator-results" aria-live="polite" aria-label="Calculation results">
          {output ? (
            <>
              <div className="tp-result-grid">
                {output.results.map((item) => (
                  <article className={item.primary ? 'is-primary' : ''} key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </article>
                ))}
              </div>
              {output.rows && (
                <div className="tp-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Payment #</th>
                        <th>Payment</th>
                        <th>Principal</th>
                        <th>Interest</th>
                        <th>Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {output.rows
                        .filter((_, i) => i < 12 || (i + 1) % 12 === 0 || i === output.rows!.length - 1)
                        .map((row) => (
                          <tr key={row.paymentNumber}>
                            <td>{row.paymentNumber}</td>
                            <td>{money(row.payment)}</td>
                            <td>{money(row.principal)}</td>
                            <td>{money(row.interest)}</td>
                            <td>{money(row.balance)}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                  <p>First year shown monthly; later years are summarized at year-end.</p>
                </div>
              )}
            </>
          ) : (
            <div className="tp-calculator-empty">
              <Calculator size={30} />
              <h2>Your result will appear here</h2>
              <p>Enter your values and choose Calculate. Nothing is uploaded.</p>
            </div>
          )}
        </section>
      </div>
      <section className="tp-calculator-guide">
        <div>
          <h2>Method and formula</h2>
          <p>{guidance[slug].method}</p>
        </div>
        <div>
          <h2>Example and limitations</h2>
          <p>{guidance[slug].example}</p>
          {guidance[slug].disclaimer && <p className="tp-calculator-disclaimer">{guidance[slug].disclaimer}</p>}
        </div>
      </section>
    </>
  );
}
