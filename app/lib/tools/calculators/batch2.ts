import { CalculatorError, calculateDate, compoundInterest } from './engine';

const positive = (value: number, label: string, allowZero = false) => {
  if (!Number.isFinite(value) || (allowZero ? value < 0 : value <= 0)) {
    throw new CalculatorError(`${label} must be ${allowZero ? 'zero or greater' : 'greater than zero'}.`);
  }

  return value;
};

export function discount(original: number, discountPercent?: number, salePrice?: number, additionalPercent = 0) {
  positive(original, 'Original price');
  positive(additionalPercent, 'Additional discount', true);

  if ((discountPercent ?? 0) > 100 || additionalPercent > 100) {
    throw new CalculatorError('Discount percentages cannot exceed 100%.');
  }

  const firstPrice =
    salePrice === undefined
      ? original * (1 - positive(discountPercent ?? 0, 'Discount', true) / 100)
      : positive(salePrice, 'Sale price', true);

  if (firstPrice > original) {
    throw new CalculatorError('Sale price cannot exceed the original price.');
  }

  const finalPrice = firstPrice * (1 - additionalPercent / 100);

  return {
    discountAmount: original - finalPrice,
    finalPrice,
    percentageSaved: ((original - finalPrice) / original) * 100,
  };
}

export function profitMargin(cost: number, revenue: number) {
  positive(cost, 'Cost', true);
  positive(revenue, 'Revenue', true);

  const profit = revenue - cost;

  return {
    profit,
    margin: revenue === 0 ? null : (profit / revenue) * 100,
    markup: cost === 0 ? null : (profit / cost) * 100,
  };
}

export function markup(cost: number, percent: number) {
  positive(cost, 'Cost');
  positive(percent, 'Markup', true);

  const amount = (cost * percent) / 100,
    sellingPrice = cost + amount;

  return { amount, sellingPrice, margin: (amount / sellingPrice) * 100 };
}

export const savings = (current: number, monthly: number, rate: number, years: number) =>
  compoundInterest(current, rate, years, 12, monthly, 'monthly');

export function savingsGoal(target: number, current: number, rate: number, years?: number, monthly?: number) {
  positive(target, 'Target');
  positive(current, 'Current savings', true);
  positive(rate, 'Interest rate', true);

  const r = rate / 1200;

  if (years !== undefined) {
    positive(years, 'Duration');

    const months = Math.ceil(years * 12);
    const grown = current * (1 + r) ** months;
    const required = r === 0 ? (target - current) / months : ((target - grown) * r) / ((1 + r) ** months - 1);

    return { requiredMonthly: Math.max(0, required), months };
  }

  positive(monthly ?? 0, 'Monthly contribution');

  let balance = current,
    count = 0;

  while (balance < target && count < 1200) {
    balance = balance * (1 + r) + (monthly ?? 0);
    count++;
  }

  if (balance < target) {
    throw new CalculatorError('The goal is not reached within 100 years using these assumptions.');
  }

  return { requiredMonthly: monthly ?? 0, months: count };
}

export function retirement(
  currentAge: number,
  retirementAge: number,
  current: number,
  monthly: number,
  rate: number,
  target = 0,
) {
  positive(currentAge, 'Current age');
  positive(retirementAge, 'Retirement age');

  if (retirementAge <= currentAge) {
    throw new CalculatorError('Retirement age must be greater than current age.');
  }

  const years = retirementAge - currentAge,
    growth = savings(current, monthly, rate, years);

  return { years, ...growth, gap: target > 0 ? target - growth.finalBalance : null };
}

export function debtPayoff(
  balance: number,
  annualRate: number,
  payment: number,
  extra = 0,
): { months: number; totalInterest: number; totalPaid: number; interestSaved: number } {
  positive(balance, 'Balance');
  positive(annualRate, 'Interest rate', true);
  positive(payment, 'Monthly payment');
  positive(extra, 'Extra payment', true);

  const r = annualRate / 1200;

  if (payment + extra <= balance * r) {
    throw new CalculatorError('Monthly payment is too low to reduce the balance.');
  }

  let remaining = balance,
    interest = 0,
    months = 0;

  while (remaining > 0.005 && months < 1200) {
    const charge = remaining * r;
    const paid = Math.min(payment + extra, remaining + charge);
    remaining -= paid - charge;
    interest += charge;
    months++;
  }

  const baseline: { totalInterest: number } | null = extra > 0 ? debtPayoff(balance, annualRate, payment, 0) : null;

  return {
    months,
    totalInterest: interest,
    totalPaid: balance + interest,
    interestSaved: baseline ? baseline.totalInterest - interest : 0,
  };
}

export function fuelCost(
  distance: number,
  efficiency: number,
  price: number,
  unit: 'metric100' | 'metricPerLiter' | 'imperial',
  roundTrip = false,
) {
  positive(distance, 'Distance');
  positive(efficiency, 'Efficiency');
  positive(price, 'Fuel price', true);

  const travelled = distance * (roundTrip ? 2 : 1);
  const fuel = unit === 'metric100' ? (travelled * efficiency) / 100 : travelled / efficiency;

  return { distance: travelled, fuel, cost: fuel * price, costPerDistance: (fuel * price) / travelled };
}

export function pace(distance: number, seconds: number) {
  positive(distance, 'Distance');
  positive(seconds, 'Time');

  return { paceSeconds: seconds / distance, speed: distance / (seconds / 3600) };
}

export function bodyFat(
  sex: 'male' | 'female',
  height: number,
  waist: number,
  neck: number,
  hip = 0,
  unit: 'metric' | 'imperial' = 'metric',
) {
  [height, waist, neck].forEach((v, i) => positive(v, ['Height', 'Waist', 'Neck'][i]));

  if (sex === 'female') {
    positive(hip, 'Hip');
  }

  const factor = unit === 'metric' ? 0.3937007874 : 1;
  const h = height * factor,
    w = waist * factor,
    n = neck * factor,
    p = hip * factor;
  const value =
    sex === 'male'
      ? 86.01 * Math.log10(w - n) - 70.041 * Math.log10(h) + 36.76
      : 163.205 * Math.log10(w + p - n) - 97.684 * Math.log10(h) - 78.387;

  if (!Number.isFinite(value)) {
    throw new CalculatorError('Measurements do not form a valid U.S. Navy estimate.');
  }

  return value;
}

export function idealWeight(sex: 'male' | 'female', heightCm: number) {
  positive(heightCm, 'Height');

  const inchesOverFiveFeet = Math.max(0, heightCm / 2.54 - 60);
  const values =
    sex === 'male'
      ? {
          Devine: 50 + 2.3 * inchesOverFiveFeet,
          Robinson: 52 + 1.9 * inchesOverFiveFeet,
          Miller: 56.2 + 1.41 * inchesOverFiveFeet,
          Hamwi: 48 + 2.7 * inchesOverFiveFeet,
        }
      : {
          Devine: 45.5 + 2.3 * inchesOverFiveFeet,
          Robinson: 49 + 1.7 * inchesOverFiveFeet,
          Miller: 53.1 + 1.36 * inchesOverFiveFeet,
          Hamwi: 45.5 + 2.2 * inchesOverFiveFeet,
        };
  const list = Object.values(values);

  return {
    values,
    average: list.reduce((a, b) => a + b, 0) / list.length,
    minimum: Math.min(...list),
    maximum: Math.max(...list),
  };
}

export function waterIntake(weight: number, activityMinutes: number, unit: 'metric' | 'imperial') {
  positive(weight, 'Weight');
  positive(activityMinutes, 'Activity duration', true);

  const kg = unit === 'metric' ? weight : weight * 0.45359237;
  const liters = kg * 0.033 + (activityMinutes / 30) * 0.35;

  return { liters, milliliters: liters * 1000, ounces: liters * 33.814, cups: liters * 4.22675 };
}

export function dueDate(date: string, mode: 'lmp' | 'conception') {
  return calculateDate(date, 'add', { days: mode === 'lmp' ? 280 : 266 });
}

export function pregnancy(lmpOrDue: string, mode: 'lmp' | 'due', onDate: string) {
  const lmp = mode === 'lmp' ? new Date(`${lmpOrDue}T00:00:00Z`) : calculateDate(lmpOrDue, 'subtract', { days: 280 });
  const due = mode === 'lmp' ? dueDate(lmpOrDue, 'lmp') : new Date(`${lmpOrDue}T00:00:00Z`);
  const current = new Date(`${onDate}T00:00:00Z`);

  if ([lmp, due, current].some((date) => Number.isNaN(date.getTime()))) {
    throw new CalculatorError('Enter valid pregnancy dates.');
  }

  const totalDays = Math.floor((current.getTime() - lmp.getTime()) / 86_400_000);

  if (totalDays < 0) {
    throw new CalculatorError('Calculation date cannot be before the estimated LMP.');
  }

  const weeks = Math.floor(totalDays / 7),
    days = totalDays % 7;
  const trimester = weeks < 14 ? 'First trimester' : weeks < 28 ? 'Second trimester' : 'Third trimester';

  return { due, weeks, days, trimester };
}

export function squareFootage(length: number, width: number, unit: 'feet' | 'meters', rooms = 1) {
  positive(length, 'Length');
  positive(width, 'Width');
  positive(rooms, 'Rooms');

  const area = length * width * rooms;

  return unit === 'feet'
    ? { squareFeet: area, squareMeters: area * 0.09290304 }
    : { squareFeet: area * 10.7639104, squareMeters: area };
}

export function concrete(
  length: number,
  width: number,
  thickness: number,
  unit: 'imperial' | 'metric',
  wastePercent = 0,
) {
  [length, width, thickness].forEach((v, i) => positive(v, ['Length', 'Width', 'Thickness'][i]));
  positive(wastePercent, 'Waste allowance', true);

  const cubicMeters =
    unit === 'imperial' ? length * 0.3048 * width * 0.3048 * thickness * 0.0254 : length * width * (thickness / 100);
  const adjusted = cubicMeters * (1 + wastePercent / 100);

  return { cubicMeters: adjusted, cubicFeet: adjusted * 35.3146667, cubicYards: adjusted * 1.30795062 };
}

export function paint(
  perimeter: number,
  height: number,
  doors: number,
  windows: number,
  coats: number,
  coverage: number,
  unit: 'metric' | 'imperial',
) {
  [perimeter, height, coats, coverage].forEach((v, i) => positive(v, ['Perimeter', 'Height', 'Coats', 'Coverage'][i]));
  positive(doors, 'Door area', true);
  positive(windows, 'Window area', true);

  const area = perimeter * height - doors - windows;

  if (area <= 0) {
    throw new CalculatorError('Openings cannot equal or exceed total wall area.');
  }

  return { area, paintRequired: (area * coats) / coverage, unitLabel: unit === 'metric' ? 'liters' : 'gallons' };
}

const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));

export function fraction(
  aNum: number,
  aDen: number,
  bNum: number,
  bDen: number,
  operation: 'add' | 'subtract' | 'multiply' | 'divide',
) {
  if (![aNum, aDen, bNum, bDen].every(Number.isInteger)) {
    throw new CalculatorError('Fractions require whole-number numerators and denominators.');
  }

  if (aDen === 0 || bDen === 0 || (operation === 'divide' && bNum === 0)) {
    throw new CalculatorError('A denominator and divisor cannot be zero.');
  }

  let numerator: number, denominator: number;

  if (operation === 'add') {
    numerator = aNum * bDen + bNum * aDen;
    denominator = aDen * bDen;
  } else if (operation === 'subtract') {
    numerator = aNum * bDen - bNum * aDen;
    denominator = aDen * bDen;
  } else if (operation === 'multiply') {
    numerator = aNum * bNum;
    denominator = aDen * bDen;
  } else {
    numerator = aNum * bDen;
    denominator = aDen * bNum;
  }

  const divisor = gcd(numerator, denominator);
  numerator /= divisor;
  denominator /= divisor;

  if (denominator < 0) {
    numerator *= -1;
    denominator *= -1;
  }

  return {
    numerator,
    denominator,
    decimal: numerator / denominator,
    whole: Math.trunc(numerator / denominator),
    remainder: Math.abs(numerator % denominator),
  };
}

export function average(input: string) {
  const tokens = input
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean);
  const values = tokens.map(Number);

  if (!values.length || values.some((v) => !Number.isFinite(v))) {
    throw new CalculatorError('Enter numbers separated by commas, spaces, or new lines.');
  }

  const sorted = [...values].sort((a, b) => a - b),
    sum = values.reduce((a, b) => a + b, 0),
    mid = Math.floor(sorted.length / 2);

  return {
    count: values.length,
    sum,
    mean: sum / values.length,
    median: sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2,
    minimum: sorted[0],
    maximum: sorted.at(-1)!,
  };
}
