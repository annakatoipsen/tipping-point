import CompoundInterestCalculator from './calculator.js';

class WebCalculatorApp {
    constructor() {
        this.chart = null;
        this.initializeEventListeners();
        this.calculate(); // Initial calculation
    }

    initializeEventListeners() {
        // Input change listeners for real-time calculation
        const inputs = ['principal', 'monthly', 'rate', 'years'];
        inputs.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('input', () => this.calculate());
                input.addEventListener('change', () => this.calculate());
            }
        });

        // Tab switching
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchTab(tab.dataset.tab);
            });
        });

        // Goal planning inputs
        const goalInputs = ['target'];
        goalInputs.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('input', () => this.calculateGoal());
                input.addEventListener('change', () => this.calculateGoal());
            }
        });

        // Required savings inputs
        const requiredInputs = ['req-target', 'req-years'];
        requiredInputs.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('input', () => this.calculateRequired());
                input.addEventListener('change', () => this.calculateRequired());
            }
        });
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-content`).classList.add('active');

        // Calculate for the active tab
        switch(tabName) {
            case 'basic':
                this.calculate();
                break;
            case 'goal':
                this.calculateGoal();
                break;
            case 'required':
                this.calculateRequired();
                break;
        }
    }

    getInputValues() {
        return {
            principal: parseFloat(document.getElementById('principal').value) || 0,
            monthly: parseFloat(document.getElementById('monthly').value) || 0,
            rate: parseFloat(document.getElementById('rate').value) || 0,
            years: parseInt(document.getElementById('years').value) || 1
        };
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('da-DK', {
            style: 'currency',
            currency: 'DKK',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }

    formatPercent(rate) {
        return `${rate.toFixed(1)}%`;
    }

    calculate() {
        const { principal, monthly, rate, years } = this.getInputValues();

        if (principal === 0 && monthly === 0) return;

        try {
            const result = CompoundInterestCalculator.calculate({
                principal,
                monthlyContribution: monthly,
                annualRate: rate,
                years
            });

            this.updateBasicResults(result);
            this.updateChart(result.yearlyBreakdown);
            this.updateBreakdownTable(result.yearlyBreakdown);
        } catch (error) {
            console.error('Calculation error:', error);
        }
    }

    calculateGoal() {
        const { principal, monthly, rate } = this.getInputValues();
        const target = parseFloat(document.getElementById('target').value) || 0;

        if (target === 0) return;

        try {
            const result = CompoundInterestCalculator.calculateTimeToGoal({
                principal,
                monthlyContribution: monthly,
                annualRate: rate,
                targetAmount: target
            });

            document.getElementById('time-to-goal').textContent = 
                result.months >= 1200 ? 'Mål ikke opnåeligt på 100 år' : `${result.years} år`;
        } catch (error) {
            console.error('Goal calculation error:', error);
        }
    }

    calculateRequired() {
        const { principal, rate } = this.getInputValues();
        const target = parseFloat(document.getElementById('req-target').value) || 0;
        const years = parseInt(document.getElementById('req-years').value) || 1;

        if (target === 0) return;

        try {
            const required = CompoundInterestCalculator.calculateRequiredSavings({
                targetAmount: target,
                years,
                annualRate: rate,
                principal
            });

            document.getElementById('required-monthly').textContent = this.formatCurrency(required);
        } catch (error) {
            console.error('Required savings calculation error:', error);
        }
    }

    updateBasicResults(result) {
        document.getElementById('final-balance').textContent = this.formatCurrency(result.finalBalance);
        document.getElementById('total-contributions').textContent = this.formatCurrency(result.totalContributions);
        document.getElementById('total-interest').textContent = this.formatCurrency(result.totalInterest);
        document.getElementById('effective-rate').textContent = this.formatPercent(result.effectiveAnnualRate);
    }

    updateChart(yearlyBreakdown) {
        const ctx = document.getElementById('growth-chart');
        if (!ctx) return;

        const labels = yearlyBreakdown.map(year => `År ${year.year}`);
        const balanceData = yearlyBreakdown.map(year => year.balance);
        const contributionData = yearlyBreakdown.map(year => year.totalContributions);

        if (this.chart) {
            this.chart.destroy();
        }

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Total Saldo',
                        data: balanceData,
                        borderColor: '#3498db',
                        backgroundColor: 'rgba(52, 152, 219, 0.1)',
                        fill: true,
                        tension: 0.4,
                        borderWidth: 3
                    },
                    {
                        label: 'Samlede Indbetalinger',
                        data: contributionData,
                        borderColor: '#95a5a6',
                        backgroundColor: 'transparent',
                        borderDash: [5, 5],
                        borderWidth: 2,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            font: {
                                family: 'Inter',
                                size: 14
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            font: {
                                family: 'Inter',
                                size: 12
                            },
                            color: '#7f8c8d'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: '#f1f3f4',
                            borderColor: '#e9ecef'
                        },
                        ticks: {
                            font: {
                                family: 'Inter',
                                size: 12
                            },
                            color: '#7f8c8d',
                            callback: function(value) {
                                return new Intl.NumberFormat('da-DK', {
                                    style: 'currency',
                                    currency: 'DKK',
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 0
                                }).format(value);
                            }
                        }
                    }
                },
                elements: {
                    point: {
                        radius: 4,
                        hoverRadius: 6
                    }
                }
            }
        });
    }

    updateBreakdownTable(yearlyBreakdown) {
        const tbody = document.querySelector('#breakdown-table tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        yearlyBreakdown.forEach(year => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>År ${year.year}</td>
                <td>${this.formatCurrency(year.balance)}</td>
                <td>${this.formatCurrency(year.yearlyInterest)}</td>
                <td>${this.formatCurrency(year.totalContributions)}</td>
            `;
            tbody.appendChild(row);
        });
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new WebCalculatorApp();
});