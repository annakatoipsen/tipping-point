import CompoundInterestCalculator from './calculator.js';

class WebCalculatorApp {
    constructor() {
        this.chart = null;
        this.yearlyChart = null;
        this.lastBreakdown = null;
        this.currency = this.loadCurrency();
        document.getElementById('currency-select').value = this.currency;
        this.applyCurrencyLabels();
        this.initializeEventListeners();
        this.calculate(); // Initial calculation

        // Redraw the chart with the new palette when the device theme changes
        this.updateThemeSwitch();
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => this.redrawCharts());
    }

    getThemeChoice() {
        const theme = document.documentElement.dataset.theme;
        return theme === 'light' || theme === 'dark' ? theme : 'auto';
    }

    setTheme(choice) {
        if (choice === 'auto') {
            delete document.documentElement.dataset.theme;
        } else {
            document.documentElement.dataset.theme = choice;
        }
        try {
            if (choice === 'auto') localStorage.removeItem('theme');
            else localStorage.setItem('theme', choice);
        } catch (error) {
            // Not critical if the choice can't be remembered
        }
        this.updateThemeSwitch();
        this.redrawCharts();
    }

    updateThemeSwitch() {
        const choice = this.getThemeChoice();
        document.querySelectorAll('[data-theme-choice]').forEach(button => {
            button.setAttribute('aria-checked', String(button.dataset.themeChoice === choice));
        });
    }

    redrawCharts() {
        if (!this.lastBreakdown) return;
        this.updateChart(this.lastBreakdown);
        this.updateYearlyChart(this.lastBreakdown);
    }

    loadCurrency() {
        try {
            const saved = localStorage.getItem('currency');
            if (saved && document.querySelector(`#currency-select option[value="${saved}"]`)) return saved;
        } catch (error) {
            // Storage unavailable (e.g. private mode) – fall back to the default
        }
        return 'DKK';
    }

    setCurrency(currency) {
        this.currency = currency;
        try {
            localStorage.setItem('currency', currency);
        } catch (error) {
            // Not critical if the choice can't be remembered
        }
        this.applyCurrencyLabels();
        this.calculate();
        this.calculateGoal();
        this.calculateRequired();
    }

    getCurrencyFormat(options = {}) {
        return new Intl.NumberFormat('en-GB', {
            style: 'currency',
            currency: this.currency,
            // "$" instead of "US$"; other currencies keep their standard en-GB symbol or code
            currencyDisplay: this.currency === 'USD' ? 'narrowSymbol' : 'symbol',
            ...options
        });
    }

    applyCurrencyLabels() {
        const symbol = this.getCurrencyFormat().formatToParts(0).find(part => part.type === 'currency').value;
        document.querySelectorAll('.input-wrapper .currency').forEach(label => {
            label.textContent = symbol;
            const input = label.parentElement.querySelector('input');
            // Fit the input padding to the symbol width ("€" vs "DKK")
            if (input && label.offsetWidth) input.style.paddingLeft = `${label.offsetWidth + 24}px`;
        });
    }

    initializeEventListeners() {
        document.querySelectorAll('[data-theme-choice]').forEach(button => {
            button.addEventListener('click', () => this.setTheme(button.dataset.themeChoice));
        });

        document.getElementById('currency-select').addEventListener('change', (e) => {
            this.setCurrency(e.target.value);
        });

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
        this.applyCurrencyLabels();

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
        return this.getCurrencyFormat({
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }

    formatPercent(rate) {
        return new Intl.NumberFormat('en-GB', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(rate) + '%';
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
            const breakdown = this.addYearlyContributions(result.yearlyBreakdown, principal);
            this.updateChart(breakdown);
            this.updateYearlyChart(breakdown);
            this.updateBreakdownTable(breakdown);
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
                result.months >= 1200 ? 'Not reachable within 100 years' : `${result.years} years`;
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

    getThemeColors() {
        const styles = getComputedStyle(document.documentElement);
        const token = name => styles.getPropertyValue(name).trim();
        return {
            series1: token('--series-1'),
            series1Fill: token('--series-1-fill'),
            series2: token('--series-2'),
            surface: token('--bg-card'),
            grid: token('--grid-color'),
            textPrimary: token('--text-primary'),
            textSecondary: token('--text-secondary'),
            textMuted: token('--text-muted'),
            border: token('--border-color')
        };
    }

    updateChart(yearlyBreakdown) {
        const ctx = document.getElementById('growth-chart');
        if (!ctx) return;

        this.lastBreakdown = yearlyBreakdown;
        const colors = this.getThemeColors();
        const formatCurrency = amount => this.formatCurrency(amount);
        const axisFormat = this.getCurrencyFormat({
            notation: 'compact',
            maximumFractionDigits: 1
        });
        const formatAxis = value => axisFormat.format(value);

        const labels = yearlyBreakdown.map(year => year.year);
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
                        label: 'Total balance',
                        data: balanceData,
                        borderColor: colors.series1,
                        backgroundColor: colors.series1Fill,
                        pointBackgroundColor: colors.series1,
                        pointBorderColor: colors.surface,
                        fill: true,
                        tension: 0.3,
                        borderWidth: 2
                    },
                    {
                        label: 'Total contributions',
                        data: contributionData,
                        borderColor: colors.series2,
                        backgroundColor: colors.series2,
                        pointBackgroundColor: colors.series2,
                        pointBorderColor: colors.surface,
                        borderDash: [6, 4],
                        borderWidth: 2,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        align: 'start',
                        labels: {
                            usePointStyle: true,
                            pointStyle: 'circle',
                            boxWidth: 8,
                            boxHeight: 8,
                            padding: 16,
                            color: colors.textSecondary,
                            font: {
                                family: 'Inter',
                                size: 13
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: colors.surface,
                        titleColor: colors.textPrimary,
                        bodyColor: colors.textSecondary,
                        borderColor: colors.border,
                        borderWidth: 1,
                        padding: 12,
                        cornerRadius: 10,
                        usePointStyle: true,
                        boxPadding: 6,
                        titleFont: { family: 'Inter', size: 13, weight: '600' },
                        bodyFont: { family: 'Inter', size: 13 },
                        callbacks: {
                            title: items => `Year ${items[0].label}`,
                            label: context => ` ${context.dataset.label}: ${formatCurrency(context.parsed.y)}`
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Year',
                            color: colors.textMuted,
                            font: {
                                family: 'Inter',
                                size: 12
                            }
                        },
                        grid: {
                            display: false
                        },
                        border: {
                            color: colors.border
                        },
                        ticks: {
                            font: {
                                family: 'Inter',
                                size: 12
                            },
                            color: colors.textMuted,
                            maxRotation: 0,
                            autoSkipPadding: 16
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: colors.grid
                        },
                        border: {
                            display: false
                        },
                        ticks: {
                            font: {
                                family: 'Inter',
                                size: 12
                            },
                            color: colors.textMuted,
                            padding: 8,
                            callback: formatAxis
                        }
                    }
                },
                elements: {
                    point: {
                        radius: 0,
                        hoverRadius: 5,
                        hoverBorderWidth: 2
                    }
                }
            }
        });
    }

    // Amount paid in during each year (excludes the starting amount)
    addYearlyContributions(yearlyBreakdown, principal) {
        return yearlyBreakdown.map((year, i) => ({
            ...year,
            yearlyContribution: year.totalContributions - (i === 0 ? principal : yearlyBreakdown[i - 1].totalContributions)
        }));
    }

    updateCrossoverNote(yearlyBreakdown) {
        const note = document.getElementById('crossover-note');
        if (!note) return;

        const crossover = yearlyBreakdown.find(year => year.yearlyInterest > year.yearlyContribution);
        if (!crossover) {
            note.textContent = 'Your contributions are larger than the interest earned in every year of this period.';
        } else if (crossover.year === 1) {
            note.textContent = 'Interest earns more than you pay in from the very first year.';
        } else {
            note.innerHTML = `From <strong>year ${crossover.year}</strong>, the interest earned each year is larger than what you pay in.`;
        }
    }

    updateYearlyChart(yearlyBreakdown) {
        const ctx = document.getElementById('yearly-chart');
        if (!ctx) return;

        this.updateCrossoverNote(yearlyBreakdown);

        const colors = this.getThemeColors();
        const formatCurrency = amount => this.formatCurrency(amount);
        const axisFormat = this.getCurrencyFormat({
            notation: 'compact',
            maximumFractionDigits: 1
        });

        if (this.yearlyChart) {
            this.yearlyChart.destroy();
        }

        this.yearlyChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: yearlyBreakdown.map(year => year.year),
                datasets: [
                    {
                        label: 'Contributions',
                        data: yearlyBreakdown.map(year => year.yearlyContribution),
                        backgroundColor: colors.series2,
                        hoverBackgroundColor: colors.series2,
                        borderColor: colors.surface,
                        borderWidth: { top: 2 },
                        borderSkipped: 'bottom',
                        borderRadius: { bottomLeft: 4, bottomRight: 4 }
                    },
                    {
                        label: 'Interest',
                        data: yearlyBreakdown.map(year => year.yearlyInterest),
                        backgroundColor: colors.series1,
                        hoverBackgroundColor: colors.series1,
                        borderRadius: { topLeft: 4, topRight: 4 },
                        borderSkipped: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                datasets: {
                    bar: {
                        barPercentage: 0.8,
                        categoryPercentage: 0.9
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        align: 'start',
                        labels: {
                            usePointStyle: true,
                            pointStyle: 'circle',
                            boxWidth: 8,
                            boxHeight: 8,
                            padding: 16,
                            color: colors.textSecondary,
                            font: { family: 'Inter', size: 13 }
                        }
                    },
                    tooltip: {
                        backgroundColor: colors.surface,
                        titleColor: colors.textPrimary,
                        bodyColor: colors.textSecondary,
                        footerColor: colors.textPrimary,
                        borderColor: colors.border,
                        borderWidth: 1,
                        padding: 12,
                        cornerRadius: 10,
                        usePointStyle: true,
                        boxPadding: 6,
                        titleFont: { family: 'Inter', size: 13, weight: '600' },
                        bodyFont: { family: 'Inter', size: 13 },
                        footerFont: { family: 'Inter', size: 13, weight: '600' },
                        callbacks: {
                            title: items => `Year ${items[0].label}`,
                            label: context => ` ${context.dataset.label}: ${formatCurrency(context.parsed.y)}`,
                            footer: items => `Growth: ${formatCurrency(items.reduce((sum, item) => sum + item.parsed.y, 0))}`
                        }
                    }
                },
                scales: {
                    x: {
                        stacked: true,
                        title: {
                            display: true,
                            text: 'Year',
                            color: colors.textMuted,
                            font: { family: 'Inter', size: 12 }
                        },
                        grid: { display: false },
                        border: { color: colors.border },
                        ticks: {
                            font: { family: 'Inter', size: 12 },
                            color: colors.textMuted,
                            maxRotation: 0,
                            autoSkipPadding: 16
                        }
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        grid: { color: colors.grid },
                        border: { display: false },
                        ticks: {
                            font: { family: 'Inter', size: 12 },
                            color: colors.textMuted,
                            padding: 8,
                            callback: value => axisFormat.format(value)
                        }
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
                <td>Year ${year.year}</td>
                <td><span class="swatch swatch-contrib" aria-hidden="true"></span>${this.formatCurrency(year.yearlyContribution)}</td>
                <td><span class="swatch swatch-interest" aria-hidden="true"></span>${this.formatCurrency(year.yearlyInterest)}</td>
                <td>${this.formatCurrency(year.totalContributions)}</td>
                <td class="balance-cell">${this.formatCurrency(year.balance)}</td>
            `;
            tbody.appendChild(row);
        });
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new WebCalculatorApp();
});