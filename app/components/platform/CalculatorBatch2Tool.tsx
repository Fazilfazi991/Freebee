import { Calculator, RotateCcw } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { track } from '~/lib/analytics';
import { CalculatorError, formatCurrency, formatDate, formatNumber } from '~/lib/tools/calculators/engine';
import {
  average,
  bodyFat,
  concrete,
  debtPayoff,
  discount,
  dueDate,
  fraction,
  fuelCost,
  idealWeight,
  markup,
  pace,
  paint,
  pregnancy,
  profitMargin,
  retirement,
  savings,
  savingsGoal,
  squareFootage,
  waterIntake,
} from '~/lib/tools/calculators/batch2';

type Field = {
  name: string;
  label: string;
  type?: string;
  value?: string;
  min?: number;
  step?: string;
  options?: [string, string][];
  wide?: boolean;
};
type Result = { label: string; value: string; primary?: boolean };

const today = () => new Date().toISOString().slice(0, 10);
const n = (f: FormData, key: string) => Number(f.get(key) || 0);
const s = (f: FormData, key: string) => String(f.get(key) || '');
const cash = (v: number) => formatCurrency(v, 'AED');
const r = (label: string, value: string, primary = false): Result => ({ label, value, primary });
const number = (name: string, label: string, value = '0', min = 0): Field => ({
  name,
  label,
  type: 'number',
  value,
  min,
  step: 'any',
});
const select = (name: string, label: string, options: [string, string][]): Field => ({ name, label, options });
const sex = select('sex', 'Sex used by the equation', [
  ['male', 'Male'],
  ['female', 'Female'],
]);
const units = select('unit', 'Unit system', [
  ['metric', 'Metric'],
  ['imperial', 'Imperial'],
]);
const fields: Record<string, Field[]> = {
  'discount-calculator': [
    number('original', 'Original price (AED)', '1000'),
    select('mode', 'Known discount value', [
      ['percent', 'Discount percentage'],
      ['sale', 'Sale price'],
    ]),
    number('discount', 'Discount (%)', '20'),
    number('salePrice', 'Sale price (AED)', '0'),
    number('additional', 'Additional discount (%)', '0'),
  ],
  'profit-margin-calculator': [
    number('cost', 'Cost (AED)', '60'),
    number('revenue', 'Revenue / selling price (AED)', '100'),
  ],
  'markup-calculator': [number('cost', 'Cost (AED)', '100'), number('markup', 'Markup (%)', '25')],
  'savings-calculator': [
    number('current', 'Current savings (AED)', '10000'),
    number('monthly', 'Monthly contribution (AED)', '500'),
    number('rate', 'Annual interest rate (%)', '4'),
    number('years', 'Duration (years)', '10', 0.01),
  ],
  'savings-goal-calculator': [
    select('mode', 'Solve for', [
      ['monthly', 'Required monthly contribution'],
      ['time', 'Time to goal'],
    ]),
    number('target', 'Savings target (AED)', '100000', 1),
    number('current', 'Current savings (AED)', '10000'),
    number('rate', 'Annual interest rate (%)', '4'),
    number('years', 'Target duration (years)', '5', 0.01),
    number('monthly', 'Monthly contribution (AED)', '1000', 0.01),
  ],
  'retirement-calculator': [
    number('currentAge', 'Current age', '30', 1),
    number('retirementAge', 'Retirement age', '65', 1),
    number('current', 'Current savings (AED)', '50000'),
    number('monthly', 'Monthly contribution (AED)', '2000'),
    number('rate', 'Expected annual return (%)', '5'),
    number('target', 'Optional retirement target (AED)', '0'),
  ],
  'debt-payoff-calculator': [],
  'credit-card-payoff-calculator': [],
  'fuel-cost-calculator': [
    select('unit', 'Efficiency system', [
      ['metric100', 'Liters / 100 km'],
      ['metricPerLiter', 'Kilometers / liter'],
      ['imperial', 'Miles / gallon'],
    ]),
    number('distance', 'One-way distance', '250', 0.01),
    number('efficiency', 'Fuel efficiency', '8', 0.01),
    number('price', 'Fuel price per liter / gallon', '3', 0),
    select('roundTrip', 'Trip type', [
      ['no', 'One way'],
      ['yes', 'Round trip'],
    ]),
  ],
  'pace-calculator': [
    select('solve', 'Calculate', [
      ['pace', 'Pace'],
      ['time', 'Time'],
      ['distance', 'Distance'],
    ]),
    select('distanceUnit', 'Distance unit', [
      ['km', 'Kilometers'],
      ['miles', 'Miles'],
    ]),
    select('preset', 'Distance preset', [
      ['custom', 'Custom'],
      ['5', '5K'],
      ['10', '10K'],
      ['21.0975', 'Half marathon'],
      ['42.195', 'Marathon'],
    ]),
    number('distance', 'Distance', '5', 0.01),
    number('hours', 'Time: hours', '0'),
    number('minutes', 'Time: minutes', '25'),
    number('seconds', 'Time: seconds', '0'),
    number('paceMinutes', 'Pace (minutes per selected unit)', '5', 0.01),
  ],
  'body-fat-calculator': [
    units,
    sex,
    number('height', 'Height (cm or in)', '175', 1),
    number('waist', 'Waist circumference', '82', 1),
    number('neck', 'Neck circumference', '38', 1),
    number('hip', 'Hip circumference (female equation)', '95', 1),
  ],
  'ideal-weight-calculator': [units, sex, number('height', 'Height (cm or in)', '175', 1)],
  'water-intake-calculator': [
    units,
    number('weight', 'Weight (kg or lb)', '70', 1),
    number('activity', 'Activity duration (minutes)', '0'),
  ],
  'due-date-calculator': [
    select('mode', 'Estimate from', [
      ['lmp', 'Last menstrual period'],
      ['conception', 'Conception date'],
    ]),
    { name: 'date', label: 'Date', type: 'date', value: today() },
  ],
  'pregnancy-calculator': [
    select('mode', 'Known date', [
      ['lmp', 'Last menstrual period'],
      ['due', 'Estimated due date'],
    ]),
    { name: 'date', label: 'Known date', type: 'date', value: today() },
    { name: 'onDate', label: 'Calculate on', type: 'date', value: today() },
  ],
  'square-footage-calculator': [
    select('unit', 'Measurement unit', [
      ['feet', 'Feet'],
      ['meters', 'Meters'],
    ]),
    number('length', 'Length', '12', 0.01),
    number('width', 'Width', '10', 0.01),
    number('rooms', 'Identical rooms / areas', '1', 1),
  ],
  'concrete-calculator': [
    select('unit', 'Measurement system', [
      ['imperial', 'Feet + inches'],
      ['metric', 'Meters + centimeters'],
    ]),
    number('length', 'Length (ft or m)', '12', 0.01),
    number('width', 'Width (ft or m)', '10', 0.01),
    number('thickness', 'Thickness (in or cm)', '4', 0.01),
    select('waste', 'Waste allowance', [
      ['0', 'None'],
      ['5', '5%'],
      ['10', '10%'],
    ]),
  ],
  'paint-calculator': [
    select('unit', 'Measurement system', [
      ['metric', 'Meters / liters'],
      ['imperial', 'Feet / gallons'],
    ]),
    number('perimeter', 'Wall perimeter', '20', 0.01),
    number('height', 'Wall height', '2.5', 0.01),
    number('doorCount', 'Number of doors', '1'),
    number('doorWidth', 'Door width', '0.9'),
    number('doorHeight', 'Door height', '2.1'),
    number('windowCount', 'Number of windows', '2'),
    number('windowWidth', 'Window width', '1.2'),
    number('windowHeight', 'Window height', '1.2'),
    number('coats', 'Number of coats', '2', 1),
    number('coverage', 'Coverage per liter / gallon', '10', 0.01),
  ],
  'fraction-calculator': [
    number('aNum', 'Fraction A numerator', '1'),
    number('aDen', 'Fraction A denominator', '2'),
    select('operation', 'Operation', [
      ['add', 'Add'],
      ['subtract', 'Subtract'],
      ['multiply', 'Multiply'],
      ['divide', 'Divide'],
    ]),
    number('bNum', 'Fraction B numerator', '1'),
    number('bDen', 'Fraction B denominator', '3'),
  ],
  'average-calculator': [
    {
      name: 'values',
      label: 'Numbers separated by commas, spaces, or new lines',
      type: 'textarea',
      value: '10, 20, 30, 40',
      wide: true,
    },
  ],
};
const debtFields = [
  number('balance', 'Current balance (AED)', '10000', 0.01),
  number('rate', 'Annual rate / APR (%)', '18'),
  number('payment', 'Monthly payment (AED)', '500', 0.01),
  number('extra', 'Extra monthly payment (AED)', '0'),
];
fields['debt-payoff-calculator'] = debtFields;
fields['credit-card-payoff-calculator'] = debtFields;

const guidance: Record<string, string> = {
  'discount-calculator':
    'Applies the first discount or derives it from sale price, then applies any additional discount sequentially.',
  'profit-margin-calculator':
    'Profit is revenue minus cost. Margin divides profit by revenue; markup divides profit by cost.',
  'markup-calculator':
    'Selling price equals cost plus the markup amount. Equivalent margin is profit divided by selling price.',
  'savings-calculator': 'Uses monthly compounding and end-of-month contributions.',
  'savings-goal-calculator':
    'Solves the ordinary-annuity formula for a monthly deposit or simulates monthly growth until the goal.',
  'retirement-calculator':
    'Projects monthly contributions and compound growth until the selected retirement age. It excludes pensions and jurisdiction-specific rules.',
  'debt-payoff-calculator': 'Simulates monthly interest and payments until the balance reaches zero.',
  'credit-card-payoff-calculator': 'Uses the debt-payoff engine with APR converted to a monthly periodic rate.',
  'fuel-cost-calculator': 'Converts distance and efficiency into fuel required, trip cost, and cost per distance unit.',
  'pace-calculator': 'Pace equals elapsed time divided by distance; speed equals distance divided by elapsed hours.',
  'body-fat-calculator': 'Uses the U.S. Navy circumference method with sex-specific equations.',
  'ideal-weight-calculator': 'Shows Devine, Robinson, Miller, and Hamwi height-based reference formulas.',
  'water-intake-calculator': 'Uses a conservative 33 ml/kg baseline plus 350 ml per 30 minutes of activity.',
  'due-date-calculator': 'Adds 280 days to LMP or 266 days to conception date.',
  'pregnancy-calculator':
    'Derives LMP or due date using a 280-day pregnancy estimate, then counts completed weeks and days.',
  'square-footage-calculator':
    'Multiplies length × width × number of identical areas and converts between square feet and square meters.',
  'concrete-calculator':
    'Calculates rectangular slab volume and converts it to cubic feet, yards, and meters before adding waste.',
  'paint-calculator':
    'Subtracts entered door/window area from wall area, multiplies by coats, and divides by product coverage.',
  'fraction-calculator':
    'Uses common denominators or cross-products, then simplifies with the greatest common divisor.',
  'average-calculator': 'Parses numeric values and reports count, sum, arithmetic mean, median, minimum, and maximum.',
};

function calculate(slug: string, f: FormData): Result[] {
  if (slug === 'discount-calculator') {
    const v = discount(
      n(f, 'original'),
      s(f, 'mode') === 'percent' ? n(f, 'discount') : undefined,
      s(f, 'mode') === 'sale' ? n(f, 'salePrice') : undefined,
      n(f, 'additional'),
    );
    return [
      r('Final price', cash(v.finalPrice), true),
      r('Discount amount', cash(v.discountAmount)),
      r('Percentage saved', `${formatNumber(v.percentageSaved)}%`),
    ];
  }

  if (slug === 'profit-margin-calculator') {
    const v = profitMargin(n(f, 'cost'), n(f, 'revenue'));
    return [
      r('Profit', cash(v.profit), true),
      r('Profit margin', v.margin === null ? 'Undefined (zero revenue)' : `${formatNumber(v.margin)}%`),
      r('Markup', v.markup === null ? 'Undefined (zero cost)' : `${formatNumber(v.markup)}%`),
    ];
  }

  if (slug === 'markup-calculator') {
    const v = markup(n(f, 'cost'), n(f, 'markup'));
    return [
      r('Selling price', cash(v.sellingPrice), true),
      r('Markup amount', cash(v.amount)),
      r('Equivalent margin', `${formatNumber(v.margin)}%`),
    ];
  }

  if (slug === 'savings-calculator') {
    const v = savings(n(f, 'current'), n(f, 'monthly'), n(f, 'rate'), n(f, 'years'));
    return [
      r('Ending balance', cash(v.finalBalance), true),
      r('Total contributions', cash(v.totalContributions)),
      r('Interest earned', cash(v.totalInterest)),
    ];
  }

  if (slug === 'savings-goal-calculator') {
    const v = savingsGoal(
      n(f, 'target'),
      n(f, 'current'),
      n(f, 'rate'),
      s(f, 'mode') === 'monthly' ? n(f, 'years') : undefined,
      s(f, 'mode') === 'time' ? n(f, 'monthly') : undefined,
    );
    return [
      r(
        s(f, 'mode') === 'monthly' ? 'Required monthly contribution' : 'Estimated time to goal',
        s(f, 'mode') === 'monthly' ? cash(v.requiredMonthly) : `${v.months} months`,
        true,
      ),
      r('Assumed duration', `${v.months} months`),
    ];
  }

  if (slug === 'retirement-calculator') {
    const v = retirement(
      n(f, 'currentAge'),
      n(f, 'retirementAge'),
      n(f, 'current'),
      n(f, 'monthly'),
      n(f, 'rate'),
      n(f, 'target'),
    );
    return [
      r('Projected balance', cash(v.finalBalance), true),
      r('Years remaining', `${v.years}`),
      r('Total contributions', cash(v.totalContributions)),
      r('Projected growth', cash(v.totalInterest)),
      ...(v.gap === null ? [] : [r(v.gap > 0 ? 'Gap to target' : 'Above target', cash(Math.abs(v.gap)))]),
    ];
  }

  if (slug.includes('payoff-calculator')) {
    const v = debtPayoff(n(f, 'balance'), n(f, 'rate'), n(f, 'payment'), n(f, 'extra'));
    const payoff = new Date();
    payoff.setMonth(payoff.getMonth() + v.months);

    return [
      r('Estimated payoff time', `${v.months} months`, true),
      r('Estimated payoff date', formatDate(payoff)),
      r('Total interest', cash(v.totalInterest)),
      r('Total repayment', cash(v.totalPaid)),
      ...(n(f, 'extra') > 0 ? [r('Interest saved with extra payment', cash(v.interestSaved))] : []),
    ];
  }

  if (slug === 'fuel-cost-calculator') {
    const v = fuelCost(
      n(f, 'distance'),
      n(f, 'efficiency'),
      n(f, 'price'),
      s(f, 'unit') as 'metric100',
      s(f, 'roundTrip') === 'yes',
    );
    const volume = s(f, 'unit') === 'imperial' ? 'gal' : 'L',
      distance = s(f, 'unit') === 'imperial' ? 'mile' : 'km';

    return [
      r('Estimated trip cost', cash(v.cost), true),
      r('Fuel required', `${formatNumber(v.fuel)} ${volume}`),
      r(`Cost per ${distance}`, cash(v.costPerDistance)),
    ];
  }

  if (slug === 'pace-calculator') {
    let distanceKm =
      s(f, 'preset') === 'custom'
        ? n(f, 'distance') * (s(f, 'distanceUnit') === 'miles' ? 1.609344 : 1)
        : n(f, 'preset');
    let seconds = n(f, 'hours') * 3600 + n(f, 'minutes') * 60 + n(f, 'seconds');
    const paceSeconds = n(f, 'paceMinutes') * 60;
    const selectedDistance = s(f, 'distanceUnit') === 'miles' ? distanceKm / 1.609344 : distanceKm;

    if (s(f, 'solve') === 'time') {
      seconds = selectedDistance * paceSeconds;
    }

    if (s(f, 'solve') === 'distance') {
      distanceKm = (seconds / paceSeconds) * (s(f, 'distanceUnit') === 'miles' ? 1.609344 : 1);
    }

    const km = pace(distanceKm, seconds),
      miles = pace(distanceKm / 1.609344, seconds);
    const display = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`;

    return [
      r('Pace per kilometer', `${display(km.paceSeconds)} min/km`, true),
      r('Pace per mile', `${display(miles.paceSeconds)} min/mile`),
      r('Average speed', `${formatNumber(km.speed)} km/h`),
      r(
        'Distance',
        `${formatNumber(s(f, 'distanceUnit') === 'miles' ? distanceKm / 1.609344 : distanceKm)} ${s(f, 'distanceUnit')}`,
      ),
      r(
        'Elapsed time',
        `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m ${Math.round(seconds % 60)}s`,
      ),
    ];
  }

  if (slug === 'body-fat-calculator') {
    const v = bodyFat(
      s(f, 'sex') as 'male',
      n(f, 'height'),
      n(f, 'waist'),
      n(f, 'neck'),
      n(f, 'hip'),
      s(f, 'unit') as 'metric',
    );
    return [r('Estimated body fat', `${formatNumber(v, 1)}%`, true), r('Method', 'U.S. Navy circumference estimate')];
  }

  if (slug === 'ideal-weight-calculator') {
    const heightCm = s(f, 'unit') === 'metric' ? n(f, 'height') : n(f, 'height') * 2.54;
    const v = idealWeight(s(f, 'sex') as 'male', heightCm);

    return [
      r('Average reference estimate', `${formatNumber(v.average, 1)} kg`, true),
      r('Formula range', `${formatNumber(v.minimum, 1)}–${formatNumber(v.maximum, 1)} kg`),
      ...Object.entries(v.values).map(([name, value]) => r(name, `${formatNumber(value, 1)} kg`)),
    ];
  }

  if (slug === 'water-intake-calculator') {
    const v = waterIntake(n(f, 'weight'), n(f, 'activity'), s(f, 'unit') as 'metric');
    return [
      r('Estimated daily water', `${formatNumber(v.liters, 2)} L`, true),
      r('Milliliters', `${formatNumber(v.milliliters, 0)} ml`),
      r('US fluid ounces', `${formatNumber(v.ounces, 0)} oz`),
      r('Approximate cups', formatNumber(v.cups, 1)),
    ];
  }

  if (slug === 'due-date-calculator') {
    const due = dueDate(s(f, 'date'), s(f, 'mode') as 'lmp');
    return [
      r('Estimated due date', formatDate(due), true),
      r('Method', s(f, 'mode') === 'lmp' ? '280 days from LMP' : '266 days from conception'),
    ];
  }

  if (slug === 'pregnancy-calculator') {
    const v = pregnancy(s(f, 'date'), s(f, 'mode') as 'lmp', s(f, 'onDate'));
    return [
      r('Estimated gestational age', `${v.weeks} weeks, ${v.days} days`, true),
      r('Estimated due date', formatDate(v.due)),
      r('Approximate trimester', v.trimester),
    ];
  }

  if (slug === 'square-footage-calculator') {
    const v = squareFootage(n(f, 'length'), n(f, 'width'), s(f, 'unit') as 'feet', n(f, 'rooms'));
    return [
      r('Total area', `${formatNumber(v.squareFeet)} sq ft`, true),
      r('Square meters', `${formatNumber(v.squareMeters)} m²`),
    ];
  }

  if (slug === 'concrete-calculator') {
    const v = concrete(n(f, 'length'), n(f, 'width'), n(f, 'thickness'), s(f, 'unit') as 'imperial', n(f, 'waste'));
    return [
      r('Estimated concrete', `${formatNumber(v.cubicYards, 2)} yd³`, true),
      r('Cubic feet', `${formatNumber(v.cubicFeet, 2)} ft³`),
      r('Cubic meters', `${formatNumber(v.cubicMeters, 3)} m³`),
    ];
  }

  if (slug === 'paint-calculator') {
    const doorArea = n(f, 'doorCount') * n(f, 'doorWidth') * n(f, 'doorHeight');
    const windowArea = n(f, 'windowCount') * n(f, 'windowWidth') * n(f, 'windowHeight');
    const v = paint(
      n(f, 'perimeter'),
      n(f, 'height'),
      doorArea,
      windowArea,
      n(f, 'coats'),
      n(f, 'coverage'),
      s(f, 'unit') as 'metric',
    );

    return [
      r('Estimated paint required', `${formatNumber(v.paintRequired, 2)} ${v.unitLabel}`, true),
      r('Paintable area', `${formatNumber(v.area, 2)} ${s(f, 'unit') === 'metric' ? 'm²' : 'ft²'}`),
    ];
  }

  if (slug === 'fraction-calculator') {
    const v = fraction(n(f, 'aNum'), n(f, 'aDen'), n(f, 'bNum'), n(f, 'bDen'), s(f, 'operation') as 'add');
    const mixed =
      v.whole !== 0 && v.remainder ? `${v.whole} ${v.remainder}/${v.denominator}` : `${v.numerator}/${v.denominator}`;

    return [
      r('Simplified fraction', `${v.numerator}/${v.denominator}`, true),
      r('Mixed representation', mixed),
      r('Decimal value', formatNumber(v.decimal, 6)),
    ];
  }

  const v = average(s(f, 'values'));

  return [
    r('Mean', formatNumber(v.mean, 6), true),
    r('Median', formatNumber(v.median, 6)),
    r('Count', String(v.count)),
    r('Sum', formatNumber(v.sum, 6)),
    r('Minimum', formatNumber(v.minimum, 6)),
    r('Maximum', formatNumber(v.maximum, 6)),
  ];
}

const health = new Set([
  'body-fat-calculator',
  'ideal-weight-calculator',
  'water-intake-calculator',
  'due-date-calculator',
  'pregnancy-calculator',
]);
const construction = new Set(['square-footage-calculator', 'concrete-calculator', 'paint-calculator']);

export function CalculatorBatch2Tool({ slug }: { slug: string }) {
  const [output, setOutput] = useState<Result[] | null>(null),
    [error, setError] = useState(''),
    [key, setKey] = useState(0);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    try {
      setOutput(calculate(slug, new FormData(event.currentTarget)));
      track('tool_process_completed', { toolSlug: `calculator/${slug}`, category: 'calculator', status: 'success' });
    } catch (e) {
      setOutput(null);
      setError(e instanceof CalculatorError ? e.message : 'Check the entered values and try again.');
      track('tool_error', { toolSlug: `calculator/${slug}`, category: 'calculator', status: 'validation' });
    }
  };
  const disclaimer = health.has(slug)
    ? 'Educational estimate only—not a medical diagnosis or clinical recommendation. Pregnancy dates require clinical confirmation.'
    : construction.has(slug)
      ? 'Material estimates vary with site conditions, waste, surface preparation, and product specifications.'
      : ['pace-calculator', 'fraction-calculator', 'average-calculator'].includes(slug)
        ? ''
        : 'Results are estimates, not financial advice or a guarantee.';

  return (
    <>
      <div className="tp-calculator" key={key}>
        <form className="tp-calculator-form" onSubmit={submit} noValidate>
          <div className="tp-calculator-fields">
            {fields[slug].map((field) => (
              <label key={field.name} style={field.wide ? { gridColumn: '1 / -1' } : undefined}>
                <span>{field.label}</span>
                {field.options ? (
                  <select name={field.name}>
                    {field.options.map(([value, label]) => (
                      <option value={value} key={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea name={field.name} defaultValue={field.value} rows={5} required />
                ) : (
                  <input
                    name={field.name}
                    type={field.type}
                    defaultValue={field.value}
                    min={field.min}
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
            <div className="tp-result-grid">
              {output.map((item) => (
                <article className={item.primary ? 'is-primary' : ''} key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </article>
              ))}
            </div>
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
          <p>{guidance[slug]}</p>
        </div>
        <div>
          <h2>Limitations</h2>
          <p>Inputs stay in this browser session and are not included in analytics.</p>
          {disclaimer && <p className="tp-calculator-disclaimer">{disclaimer}</p>}
        </div>
      </section>
    </>
  );
}

export const batch2Slugs = new Set(Object.keys(fields));
