# Tipping Point – Compound Interest Calculator

**Use it online: https://annakatoipsen.github.io/tipping-point/**

See how your savings grow, and find your *tipping point*: the year the interest you earn becomes larger than what you pay in.

This repository contains the web app (`index.html`) and a command-line version.

## Command-line version

A powerful, interactive CLI tool for advanced compound interest calculations with smart features like goal planning, scenario comparison, and inflation analysis.

## Features

🧮 **Basic Compound Interest Calculation**
- Calculate compound interest with customizable parameters
- Multiple compounding frequencies (daily, monthly, quarterly, annually)
- Year-by-year breakdown visualization

🎯 **Goal-Based Planning**
- Calculate time needed to reach financial goals
- Determine if goals are realistic with current parameters

💵 **Required Savings Calculator**
- Calculate monthly savings needed for specific goals
- Factor in initial investment and time horizon

📈 **Scenario Comparison**
- Compare up to 5 different investment scenarios
- Side-by-side analysis with performance rankings

📉 **Inflation-Adjusted Analysis**
- Real vs nominal returns calculation
- Purchasing power analysis over time

## Installation

```bash
npm install
```

## Usage

Start the interactive calculator:

```bash
npm start
```

Or for development with auto-reload:

```bash
npm run dev
```

## Example Calculations

### Basic Compound Interest
- Initial Investment: $10,000
- Monthly Contribution: $500
- Annual Rate: 7%
- Time Period: 30 years
- Result: ~$1,348,000 final balance

### Goal Planning
- Target: $1,000,000
- Starting: $10,000
- Monthly: $1,000
- Rate: 8%
- Time: ~22.5 years

## Smart Features

- **Input Validation**: Prevents invalid entries and guides users
- **Colorized Output**: Easy-to-read results with visual formatting
- **Interactive Menus**: Intuitive navigation through different calculators
- **Detailed Breakdowns**: Year-by-year analysis when requested
- **Currency Formatting**: Professional financial display
- **Error Handling**: Graceful handling of edge cases

## Technical Details

- Built with Node.js ES modules
- Uses readline-sync for interactive input
- Chalk for colorized terminal output
- Table formatting for structured results
- Comprehensive mathematical calculations with proper rounding