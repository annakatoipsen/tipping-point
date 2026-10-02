import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import CompoundInterestCalculator from '../calculator.js';
import { addYearlyContributions, describeCrossover } from '../insights.js';

const breakdownFor = ({ principal, monthly, rate, years }) =>
  addYearlyContributions(
    CompoundInterestCalculator.calculate({ principal, monthlyContribution: monthly, annualRate: rate, years }).yearlyBreakdown,
    principal
  );

describe('addYearlyContributions', () => {
  test('excludes the starting amount and counts only what is paid in each year', () => {
    const breakdown = breakdownFor({ principal: 75000, monthly: 3000, rate: 7, years: 3 });
    assert.deepEqual(breakdown.map(year => year.yearlyContribution), [36000, 36000, 36000]);
  });

  test('keeps the original fields', () => {
    const breakdown = breakdownFor({ principal: 1000, monthly: 100, rate: 5, years: 2 });
    assert.equal(breakdown[1].year, 2);
    assert.equal(breakdown[1].totalContributions, 1000 + 2400);
    assert.ok('balance' in breakdown[1] && 'yearlyInterest' in breakdown[1]);
  });
});

describe('describeCrossover', () => {
  test('finds the first year interest exceeds contributions (default example: year 9)', () => {
    const breakdown = breakdownFor({ principal: 75000, monthly: 3000, rate: 7, years: 30 });
    // Cross-check against the table: year 8 interest is below 36,000 and year 9 above it
    assert.ok(breakdown[7].yearlyInterest < 36000);
    assert.ok(breakdown[8].yearlyInterest > 36000);

    const { text, year } = describeCrossover(breakdown);
    assert.equal(year, 9);
    assert.match(text, /tipping point is year 9/);
  });

  test('reports year 1 when a large starting amount out-earns contributions immediately', () => {
    const { text, year } = describeCrossover(breakdownFor({ principal: 1000000, monthly: 100, rate: 7, years: 5 }));
    assert.equal(year, 1);
    assert.match(text, /very first year/);
  });

  test('says contributions stay larger when interest never catches up', () => {
    const { text, year } = describeCrossover(breakdownFor({ principal: 0, monthly: 3000, rate: 2, years: 5 }));
    assert.equal(year, null);
    assert.match(text, /contributions are larger/);
  });

  test('does not claim contributions are larger when nothing is paid in', () => {
    const { text, year } = describeCrossover(breakdownFor({ principal: 75000, monthly: 0, rate: 7, years: 10 }));
    assert.equal(year, null);
    assert.match(text, /not paying anything in/);
    assert.doesNotMatch(text, /contributions are larger/);
  });

  test('handles a 0% return with contributions', () => {
    const { text, year } = describeCrossover(breakdownFor({ principal: 0, monthly: 1000, rate: 0, years: 5 }));
    assert.equal(year, null);
    assert.match(text, /no interest is earned/);
  });

  test('handles no contributions and a 0% return', () => {
    const { text, year } = describeCrossover(breakdownFor({ principal: 75000, monthly: 0, rate: 0, years: 5 }));
    assert.equal(year, null);
    assert.match(text, /does not grow/);
  });

  test('handles a negative return', () => {
    const { text, year } = describeCrossover(breakdownFor({ principal: 10000, monthly: 500, rate: -3, years: 5 }));
    assert.equal(year, null);
    assert.match(text, /no interest is earned/);
  });

  test('returns empty text for an empty breakdown', () => {
    assert.deepEqual(describeCrossover([]), { text: '', year: null });
  });
});
