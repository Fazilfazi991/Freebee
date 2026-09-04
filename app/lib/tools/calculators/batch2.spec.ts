import { describe, expect, it } from 'vitest';
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
} from './batch2';

describe('Batch 2 finance calculators', () => {
  it('handles 0%, 100%, sale-price, and additional discounts', () => {
    expect(discount(100, 0).finalPrice).toBe(100);
    expect(discount(100, 100).finalPrice).toBe(0);
    expect(discount(100, undefined, 75).percentageSaved).toBe(25);
    expect(discount(100, 20, undefined, 10).finalPrice).toBe(72);
  });
  it('calculates margin and handles zero divisors', () => {
    expect(profitMargin(60, 100)).toEqual({ profit: 40, margin: 40, markup: (40 / 60) * 100 });
    expect(profitMargin(0, 0)).toEqual({ profit: 0, margin: null, markup: null });
  });
  it('calculates markup and equivalent margin', () =>
    expect(markup(100, 25)).toEqual({ amount: 25, sellingPrice: 125, margin: 20 }));
  it('supports zero-interest savings', () => expect(savings(1000, 100, 0, 1).finalBalance).toBe(2200));
  it('solves savings goals in both directions', () => {
    expect(savingsGoal(1200, 0, 0, 1).requiredMonthly).toBe(100);
    expect(savingsGoal(1200, 0, 0, undefined, 100).months).toBe(12);
  });
  it('projects retirement and validates ages', () => {
    expect(retirement(30, 31, 0, 100, 0).finalBalance).toBe(1200);
    expect(() => retirement(65, 60, 0, 100, 5)).toThrow();
  });
  it('handles debt payoff at zero interest, extra payments, and insufficient payments', () => {
    expect(debtPayoff(1200, 0, 100).months).toBe(12);
    expect(debtPayoff(1200, 0, 100, 100).months).toBe(6);
    expect(() => debtPayoff(1000, 24, 10)).toThrow(/too low/);
  });
  it('calculates metric and imperial fuel use', () => {
    expect(fuelCost(100, 8, 3, 'metric100').fuel).toBe(8);
    expect(fuelCost(100, 25, 4, 'imperial').cost).toBe(16);
  });
});

describe('Batch 2 fitness and pregnancy calculators', () => {
  it('converts distance and time into pace', () =>
    expect(pace(5, 1500)).toMatchObject({ paceSeconds: 300, speed: 12 }));
  it('matches a known U.S. Navy body-fat fixture', () =>
    expect(bodyFat('male', 70, 34, 15, 0, 'imperial')).toBeCloseTo(17.51, 1));
  it('returns four ideal-weight formula estimates', () => {
    const value = idealWeight('male', 177.8);
    expect(Object.keys(value.values)).toHaveLength(4);
    expect(value.values.Devine).toBeCloseTo(73, 1);
  });
  it('returns conservative water conversions', () => {
    const value = waterIntake(70, 30, 'metric');
    expect(value.liters).toBeCloseTo(2.66);
    expect(value.milliliters).toBeCloseTo(2660);
  });
  it('calculates known LMP and conception due dates', () => {
    expect(dueDate('2024-01-01', 'lmp').toISOString().slice(0, 10)).toBe('2024-10-07');
    expect(dueDate('2024-01-15', 'conception').toISOString().slice(0, 10)).toBe('2024-10-07');
  });
  it('calculates pregnancy weeks from LMP or due date', () => {
    expect(pregnancy('2024-01-01', 'lmp', '2024-03-11')).toMatchObject({
      weeks: 10,
      days: 0,
      trimester: 'First trimester',
    });
    expect(pregnancy('2024-10-07', 'due', '2024-03-11').weeks).toBe(10);
  });
});

describe('Batch 2 construction and math calculators', () => {
  it('converts square footage and supports repeated rooms', () => {
    expect(squareFootage(10, 10, 'feet', 2).squareFeet).toBe(200);
    expect(squareFootage(10, 10, 'meters').squareFeet).toBeCloseTo(1076.39104);
  });
  it('converts concrete slab volume with waste', () => {
    const value = concrete(3, 2, 10, 'metric', 10);
    expect(value.cubicMeters).toBeCloseTo(0.66);
    expect(value.cubicYards).toBeCloseTo(0.863, 2);
  });
  it('subtracts openings and applies paint coats', () =>
    expect(paint(20, 3, 4, 6, 2, 10, 'metric')).toMatchObject({ area: 50, paintRequired: 10 }));
  it('performs and simplifies all fraction operations', () => {
    expect(fraction(1, 2, 1, 3, 'add')).toMatchObject({ numerator: 5, denominator: 6 });
    expect(fraction(1, 2, 1, 3, 'subtract')).toMatchObject({ numerator: 1, denominator: 6 });
    expect(fraction(2, 3, 3, 4, 'multiply')).toMatchObject({ numerator: 1, denominator: 2 });
    expect(fraction(2, 3, 4, 5, 'divide')).toMatchObject({ numerator: 5, denominator: 6 });
    expect(() => fraction(1, 0, 1, 2, 'add')).toThrow();
  });
  it('calculates mean and median and rejects malformed values', () => {
    expect(average('1, 2\n3 4')).toMatchObject({ count: 4, sum: 10, mean: 2.5, median: 2.5, minimum: 1, maximum: 4 });
    expect(() => average('1, nope, 3')).toThrow();
  });
});
