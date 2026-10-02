class SmartCalculatorApp {
    constructor() {
        this.currentCalculator = 'basic';
        this.charts = {};
        this.scenarioCount = 1;
        this.init();
    }

    init() {
        this.bindEvents();
        this.initializeDefaults();
    }

    bindEvents() {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchCalculator(e.target.dataset.calculator);
            });
        });

        // Form submissions
        document.getElementById('basic-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.calculateBasic();
        });

        document.getElementById('goal-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.calculateGoal();
        });

        document.getElementById('required-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.calculateRequired();
        });

        document.getElementById('inflation-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.calculateInflation();
        });

        document.getElementById('compare-scenarios').addEventListener('click', () => {
            this.compareScenarios();
        });

        document.getElementById('add-scenario').addEventListener('click', () => {
            this.addScenario();
        });

        // Real-time updates for basic calculator
        document.querySelectorAll('#basic-form input, #basic-form select').forEach(input => {
            input.addEventListener('input', () => {
                if (this.isFormValid('basic-form')) {
                    this.calculateBasic();
                }
            });
        });
    }

    switchCalculator(type) {
        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-calculator="${type}"]`).classList.add('active');

        // Update sections
        document.querySelectorAll('.calculator-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(`${type}-calculator`).classList.add('active');

        this.currentCalculator = type;
    }

    isFormValid(formId) {
        const form = document.getElementById(formId);
        return form.checkValidity();
    }

    getFormData(formId) {
        const form = document.getElementById(formId);
        const formData = new FormData(form);
        const data = {};
        
        for (let input of form.querySelectorAll('input, select')) {
            if (input.type === 'number') {
                data[input.id.replace(formId.replace('-form', '') + '-', '')] = parseFloat(input.value) || 0;
            } else {
                data[input.id.replace(formId.replace('-form', '') + '-', '')] = input.value;
            }
        }
        
        return data;
    }

    calculateBasic() {
        const data = this.getFormData('basic-form');
        
        const result = CompoundInterestCalculator.calculate({
            principal: data.principal,
            monthlyContribution: data.monthly,
            annualRate: data.rate,
            years: data.years,
            compoundingFrequency: parseInt(data.compounding)
        });

        this.displayBasicResults(result);
        this.createGrowthChart(result.yearlyBreakdown, 'basic-chart');
    }

    calculateGoal() {
        const data = this.getFormData('goal-form');
        
        const timeResult = CompoundInterestCalculator.calculateTimeToGoal({
            principal: data.principal,
            monthlyContribution: data.monthly,
            annualRate: data.rate,
            targetAmount: data.target
        });

        this.displayGoalResults(timeResult, data);
    }

    calculateRequired() {
        const data = this.getFormData('required-form');
        
        const requiredMonthly = CompoundInterestCalculator.calculateRequiredSavings({
            targetAmount: data.target,
            years: data.years,
            annualRate: data.rate,
            principal: data.principal
        });

        this.displayRequiredResults(requiredMonthly, data);
    }

    calculateInflation() {
        const data = this.getFormData('inflation-form');
        
        const result = CompoundInterestCalculator.calculate({
            principal: data.principal,
            monthlyContribution: data.monthly,
            annualRate: data.rate,
            years: data.years
        });

        const inflationAdjustedBalance = CompoundInterestCalculator.adjustForInflation(
            result.finalBalance,
            data.inflation,
            data.years
        );

        this.displayInflationResults(result, inflationAdjustedBalance, data);
        this.createInflationChart(result, data.inflation, data.years);
    }

    compareScenarios() {
        const scenarios = this.getScenarioData();
        if (scenarios.length === 0) return;

        const results = CompoundInterestCalculator.compareScenarios(scenarios);
        this.displayScenarioResults(results);
        this.createScenarioChart(results);
    }

    getScenarioData() {
        const scenarios = [];
        document.querySelectorAll('.scenario-form').forEach(form => {
            const name = form.querySelector('.scenario-name').value || 'Unnamed';
            const principal = parseFloat(form.querySelector('.scenario-principal').value) || 0;
            const monthlyContribution = parseFloat(form.querySelector('.scenario-monthly').value) || 0;
            const annualRate = parseFloat(form.querySelector('.scenario-rate').value) || 0;
            const years = parseFloat(form.querySelector('.scenario-years').value) || 1;

            if (principal > 0 || monthlyContribution > 0) {
                scenarios.push({ name, principal, monthlyContribution, annualRate, years });
            }
        });
        return scenarios;
    }

    addScenario() {
        if (this.scenarioCount >= 5) return;

        this.scenarioCount++;
        const container = document.getElementById('scenarios-container');
        
        const scenarioDiv = document.createElement('div');
        scenarioDiv.className = 'scenario-form';
        scenarioDiv.dataset.scenario = this.scenarioCount - 1;
        
        scenarioDiv.innerHTML = `
            <h3>Scenario ${this.scenarioCount} <button type="button" class="remove-scenario" onclick="app.removeScenario(${this.scenarioCount - 1})">×</button></h3>
            <div class="scenario-inputs">
                <input type="text" placeholder="Scenario Name" class="scenario-name" value="Scenario ${this.scenarioCount}">
                <input type="number" placeholder="Initial ($)" class="scenario-principal" min="0" step="0.01" value="0">
                <input type="number" placeholder="Monthly ($)" class="scenario-monthly" min="0" step="0.01" value="0">
                <input type="number" placeholder="Rate (%)" class="scenario-rate" min="0" max="100" step="0.01" value="7">
                <input type="number" placeholder="Years" class="scenario-years" min="1" max="100" value="30">
            </div>
        `;
        
        container.appendChild(scenarioDiv);
    }

    removeScenario(index) {
        const scenario = document.querySelector(`[data-scenario="${index}"]`);
        if (scenario) {
            scenario.remove();
            this.scenarioCount--;
        }
    }

    displayBasicResults(result) {
        const resultsDiv = document.getElementById('basic-results');
        
        resultsDiv.innerHTML = `
            <h3>Investment Results</h3>
            <div class="result-item">
                <span class="result-label">Final Balance</span>
                <span class="result-value highlight">${this.formatCurrency(result.finalBalance)}</span>
            </div>
            <div class="result-item">
                <span class="result-label">Total Contributions</span>
                <span class="result-value">${this.formatCurrency(result.totalContributions)}</span>
            </div>
            <div class="result-item">
                <span class="result-label">Total Interest Earned</span>
                <span class="result-value">${this.formatCurrency(result.totalInterest)}</span>
            </div>
            <div class="result-item">
                <span class="result-label">Effective Annual Rate</span>
                <span class="result-value">${result.effectiveAnnualRate}%</span>
            </div>
            <div class="result-item">
                <span class="result-label">Interest vs Contributions</span>
                <span class="result-value">${((result.totalInterest / result.totalContributions) * 100).toFixed(1)}%</span>
            </div>
        `;

        // Add breakdown table
        if (result.yearlyBreakdown && result.yearlyBreakdown.length > 0) {
            const breakdownTable = this.createBreakdownTable(result.yearlyBreakdown);
            resultsDiv.appendChild(breakdownTable);
        }
    }

    displayGoalResults(timeResult, data) {
        const resultsDiv = document.getElementById('goal-results');
        
        const isRealistic = timeResult.months < 1200;
        const statusClass = isRealistic ? 'success' : 'error';
        const statusText = isRealistic ? 'Goal is achievable' : 'Goal may take very long or be unrealistic';

        resultsDiv.innerHTML = `
            <h3>Goal Analysis</h3>
            <div class="message ${statusClass}">${statusText}</div>
            <div class="result-item">
                <span class="result-label">Target Amount</span>
                <span class="result-value">${this.formatCurrency(data.target)}</span>
            </div>
            <div class="result-item">
                <span class="result-label">Time to Goal</span>
                <span class="result-value highlight">${timeResult.years} years</span>
            </div>
            <div class="result-item">
                <span class="result-label">Final Balance</span>
                <span class="result-value">${this.formatCurrency(timeResult.finalBalance)}</span>
            </div>
            <div class="result-item">
                <span class="result-label">Monthly Investment</span>
                <span class="result-value">${this.formatCurrency(data.monthly)}</span>
            </div>
            <div class="result-item">
                <span class="result-label">Total Contributions</span>
                <span class="result-value">${this.formatCurrency(data.principal + (data.monthly * timeResult.months))}</span>
            </div>
        `;
    }

    displayRequiredResults(requiredMonthly, data) {
        const resultsDiv = document.getElementById('required-results');
        const totalContributions = data.principal + (requiredMonthly * data.years * 12);
        
        resultsDiv.innerHTML = `
            <h3>Required Savings Plan</h3>
            <div class="result-item">
                <span class="result-label">Target Amount</span>
                <span class="result-value">${this.formatCurrency(data.target)}</span>
            </div>
            <div class="result-item">
                <span class="result-label">Required Monthly Savings</span>
                <span class="result-value highlight">${this.formatCurrency(requiredMonthly)}</span>
            </div>
            <div class="result-item">
                <span class="result-label">Time Horizon</span>
                <span class="result-value">${data.years} years</span>
            </div>
            <div class="result-item">
                <span class="result-label">Initial Investment</span>
                <span class="result-value">${this.formatCurrency(data.principal)}</span>
            </div>
            <div class="result-item">
                <span class="result-label">Total Contributions</span>
                <span class="result-value">${this.formatCurrency(totalContributions)}</span>
            </div>
            <div class="result-item">
                <span class="result-label">Expected Growth</span>
                <span class="result-value">${this.formatCurrency(data.target - totalContributions)}</span>
            </div>
        `;
    }

    displayInflationResults(result, inflationAdjustedBalance, data) {
        const resultsDiv = document.getElementById('inflation-results');
        const purchasingPowerLoss = result.finalBalance - inflationAdjustedBalance;
        const realReturnRate = ((inflationAdjustedBalance / result.totalContributions - 1) * 100).toFixed(2);
        
        resultsDiv.innerHTML = `
            <h3>Inflation Analysis</h3>
            <div class="result-item">
                <span class="result-label">Nominal Final Balance</span>
                <span class="result-value">${this.formatCurrency(result.finalBalance)}</span>
            </div>
            <div class="result-item">
                <span class="result-label">Real Value (Today's Power)</span>
                <span class="result-value highlight">${this.formatCurrency(inflationAdjustedBalance)}</span>
            </div>
            <div class="result-item">
                <span class="result-label">Purchasing Power Lost</span>
                <span class="result-value" style="color: #dc3545;">${this.formatCurrency(purchasingPowerLoss)}</span>
            </div>
            <div class="result-item">
                <span class="result-label">Nominal Return Rate</span>
                <span class="result-value">${result.effectiveAnnualRate}%</span>
            </div>
            <div class="result-item">
                <span class="result-label">Real Return Rate</span>
                <span class="result-value">${realReturnRate}%</span>
            </div>
            <div class="result-item">
                <span class="result-label">Inflation Rate Used</span>
                <span class="result-value">${data.inflation}%</span>
            </div>
        `;
    }

    displayScenarioResults(results) {
        const resultsDiv = document.getElementById('scenarios-results');
        
        const best = results.reduce((prev, current) => 
            (prev.finalBalance > current.finalBalance) ? prev : current
        );

        let html = `<h3>Scenario Comparison</h3>`;
        html += `<div class="message success">Best performing: <strong>${best.name}</strong> with ${this.formatCurrency(best.finalBalance)}</div>`;
        
        results.forEach((result, index) => {
            const isWinner = result.name === best.name;
            html += `
                <div class="scenario-result ${isWinner ? 'winner' : ''}">
                    <h4>${result.name}${isWinner ? ' (Best)' : ''}</h4>
                    <div class="result-item">
                        <span class="result-label">Final Balance</span>
                        <span class="result-value">${this.formatCurrency(result.finalBalance)}</span>
                    </div>
                    <div class="result-item">
                        <span class="result-label">Total Interest</span>
                        <span class="result-value">${this.formatCurrency(result.totalInterest)}</span>
                    </div>
                    <div class="result-item">
                        <span class="result-label">Effective Rate</span>
                        <span class="result-value">${result.effectiveAnnualRate}%</span>
                    </div>
                </div>
            `;
        });
        
        resultsDiv.innerHTML = html;
    }

    createBreakdownTable(yearlyBreakdown) {
        const table = document.createElement('table');
        table.className = 'breakdown-table';
        
        const header = `
            <thead>
                <tr>
                    <th>Year</th>
                    <th>Balance</th>
                    <th>Yearly Interest</th>
                    <th>Total Interest</th>
                </tr>
            </thead>
        `;
        
        let tbody = '<tbody>';
        yearlyBreakdown.forEach(year => {
            tbody += `
                <tr>
                    <td>${year.year}</td>
                    <td>${this.formatCurrency(year.balance)}</td>
                    <td>${this.formatCurrency(year.yearlyInterest)}</td>
                    <td>${this.formatCurrency(year.totalInterest)}</td>
                </tr>
            `;
        });
        tbody += '</tbody>';
        
        table.innerHTML = header + tbody;
        return table;
    }

    createGrowthChart(yearlyBreakdown, canvasId) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        
        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }
        
        const years = yearlyBreakdown.map(item => item.year);
        const balances = yearlyBreakdown.map(item => item.balance);
        const contributions = yearlyBreakdown.map(item => item.totalContributions);
        const interests = yearlyBreakdown.map(item => item.totalInterest);
        
        this.charts[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: years,
                datasets: [
                    {
                        label: 'Total Balance',
                        data: balances,
                        borderColor: '#667eea',
                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: 'Total Contributions',
                        data: contributions,
                        borderColor: '#28a745',
                        backgroundColor: 'rgba(40, 167, 69, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: 'Total Interest',
                        data: interests,
                        borderColor: '#ffc107',
                        backgroundColor: 'rgba(255, 193, 7, 0.1)',
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Investment Growth Over Time'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    }

    createInflationChart(result, inflationRate, years) {
        const ctx = document.getElementById('inflation-chart').getContext('2d');
        
        if (this.charts['inflation-chart']) {
            this.charts['inflation-chart'].destroy();
        }
        
        const yearData = [];
        for (let year = 1; year <= years; year++) {
            const yearlyData = result.yearlyBreakdown.find(item => item.year === year);
            if (yearlyData) {
                const realValue = CompoundInterestCalculator.adjustForInflation(
                    yearlyData.balance, inflationRate, year
                );
                yearData.push({
                    year,
                    nominal: yearlyData.balance,
                    real: realValue
                });
            }
        }
        
        this.charts['inflation-chart'] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: yearData.map(item => item.year),
                datasets: [
                    {
                        label: 'Nominal Value',
                        data: yearData.map(item => item.nominal),
                        borderColor: '#667eea',
                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: 'Real Value (Inflation Adjusted)',
                        data: yearData.map(item => item.real),
                        borderColor: '#dc3545',
                        backgroundColor: 'rgba(220, 53, 69, 0.1)',
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Nominal vs Real Value Over Time'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    }

    createScenarioChart(results) {
        const ctx = document.getElementById('scenarios-chart').getContext('2d');
        
        if (this.charts['scenarios-chart']) {
            this.charts['scenarios-chart'].destroy();
        }
        
        this.charts['scenarios-chart'] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: results.map(result => result.name),
                datasets: [
                    {
                        label: 'Final Balance',
                        data: results.map(result => result.finalBalance),
                        backgroundColor: [
                            '#667eea',
                            '#28a745',
                            '#ffc107',
                            '#dc3545',
                            '#6f42c1'
                        ].slice(0, results.length)
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Scenario Comparison - Final Balance'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }

    initializeDefaults() {
        // Calculate basic on load with default values
        setTimeout(() => {
            this.calculateBasic();
        }, 100);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.app = new SmartCalculatorApp();
});