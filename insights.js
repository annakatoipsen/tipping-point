// Pure helpers for the yearly breakdown, kept free of DOM code so they can be tested

// Adds the amount paid in during each year (excludes the starting amount)
export function addYearlyContributions(yearlyBreakdown, principal) {
  return yearlyBreakdown.map((year, i) => ({
    ...year,
    yearlyContribution: year.totalContributions - (i === 0 ? principal : yearlyBreakdown[i - 1].totalContributions)
  }));
}

// Describes when the interest earned in a year first exceeds what is paid in that year.
// Returns { text, year } where `year` is the crossover year, or null when there is none.
export function describeCrossover(yearlyBreakdown) {
  if (yearlyBreakdown.length === 0) return { text: '', year: null };

  const paysIn = yearlyBreakdown.some(year => year.yearlyContribution > 0);
  const earnsInterest = yearlyBreakdown.some(year => year.yearlyInterest > 0);

  if (!earnsInterest) {
    return {
      text: paysIn
        ? 'With this return no interest is earned, so all growth comes from what you pay in.'
        : 'With no contributions and no positive return, the balance does not grow.',
      year: null
    };
  }

  if (!paysIn) {
    return { text: 'You are not paying anything in, so all growth comes from interest.', year: null };
  }

  const crossover = yearlyBreakdown.find(year => year.yearlyInterest > year.yearlyContribution);
  if (!crossover) {
    return { text: 'Your contributions are larger than the interest earned in every year of this period.', year: null };
  }
  if (crossover.year === 1) {
    return { text: 'Interest earns more than you pay in from the very first year.', year: 1 };
  }
  return { text: `From year ${crossover.year}, the interest earned each year is larger than what you pay in.`, year: crossover.year };
}
