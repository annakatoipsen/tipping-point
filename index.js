#!/usr/bin/env node

import readlineSync from 'readline-sync';
import chalk from 'chalk';
import { table } from 'table';
import CompoundInterestCalculator from './calculator.js';
import { formatCurrency, formatPercent, getValidatedInput } from './utils.js';

class SmartCalculatorCLI {
  constructor() {
    this.scenarios = [];
  }

  showWelcome() {
    console.log(chalk.cyan('🧮 Smart Compound Interest Calculator'));
    console.log(chalk.gray('═══════════════════════════════════════'));
    console.log();
  }

  showMenu() {
    const options = [
      '1. Basic Compound Interest Calculation',
      '2. Goal-Based Planning',
      '3. Required Savings Calculator',
      '4. Compare Investment Scenarios',
      '5. Inflation-Adjusted Analysis',
      '6. Exit'
    ];

    console.log(chalk.yellow('📋 What would you like to do?'));
    options.forEach(option => console.log(chalk.white(`  ${option}`)));
    console.log();

    const choice = readlineSync.questionInt('Enter your choice (1-6): ');
    return choice;
  }

  basicCalculation() {
    console.log(chalk.blue('\n💰 Basic Compound Interest Calculation'));
    console.log(chalk.gray('─────────────────────────────────────'));

    const principal = getValidatedInput('Initial investment amount ($)', 'number', 0, null, readlineSync);
    const monthlyContribution = getValidatedInput('Monthly contribution ($)', 'number', 0, null, readlineSync);
    const annualRate = getValidatedInput('Annual interest rate (%)', 'number', 0, 100, readlineSync);
    const years = getValidatedInput('Investment period (years)', 'number', 1, 100, readlineSync);
    
    const compoundingOptions = ['Monthly (12)', 'Quarterly (4)', 'Annually (1)', 'Daily (365)'];
    const compoundingIndex = readlineSync.keyInSelect(compoundingOptions, 'Compounding frequency:');
    const compoundingFreqs = [12, 4, 1, 365];
    const compoundingFrequency = compoundingFreqs[compoundingIndex] || 12;

    const result = CompoundInterestCalculator.calculate({
      principal,
      monthlyContribution,
      annualRate,
      years,
      compoundingFrequency
    });

    this.displayBasicResults(result, { principal, monthlyContribution, annualRate, years });
  }

  goalBasedPlanning() {
    console.log(chalk.blue('\n🎯 Goal-Based Planning'));
    console.log(chalk.gray('─────────────────────'));

    const targetAmount = getValidatedInput('Target amount ($)', 'number', 1, null, readlineSync);
    const principal = getValidatedInput('Initial investment ($)', 'number', 0, null, readlineSync);
    const monthlyContribution = getValidatedInput('Monthly contribution ($)', 'number', 0, null, readlineSync);
    const annualRate = getValidatedInput('Expected annual return (%)', 'number', 0, 100, readlineSync);

    const timeResult = CompoundInterestCalculator.calculateTimeToGoal({
      principal,
      monthlyContribution,
      annualRate,
      targetAmount
    });

    console.log(chalk.green('\n📊 Goal Analysis Results:'));
    console.log(chalk.white(`Target Amount: ${formatCurrency(targetAmount)}`));
    console.log(chalk.white(`Time to Goal: ${timeResult.years} years (${timeResult.months} months)`));
    console.log(chalk.white(`Final Balance: ${formatCurrency(timeResult.finalBalance)}`));
    
    if (timeResult.months >= 1200) {
      console.log(chalk.red('⚠️  Goal may not be reachable within 100 years with current parameters'));
    }
  }

  requiredSavingsCalculator() {
    console.log(chalk.blue('\n💵 Required Savings Calculator'));
    console.log(chalk.gray('──────────────────────────────────'));

    const targetAmount = getValidatedInput('Target amount ($)', 'number', 1, null, readlineSync);
    const years = getValidatedInput('Time horizon (years)', 'number', 1, 100, readlineSync);
    const annualRate = getValidatedInput('Expected annual return (%)', 'number', 0, 100, readlineSync);
    const principal = getValidatedInput('Initial investment ($)', 'number', 0, null, readlineSync);

    const requiredMonthly = CompoundInterestCalculator.calculateRequiredSavings({
      targetAmount,
      years,
      annualRate,
      principal
    });

    console.log(chalk.green('\n📊 Required Savings Analysis:'));
    console.log(chalk.white(`Target Amount: ${formatCurrency(targetAmount)}`));
    console.log(chalk.white(`Time Horizon: ${years} years`));
    console.log(chalk.white(`Initial Investment: ${formatCurrency(principal)}`));
    console.log(chalk.white(`Required Monthly Savings: ${formatCurrency(requiredMonthly)}`));
    console.log(chalk.white(`Total Contributions: ${formatCurrency(principal + (requiredMonthly * years * 12))}`));
  }

  compareScenarios() {
    console.log(chalk.blue('\n📈 Compare Investment Scenarios'));
    console.log(chalk.gray('────────────────────────────────'));

    const scenarios = [];
    let addMore = true;

    while (addMore && scenarios.length < 5) {
      console.log(chalk.yellow(`\nScenario ${scenarios.length + 1}:`));
      
      const name = readlineSync.question('Scenario name: ') || `Scenario ${scenarios.length + 1}`;
      const principal = getValidatedInput('Initial investment ($)', 'number', 0, null, readlineSync);
      const monthlyContribution = getValidatedInput('Monthly contribution ($)', 'number', 0, null, readlineSync);
      const annualRate = getValidatedInput('Annual interest rate (%)', 'number', 0, 100, readlineSync);
      const years = getValidatedInput('Investment period (years)', 'number', 1, 100, readlineSync);

      scenarios.push({ name, principal, monthlyContribution, annualRate, years });
      
      if (scenarios.length < 5) {
        addMore = readlineSync.keyInYNStrict('Add another scenario?');
      }
    }

    const results = CompoundInterestCalculator.compareScenarios(scenarios);
    this.displayScenarioComparison(results);
  }

  inflationAnalysis() {
    console.log(chalk.blue('\n📉 Inflation-Adjusted Analysis'));
    console.log(chalk.gray('────────────────────────────────'));

    const principal = getValidatedInput('Initial investment ($)', 'number', 0, null, readlineSync);
    const monthlyContribution = getValidatedInput('Monthly contribution ($)', 'number', 0, null, readlineSync);
    const annualRate = getValidatedInput('Annual interest rate (%)', 'number', 0, 100, readlineSync);
    const years = getValidatedInput('Investment period (years)', 'number', 1, 100, readlineSync);
    const inflationRate = getValidatedInput('Expected inflation rate (%)', 'number', 0, 20, readlineSync);

    const result = CompoundInterestCalculator.calculate({
      principal,
      monthlyContribution,
      annualRate,
      years
    });

    const inflationAdjustedBalance = CompoundInterestCalculator.adjustForInflation(
      result.finalBalance, 
      inflationRate, 
      years
    );

    console.log(chalk.green('\n📊 Inflation-Adjusted Results:'));
    console.log(chalk.white(`Nominal Final Balance: ${formatCurrency(result.finalBalance)}`));
    console.log(chalk.white(`Real Value (Today's Purchasing Power): ${formatCurrency(inflationAdjustedBalance)}`));
    console.log(chalk.white(`Purchasing Power Lost to Inflation: ${formatCurrency(result.finalBalance - inflationAdjustedBalance)}`));
    console.log(chalk.white(`Real Return Rate: ${formatPercent((inflationAdjustedBalance / result.totalContributions - 1) * 100)}`));
  }

  displayBasicResults(result, params) {
    console.log(chalk.green('\n📊 Calculation Results:'));
    console.log(chalk.gray('═══════════════════'));
    
    const summaryData = [
      ['Final Balance', formatCurrency(result.finalBalance)],
      ['Total Contributions', formatCurrency(result.totalContributions)],
      ['Total Interest Earned', formatCurrency(result.totalInterest)],
      ['Effective Annual Return', formatPercent(result.effectiveAnnualRate)]
    ];

    console.log(table(summaryData, {
      columnDefault: { width: 25 },
      header: { alignment: 'center', content: 'Investment Summary' }
    }));

    if (readlineSync.keyInYNStrict('\nShow year-by-year breakdown?')) {
      this.displayYearlyBreakdown(result.yearlyBreakdown);
    }
  }

  displayYearlyBreakdown(breakdown) {
    const data = [['Year', 'Balance', 'Yearly Interest', 'Total Interest']];
    
    breakdown.forEach(year => {
      data.push([
        year.year.toString(),
        formatCurrency(year.balance),
        formatCurrency(year.yearlyInterest),
        formatCurrency(year.totalInterest)
      ]);
    });

    console.log(table(data, {
      header: { alignment: 'center', content: 'Year-by-Year Breakdown' }
    }));
  }

  displayScenarioComparison(results) {
    console.log(chalk.green('\n📊 Scenario Comparison:'));
    
    const data = [['Scenario', 'Final Balance', 'Total Interest', 'Effective Rate']];
    
    results.forEach(result => {
      data.push([
        result.name,
        formatCurrency(result.finalBalance),
        formatCurrency(result.totalInterest),
        formatPercent(result.effectiveAnnualRate)
      ]);
    });

    console.log(table(data, {
      header: { alignment: 'center', content: 'Scenario Comparison Results' }
    }));

    const best = results.reduce((prev, current) => 
      (prev.finalBalance > current.finalBalance) ? prev : current
    );
    
    console.log(chalk.green(`\n🏆 Best performing scenario: ${best.name} with ${formatCurrency(best.finalBalance)}`));
  }

  run() {
    this.showWelcome();
    
    while (true) {
      try {
        const choice = this.showMenu();
        
        switch (choice) {
          case 1:
            this.basicCalculation();
            break;
          case 2:
            this.goalBasedPlanning();
            break;
          case 3:
            this.requiredSavingsCalculator();
            break;
          case 4:
            this.compareScenarios();
            break;
          case 5:
            this.inflationAnalysis();
            break;
          case 6:
            console.log(chalk.cyan('\n👋 Thank you for using the Smart Compound Interest Calculator!'));
            process.exit(0);
          default:
            console.log(chalk.red('❌ Invalid choice. Please select 1-6.'));
        }
        
        console.log();
        readlineSync.question(chalk.gray('Press Enter to continue...'));
        console.clear();
        
      } catch (error) {
        console.log(chalk.red(`❌ Error: ${error.message}`));
        readlineSync.question(chalk.gray('Press Enter to continue...'));
      }
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const cli = new SmartCalculatorCLI();
  cli.run();
}