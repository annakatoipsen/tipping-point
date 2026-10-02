import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import CompoundInterestCalculator from '../calculator.js';

// Expected values below come from the closed-form compound interest formulas,
// not from running the code under test.

const close = (actual, expected, tolerance = 0.01, message) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, message ?? `expected ${actual} to be within ${tolerance} of ${expected}`);

describe('calculate', () => {
  test('grows a lump sum with monthly compounding', () => {
    const result = CompoundInterestCalculator.calculate({ principal: 10000, annualRate: 7, years: 1 });
    close(result.finalBalance, 10000 * (1 + 0.07 / 12) ** 12);
    assert.equal(result.totalContributions, 10000);
  });

  for (const [name, frequency] of [['annual', 1], ['quarterly', 4], ['monthly', 12], ['daily', 365]]) {
    test(`grows a lump sum correctly with ${name} compounding`, () => {
      const result = CompoundInterestCalculator.calculate({
        principal: 10000, annualRate: 7, years: 1, compoundingFrequency: frequency
      });
      close(result.finalBalance, 10000 * (1 + 0.07 / frequency) ** frequency);
    });

    test(`reports an effective rate that matches the balance growth with ${name} compounding`, () => {
      const result = CompoundInterestCalculator.calculate({
        principal: 10000, annualRate: 7, years: 5, compoundingFrequency: frequency
      });
      const expectedRate = ((1 + 0.07 / frequency) ** frequency - 1) * 100;
      close(result.effectiveAnnualRate, expectedRate);
      const realisedYearlyGrowth = ((result.finalBalance / 10000) ** (1 / 5) - 1) * 100;
      close(result.effectiveAnnualRate, realisedYearlyGrowth, 0.01);
    });
  }

  test('7% compounded monthly gives an effective annual rate of 7.23%', () => {
    const result = CompoundInterestCalculator.calculate({ principal: 1000, annualRate: 7, years: 1 });
    assert.equal(result.effectiveAnnualRate, 7.23);
  });

  test('adds monthly contributions at the start of each month', () => {
    const principal = 75000;
    const monthly = 3000;
    const months = 30 * 12;
    const g = 1 + 0.07 / 12;
    // Lump sum plus an annuity-due of monthly contributions
    const expected = principal * g ** months + monthly * g * (g ** months - 1) / (g - 1);

    const result = CompoundInterestCalculator.calculate({
      principal, monthlyContribution: monthly, annualRate: 7, years: 30
    });
    close(result.finalBalance, expected);
    assert.equal(result.totalContributions, principal + monthly * months);
    close(result.totalInterest, expected - (principal + monthly * months));
  });

  test('with a 0% return the balance equals what was paid in', () => {
    const result = CompoundInterestCalculator.calculate({
      principal: 5000, monthlyContribution: 100, annualRate: 0, years: 10
    });
    assert.equal(result.finalBalance, 5000 + 100 * 120);
    assert.equal(result.totalInterest, 0);
    assert.equal(result.effectiveAnnualRate, 0);
  });

  test('yearly breakdown is consistent with the totals', () => {
    const principal = 75000;
    const monthly = 3000;
    const result = CompoundInterestCalculator.calculate({
      principal, monthlyContribution: monthly, annualRate: 7, years: 30
    });
    const breakdown = result.yearlyBreakdown;

    assert.equal(breakdown.length, 30);
    assert.deepEqual(breakdown.map(year => year.year), Array.from({ length: 30 }, (_, i) => i + 1));
    breakdown.forEach(year => {
      assert.equal(year.totalContributions, principal + monthly * 12 * year.year);
    });
    close(breakdown.at(-1).balance, result.finalBalance);

    const summedInterest = breakdown.reduce((sum, year) => sum + year.yearlyInterest, 0);
    close(summedInterest, result.totalInterest, 0.5);
  });
});

describe('calculateTimeToGoal', () => {
  test('returns 0 months when the starting amount already reaches the goal', () => {
    const result = CompoundInterestCalculator.calculateTimeToGoal({
      principal: 10000, monthlyContribution: 100, annualRate: 5, targetAmount: 5000
    });
    assert.equal(result.months, 0);
  });

  test('counts months exactly with a 0% return', () => {
    const result = CompoundInterestCalculator.calculateTimeToGoal({
      principal: 0, monthlyContribution: 1000, annualRate: 0, targetAmount: 12000
    });
    assert.equal(result.months, 12);
    assert.equal(result.years, 1);
  });

  test('agrees with calculate(): the goal is reached in the month it reports, not before', () => {
    const params = { principal: 10000, monthlyContribution: 1000, annualRate: 8 };
    const target = 1000000;
    const { months } = CompoundInterestCalculator.calculateTimeToGoal({ ...params, targetAmount: target });

    const g = 1 + 0.08 / 12;
    const balanceAfter = n => params.principal * g ** n + params.monthlyContribution * g * (g ** n - 1) / (g - 1);
    assert.ok(balanceAfter(months) >= target);
    assert.ok(balanceAfter(months - 1) < target);
  });

  test('stops at 100 years when the goal is unreachable', () => {
    const result = CompoundInterestCalculator.calculateTimeToGoal({
      principal: 0, monthlyContribution: 0, annualRate: 5, targetAmount: 1000
    });
    assert.equal(result.months, 1200);
  });
});

describe('calculateRequiredSavings', () => {
  test('splits the gap evenly with a 0% return', () => {
    const monthly = CompoundInterestCalculator.calculateRequiredSavings({
      targetAmount: 22000, years: 10, annualRate: 0, principal: 10000
    });
    assert.equal(monthly, 100);
  });

  test('the required amount reaches the target exactly when fed back into calculate()', () => {
    const params = { targetAmount: 7500000, years: 30, annualRate: 7, principal: 75000 };
    const monthly = CompoundInterestCalculator.calculateRequiredSavings(params);

    const result = CompoundInterestCalculator.calculate({
      principal: params.principal,
      monthlyContribution: monthly,
      annualRate: params.annualRate,
      years: params.years
    });
    // Rounding the monthly amount to whole cents can move the result by a few kroner over 360 months
    close(result.finalBalance, params.targetAmount, 10);
  });

  test('returns a negative amount when the starting amount alone overshoots the target', () => {
    const monthly = CompoundInterestCalculator.calculateRequiredSavings({
      targetAmount: 1000, years: 10, annualRate: 7, principal: 100000
    });
    assert.ok(monthly < 0);
  });
});

describe('adjustForInflation', () => {
  test('discounts an amount by the inflation rate', () => {
    assert.equal(CompoundInterestCalculator.adjustForInflation(10000, 2, 1), Math.round(10000 / 1.02 * 100) / 100);
    close(CompoundInterestCalculator.adjustForInflation(10000, 2, 10), 10000 / 1.02 ** 10);
  });
});
