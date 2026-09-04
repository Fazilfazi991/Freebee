import { describe, expect, it } from 'vitest';
import {
  ageBetween,
  bmi,
  calculateDate,
  calories,
  carLoan,
  compoundInterest,
  dateDifference,
  durationSeconds,
  loanPayment,
  mortgage,
  percentage,
  simpleInterest,
  timeCalculation,
} from './engine';

describe('calendar calculators', () => {
  it('calculates exact age without a 365-day approximation', () =>
    expect(ageBetween('1990-06-15', '2026-09-04')).toMatchObject({ years: 36, months: 2, days: 20 }));
  it('handles leap birthdays and rejects future birth dates', () => {
    expect(ageBetween('2000-02-29', '2025-02-28').years).toBe(25);
    expect(() => ageBetween('2030-01-01', '2026-01-01')).toThrow();
  });
  it('uses real month boundaries for add and subtract', () => {
    expect(calculateDate('2024-01-31', 'add', { months: 1 }).toISOString().slice(0, 10)).toBe('2024-02-29');
    expect(calculateDate('2024-03-31', 'subtract', { months: 1 }).toISOString().slice(0, 10)).toBe('2024-02-29');
  });
  it('handles reversed and inclusive date differences', () =>
    expect(dateDifference('2024-03-01', '2024-02-28', true)).toMatchObject({ totalDays: 3, reversed: true }));
});

describe('math and health calculators', () => {
  it('normalizes durations beyond 24 hours', () =>
    expect(timeCalculation(durationSeconds(25, 30, 0), durationSeconds(1, 45, 0), 'add')).toMatchObject({
      hours: 27,
      minutes: 15,
    }));
  it('calculates metric and imperial BMI with boundaries', () => {
    expect(bmi(70, 175, 'metric').value).toBeCloseTo(22.86);
    expect(bmi(154.324, 68.8976, 'imperial').value).toBeCloseTo(22.86, 1);
    expect(bmi(24.9, 100, 'metric').category).toBe('Healthy range');
  });
  it('supports all percentage modes and zero guards', () => {
    expect(percentage('of', 20, 50)).toBe(10);
    expect(percentage('whatPercent', 20, 50)).toBe(40);
    expect(percentage('change', 80, 100)).toBe(25);
    expect(percentage('adjust', 100, 20, 'decrease')).toBe(80);
    expect(() => percentage('whatPercent', 1, 0)).toThrow();
  });
  it('uses Mifflin-St Jeor and activity multipliers', () =>
    expect(calories(30, 'male', 70, 175, 'moderate', 'metric')).toMatchObject({ bmr: 1648.75, tdee: 2555.5625 }));
});

describe('finance calculators', () => {
  it('calculates a known simple-interest example', () =>
    expect(simpleInterest(10000, 5, 5)).toEqual({ principal: 10000, interest: 2500, finalAmount: 12500 }));
  it('handles compound frequency and contributions', () => {
    expect(compoundInterest(1000, 10, 1, 1).finalBalance).toBeCloseTo(1100);
    expect(compoundInterest(1000, 0, 1, 12, 100).finalBalance).toBe(2200);
  });
  it('calculates standard and zero-interest loans', () => {
    expect(loanPayment(100000, 5, 360).scheduledPayment).toBeCloseTo(536.82, 1);
    expect(loanPayment(1200, 0, 12).scheduledPayment).toBe(100);
  });
  it('ends amortization at zero and reconciles totals', () => {
    const value = loanPayment(250000, 4, 360);
    expect(value.schedule.at(-1)?.balance).toBeCloseTo(0);
    expect(value.schedule.reduce((sum, row) => sum + row.principal, 0)).toBeCloseTo(250000, 4);
  });
  it('calculates mortgage principal and optional monthly costs', () => {
    const value = mortgage(500000, 100000, 0, 120, 1200, 600, 50);
    expect(value.principal).toBe(400000);
    expect(value.estimatedMonthlyTotal).toBeCloseTo(3533.33, 1);
  });
  it('accounts for car down payment, trade-in, and fees', () =>
    expect(carLoan(50000, 5000, 3000, 1000, 0, 60).financedAmount).toBe(43000));
});
