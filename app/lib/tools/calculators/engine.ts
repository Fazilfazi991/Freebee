export class CalculatorError extends Error {}

const DAY = 86_400_000;
const finite = (value: number, label: string, min = 0) => {
  if (!Number.isFinite(value) || value < min) {
    throw new CalculatorError(`${label} must be ${min === 0 ? 'zero or greater' : `at least ${min}`}.`);
  }

  return value;
};
const positive = (value: number, label: string) => finite(value, label, Number.EPSILON);
const dateOnly = (value: string | Date) => {
  const d =
    typeof value === 'string'
      ? new Date(`${value}T00:00:00Z`)
      : new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));

  if (Number.isNaN(d.getTime())) {
    throw new CalculatorError('Enter a valid date.');
  }

  return d;
};
const daysInMonth = (year: number, month: number) => new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
const addCalendar = (date: Date, years: number, months: number) => {
  const targetMonth = date.getUTCMonth() + months + years * 12;
  const y = date.getUTCFullYear() + Math.floor(targetMonth / 12);
  const m = ((targetMonth % 12) + 12) % 12;

  return new Date(Date.UTC(y, m, Math.min(date.getUTCDate(), daysInMonth(y, m))));
};

export function ageBetween(birthInput: string | Date, targetInput: string | Date) {
  const birth = dateOnly(birthInput),
    target = dateOnly(targetInput);

  if (target < birth) {
    throw new CalculatorError('Target date cannot be before the date of birth.');
  }

  let years = target.getUTCFullYear() - birth.getUTCFullYear();
  let cursor = addCalendar(birth, years, 0);

  if (cursor > target) {
    years--;
    cursor = addCalendar(birth, years, 0);
  }

  let months = 0;

  while (addCalendar(cursor, 0, months + 1) <= target) {
    months++;
  }
  cursor = addCalendar(cursor, 0, months);

  const days = Math.round((target.getTime() - cursor.getTime()) / DAY);
  const totalDays = Math.round((target.getTime() - birth.getTime()) / DAY);
  let nextBirthday = new Date(
    Date.UTC(
      target.getUTCFullYear(),
      birth.getUTCMonth(),
      Math.min(birth.getUTCDate(), daysInMonth(target.getUTCFullYear(), birth.getUTCMonth())),
    ),
  );

  if (nextBirthday <= target) {
    nextBirthday = new Date(
      Date.UTC(
        target.getUTCFullYear() + 1,
        birth.getUTCMonth(),
        Math.min(birth.getUTCDate(), daysInMonth(target.getUTCFullYear() + 1, birth.getUTCMonth())),
      ),
    );
  }

  return {
    years,
    months,
    days,
    totalMonths: years * 12 + months,
    totalWeeks: Math.floor(totalDays / 7),
    totalDays,
    nextBirthday,
    daysUntilNextBirthday: Math.round((nextBirthday.getTime() - target.getTime()) / DAY),
  };
}

export function calculateDate(
  startInput: string | Date,
  mode: 'add' | 'subtract',
  values: { years?: number; months?: number; weeks?: number; days?: number },
) {
  const sign = mode === 'add' ? 1 : -1;
  const years = finite(values.years ?? 0, 'Years'),
    months = finite(values.months ?? 0, 'Months');
  const weeks = finite(values.weeks ?? 0, 'Weeks'),
    days = finite(values.days ?? 0, 'Days');
  const result = addCalendar(dateOnly(startInput), sign * years, sign * months);
  result.setUTCDate(result.getUTCDate() + sign * (weeks * 7 + days));

  return result;
}

export function dateDifference(aInput: string | Date, bInput: string | Date, inclusive = false) {
  let start = dateOnly(aInput),
    end = dateOnly(bInput);
  const reversed = start > end;

  if (reversed) {
    [start, end] = [end, start];
  }

  const age = ageBetween(start, end);
  const totalDays = Math.round((end.getTime() - start.getTime()) / DAY) + (inclusive ? 1 : 0);

  return { ...age, totalDays, totalWeeks: totalDays / 7, totalHours: totalDays * 24, reversed };
}

export const durationSeconds = (hours: number, minutes: number, seconds: number) =>
  finite(hours, 'Hours') * 3600 + finite(minutes, 'Minutes') * 60 + finite(seconds, 'Seconds');
export function timeCalculation(a: number, b: number, mode: 'add' | 'subtract' | 'difference') {
  const totalSeconds = mode === 'add' ? a + b : mode === 'subtract' ? a - b : Math.abs(a - b);

  if (totalSeconds < 0) {
    throw new CalculatorError('The subtracted duration is longer than the starting duration.');
  }

  return {
    totalSeconds,
    totalMinutes: totalSeconds / 60,
    totalHours: totalSeconds / 3600,
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

export function bmi(weight: number, height: number, unit: 'metric' | 'imperial') {
  positive(weight, 'Weight');
  positive(height, 'Height');

  const value = unit === 'metric' ? weight / (height / 100) ** 2 : (703 * weight) / height ** 2;
  const category =
    value < 18.5 ? 'Underweight' : value < 25 ? 'Healthy range' : value < 30 ? 'Overweight' : 'Obesity range';
  const base = unit === 'metric' ? (height / 100) ** 2 : height ** 2 / 703;

  return { value, category, healthyMinimumWeight: 18.5 * base, healthyMaximumWeight: 24.9 * base };
}

export function percentage(
  mode: 'of' | 'whatPercent' | 'change' | 'adjust',
  x: number,
  y: number,
  direction: 'increase' | 'decrease' = 'increase',
) {
  finite(Math.abs(x), 'First value');
  finite(Math.abs(y), 'Second value');

  if ((mode === 'whatPercent' && y === 0) || (mode === 'change' && x === 0)) {
    throw new CalculatorError('The comparison value cannot be zero.');
  }

  if (mode === 'of') {
    return (x / 100) * y;
  }

  if (mode === 'whatPercent') {
    return (x / y) * 100;
  }

  if (mode === 'change') {
    return ((y - x) / x) * 100;
  }

  return x * (1 + ((direction === 'increase' ? 1 : -1) * y) / 100);
}

export function simpleInterest(
  principal: number,
  annualRate: number,
  duration: number,
  unit: 'years' | 'months' = 'years',
) {
  finite(principal, 'Principal');
  finite(annualRate, 'Interest rate');
  positive(duration, 'Duration');

  const interest = ((principal * annualRate) / 100) * (unit === 'months' ? duration / 12 : duration);

  return { principal, interest, finalAmount: principal + interest };
}

export type ContributionFrequency = 'monthly' | 'annually';
export function compoundInterest(
  principal: number,
  annualRate: number,
  years: number,
  compoundsPerYear: number,
  contribution = 0,
  contributionFrequency: ContributionFrequency = 'monthly',
) {
  finite(principal, 'Principal');
  finite(annualRate, 'Interest rate');
  positive(years, 'Duration');
  positive(compoundsPerYear, 'Compound frequency');
  finite(contribution, 'Contribution');

  const periods = Math.round(years * compoundsPerYear),
    rate = annualRate / 100 / compoundsPerYear;
  let balance = principal,
    totalContributions = principal;
  const breakdown: { year: number; balance: number; contributions: number; interest: number }[] = [];

  for (let period = 1; period <= periods; period++) {
    balance *= 1 + rate;

    const monthsPerPeriod = 12 / compoundsPerYear;
    const added =
      contributionFrequency === 'monthly'
        ? contribution * monthsPerPeriod
        : period % compoundsPerYear === 0
          ? contribution
          : 0;
    balance += added;
    totalContributions += added;

    if (period % compoundsPerYear === 0 || period === periods) {
      breakdown.push({
        year: Math.ceil(period / compoundsPerYear),
        balance,
        contributions: totalContributions,
        interest: balance - totalContributions,
      });
    }
  }

  return { finalBalance: balance, totalContributions, totalInterest: balance - totalContributions, breakdown };
}

export function loanPayment(principal: number, annualRate: number, months: number, extraMonthly = 0) {
  finite(principal, 'Loan amount');
  finite(annualRate, 'Interest rate');
  positive(months, 'Term');
  finite(extraMonthly, 'Extra payment');

  const r = annualRate / 1200;
  const scheduledPayment = r === 0 ? principal / months : (principal * r * (1 + r) ** months) / ((1 + r) ** months - 1);
  const payment = scheduledPayment + extraMonthly;
  let balance = principal,
    totalInterest = 0;
  const schedule: { paymentNumber: number; payment: number; principal: number; interest: number; balance: number }[] =
    [];

  for (let n = 1; n <= months && balance > 0.005; n++) {
    const interest = balance * r;
    const actual = Math.min(payment, balance + interest);
    const principalPaid = actual - interest;
    balance = Math.max(0, balance - principalPaid);
    totalInterest += interest;
    schedule.push({ paymentNumber: n, payment: actual, principal: principalPaid, interest, balance });
  }

  return {
    monthlyPayment: payment,
    scheduledPayment,
    totalInterest,
    totalPayment: principal + totalInterest,
    schedule,
  };
}

export function mortgage(
  homePrice: number,
  downPayment: number,
  rate: number,
  months: number,
  propertyTax = 0,
  insurance = 0,
  hoa = 0,
) {
  finite(homePrice, 'Home price');
  finite(downPayment, 'Down payment');

  if (downPayment > homePrice) {
    throw new CalculatorError('Down payment cannot exceed the home price.');
  }

  const principal = homePrice - downPayment,
    loan = loanPayment(principal, rate, months);

  return {
    principal,
    principalAndInterest: loan.scheduledPayment,
    estimatedMonthlyTotal: loan.scheduledPayment + propertyTax / 12 + insurance / 12 + hoa,
    totalInterest: loan.totalInterest,
    totalRepayment: loan.totalPayment,
  };
}

export function carLoan(
  vehiclePrice: number,
  downPayment: number,
  tradeIn: number,
  fees: number,
  rate: number,
  months: number,
) {
  [vehiclePrice, downPayment, tradeIn, fees].forEach((v, i) =>
    finite(v, ['Vehicle price', 'Down payment', 'Trade-in', 'Fees'][i]),
  );

  const financedAmount = vehiclePrice - downPayment - tradeIn + fees;

  if (financedAmount <= 0) {
    throw new CalculatorError('Financed amount must be greater than zero.');
  }

  return { financedAmount, ...loanPayment(financedAmount, rate, months) };
}

const activityMultipliers = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, veryActive: 1.9 } as const;

export function calories(
  age: number,
  sex: 'male' | 'female',
  weight: number,
  height: number,
  activity: keyof typeof activityMultipliers,
  unit: 'metric' | 'imperial',
) {
  positive(age, 'Age');
  positive(weight, 'Weight');
  positive(height, 'Height');

  const kg = unit === 'metric' ? weight : weight * 0.45359237,
    cm = unit === 'metric' ? height : height * 2.54;
  const bmr = 10 * kg + 6.25 * cm - 5 * age + (sex === 'male' ? 5 : -161);

  return { bmr, tdee: bmr * activityMultipliers[activity] };
}

export const formatNumber = (value: number, digits = 2) =>
  new Intl.NumberFormat('en', { maximumFractionDigits: digits }).format(value);
export const formatCurrency = (value: number, currency = 'AED') =>
  new Intl.NumberFormat('en', { style: 'currency', currency, minimumFractionDigits: 2 }).format(value);
export const formatDate = (value: Date) =>
  new Intl.DateTimeFormat('en', { dateStyle: 'full', timeZone: 'UTC' }).format(value);
