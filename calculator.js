class CompoundInterestCalculator {
  static calculate({
    principal,
    monthlyContribution = 0,
    annualRate,
    years,
    compoundingFrequency = 12
  }) {
    const totalMonths = years * 12;
    // Monthly growth factor equivalent to compounding `compoundingFrequency` times a year,
    // so quarterly, annual and daily compounding give the correct yearly result
    const monthlyGrowth = Math.pow(1 + annualRate / 100 / compoundingFrequency, compoundingFrequency / 12);
    
    let balance = principal;
    const yearlyBreakdown = [];
    
    for (let year = 1; year <= years; year++) {
      const yearStart = balance;
      
      for (let month = 1; month <= 12; month++) {
        balance += monthlyContribution;
        balance *= monthlyGrowth;
      }
      
      const yearEnd = balance;
      const yearlyInterest = yearEnd - yearStart - (monthlyContribution * 12);
      const totalContributions = principal + (monthlyContribution * 12 * year);
      
      yearlyBreakdown.push({
        year,
        balance: Math.round(yearEnd * 100) / 100,
        yearlyInterest: Math.round(yearlyInterest * 100) / 100,
        totalContributions: Math.round(totalContributions * 100) / 100,
        totalInterest: Math.round((yearEnd - totalContributions) * 100) / 100
      });
    }
    
    const finalBalance = balance;
    const totalContributions = principal + (monthlyContribution * totalMonths);
    const totalInterest = finalBalance - totalContributions;
    
    return {
      finalBalance: Math.round(finalBalance * 100) / 100,
      totalContributions: Math.round(totalContributions * 100) / 100,
      totalInterest: Math.round(totalInterest * 100) / 100,
      yearlyBreakdown,
      // Annual yield after compounding: (1 + r/n)^n - 1
      effectiveAnnualRate: Math.round(((1 + annualRate / 100 / compoundingFrequency) ** compoundingFrequency - 1) * 10000) / 100
    };
  }

  static calculateTimeToGoal({ principal, monthlyContribution = 0, annualRate, targetAmount }) {
    const monthlyRate = annualRate / 100 / 12;
    let balance = principal;
    let months = 0;
    
    while (balance < targetAmount && months < 1200) {
      balance += monthlyContribution;
      balance *= (1 + monthlyRate);
      months++;
    }
    
    return {
      months,
      years: Math.round(months / 12 * 10) / 10,
      finalBalance: Math.round(balance * 100) / 100
    };
  }

  static adjustForInflation(amount, inflationRate, years) {
    return Math.round(amount / Math.pow(1 + inflationRate / 100, years) * 100) / 100;
  }

  static compareScenarios(scenarios) {
    return scenarios.map((scenario, index) => ({
      name: scenario.name || `Scenario ${index + 1}`,
      ...this.calculate(scenario)
    }));
  }

  static calculateRequiredSavings({ targetAmount, years, annualRate, principal = 0 }) {
    const monthlyRate = annualRate / 100 / 12;
    const totalMonths = years * 12;
    
    if (monthlyRate === 0) {
      return Math.round((targetAmount - principal) / totalMonths * 100) / 100;
    }
    
    const futureValueOfPrincipal = principal * Math.pow(1 + monthlyRate, totalMonths);
    const remainingAmount = targetAmount - futureValueOfPrincipal;
    
    // Contributions are added at the start of each month (as in calculate()), so this is an annuity due
    const monthlyPayment = remainingAmount /
      (((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate) * (1 + monthlyRate));
    
    return Math.round(monthlyPayment * 100) / 100;
  }
}

export default CompoundInterestCalculator;