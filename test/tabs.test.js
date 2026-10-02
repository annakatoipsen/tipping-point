// Page-level tests for the Goal planning and Required savings tabs.
// They load the real index.html into jsdom, type into the fields like a user would,
// and read the results shown on the page.
import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import CompoundInterestCalculator from '../calculator.js';
import { WebCalculatorApp } from '../web-calculator.js';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const GLOBALS = ['window', 'document', 'localStorage', 'getComputedStyle'];

let dom;
let document;

// The page reads these globals; point them at a fresh jsdom page for every test
function loadPage() {
  dom = new JSDOM(html, { url: 'http://localhost/' });
  const { window } = dom;
  window.matchMedia = () => ({ matches: false, addEventListener() {} });
  globalThis.window = window;
  globalThis.document = window.document;
  globalThis.localStorage = window.localStorage;
  globalThis.getComputedStyle = window.getComputedStyle.bind(window);
  document = window.document;
  new WebCalculatorApp();
}

function type(id, value) {
  const input = document.getElementById(id);
  input.value = String(value);
  input.dispatchEvent(new dom.window.Event('input'));
}

function chooseCurrency(code) {
  const select = document.getElementById('currency-select');
  select.value = code;
  select.dispatchEvent(new dom.window.Event('change'));
}

const field = id => Number(document.getElementById(id).value);
const timeToGoal = () => document.getElementById('time-to-goal').textContent;
const requiredMonthly = () => document.getElementById('required-monthly').textContent;

// Expected values come straight from the calculator, using whatever is in the fields right now
function expectedGoalText() {
  const { years } = CompoundInterestCalculator.calculateTimeToGoal({
    principal: field('principal'),
    monthlyContribution: field('monthly'),
    annualRate: field('rate'),
    targetAmount: field('target')
  });
  return `${years} years`;
}

function expectedRequiredText(currency = 'DKK') {
  const amount = CompoundInterestCalculator.calculateRequiredSavings({
    targetAmount: field('req-target'),
    years: field('req-years'),
    annualRate: field('rate'),
    principal: field('principal')
  });
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    currencyDisplay: currency === 'USD' ? 'narrowSymbol' : 'symbol',
    maximumFractionDigits: 0
  }).format(amount);
}

beforeEach(loadPage);
afterEach(() => {
  dom.window.close();
  GLOBALS.forEach(name => delete globalThis[name]);
});

describe('Goal planning tab', () => {
  test('shows the time to reach the default goal on load', () => {
    assert.equal(timeToGoal(), expectedGoalText());
    assert.equal(timeToGoal(), '37.3 years');
  });

  test('updates when the target amount changes', () => {
    type('target', 1000000);
    assert.equal(timeToGoal(), expectedGoalText());
    assert.notEqual(timeToGoal(), '37.3 years');
  });

  for (const [id, value] of [['principal', 500000], ['monthly', 10000], ['rate', 12]]) {
    test(`updates when the shared "${id}" field at the top changes`, () => {
      type('target', 1000000);
      const before = timeToGoal();
      type(id, value);
      assert.equal(timeToGoal(), expectedGoalText());
      assert.notEqual(timeToGoal(), before);
    });
  }

  test('updates even while another tab is open', () => {
    // The Overview tab is active by default; change a shared field there, then look at the Goal tab
    type('monthly', 10000);
    document.getElementById('tab-goal').click();
    assert.equal(timeToGoal(), expectedGoalText());
  });

  test('ignores the "Years" field, which only applies to the overview', () => {
    const before = timeToGoal();
    type('years', 5);
    assert.equal(timeToGoal(), before);
  });

  test('says "Already reached" when the starting amount meets the goal', () => {
    type('principal', 8000000);
    assert.equal(timeToGoal(), 'Already reached');
  });

  test('says the goal is not reachable when nothing is saved and no return is earned', () => {
    type('principal', 1000);
    type('monthly', 0);
    type('rate', 0);
    assert.equal(timeToGoal(), 'Not reachable within 100 years');
  });

  test('uses "year" for exactly one year', () => {
    type('principal', 0);
    type('monthly', 1000);
    type('rate', 0);
    type('target', 12000);
    assert.equal(timeToGoal(), '1 year');
  });
});

describe('Required savings tab', () => {
  test('shows the required monthly amount for the defaults on load', () => {
    assert.equal(requiredMonthly(), expectedRequiredText());
    assert.equal(requiredMonthly(), 'DKK 5,616');
  });

  test('updates when the target amount changes', () => {
    const before = requiredMonthly();
    type('req-target', 1000000);
    assert.equal(requiredMonthly(), expectedRequiredText());
    assert.notEqual(requiredMonthly(), before);
  });

  test('updates when the time frame changes', () => {
    const before = requiredMonthly();
    type('req-years', 10);
    assert.equal(requiredMonthly(), expectedRequiredText());
    assert.notEqual(requiredMonthly(), before);
  });

  for (const [id, value] of [['principal', 0], ['rate', 3]]) {
    test(`updates when the shared "${id}" field at the top changes`, () => {
      const before = requiredMonthly();
      type(id, value);
      assert.equal(requiredMonthly(), expectedRequiredText());
      assert.notEqual(requiredMonthly(), before);
    });
  }

  test('updates even while another tab is open', () => {
    type('rate', 3);
    document.getElementById('tab-required').click();
    assert.equal(requiredMonthly(), expectedRequiredText());
  });

  test('ignores the monthly contribution and "Years" fields', () => {
    const before = requiredMonthly();
    type('monthly', 9999);
    type('years', 5);
    assert.equal(requiredMonthly(), before);
  });

  test('says "Nothing extra needed" when the starting amount alone reaches the target', () => {
    type('principal', 2000000);
    assert.equal(requiredMonthly(), 'Nothing extra needed');
  });

  test('shows the amount in the chosen currency', () => {
    chooseCurrency('EUR');
    assert.equal(requiredMonthly(), expectedRequiredText('EUR'));
    assert.ok(requiredMonthly().startsWith('€'));
  });
});
