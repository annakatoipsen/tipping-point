import CompoundInterestCalculator from './calculator.js';
import { addYearlyContributions, describeCrossover } from './insights.js';

const percentFormat = new Intl.NumberFormat('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});

const CHART_FONT = 'Inter';

export class WebCalculatorApp {
    constructor() {
        this.chart = null;
        this.yearlyChart = null;
        this.lastBreakdown = null;
        this.currency = this.loadCurrency();
        this.buildFormatters();
        document.getElementById('currency-select').value = this.currency;
        this.applyCurrencyLabels();
        this.initializeEventListeners();
        this.calculateAll(); // Initial calculation

        this.updateThemeSwitch();
        this.syncThemeColorMeta();
        // Follow device theme changes, unless the user has picked light or dark
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            if (this.getThemeChoice() === 'auto') this.redrawCharts();
        });

        // Label widths change once the web font has loaded, so measure again
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(() => this.applyCurrencyLabels());
        }
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
        this.syncThemeColorMeta();
        this.redrawCharts();
    }

    updateThemeSwitch() {
        const choice = this.getThemeChoice();
        document.querySelectorAll('[data-theme-choice]').forEach(button => {
            button.setAttribute('aria-checked', String(button.dataset.themeChoice === choice));
        });
    }

    // Keep the mobile browser's address-bar colour in step with a manually chosen theme
    syncThemeColorMeta() {
        const choice = this.getThemeChoice();
        const pageColor = getComputedStyle(document.documentElement).getPropertyValue('--bg-page').trim();
        document.querySelectorAll('meta[name="theme-color"]').forEach(meta => {
            if (!meta.dataset.defaultContent) meta.dataset.defaultContent = meta.content;
            meta.content = choice === 'auto' ? meta.dataset.defaultContent : pageColor;
        });
    }

    redrawCharts() {
        if (!this.lastBreakdown) return;
        try {
            this.updateChart(this.lastBreakdown);
            this.updateYearlyChart(this.lastBreakdown);
        } catch (error) {
            console.error('Chart redraw error:', error);
        }
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
        this.buildFormatters();
        this.applyCurrencyLabels();
        this.calculateAll();
    }

    // Formatters are reused for every amount on the page and only rebuilt when the currency changes
    buildFormatters() {
        const base = {
            style: 'currency',
            currency: this.currency,
            // "$" instead of "US$"; other currencies keep their standard en-GB symbol or code
            currencyDisplay: this.currency === 'USD' ? 'narrowSymbol' : 'symbol'
        };
        this.currencyFormat = new Intl.NumberFormat('en-GB', {
            ...base,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });
        this.compactCurrencyFormat = new Intl.NumberFormat('en-GB', {
            ...base,
            notation: 'compact',
            maximumFractionDigits: 1
        });
        this.currencySymbol = this.currencyFormat.formatToParts(0).find(part => part.type === 'currency').value;
    }

    applyCurrencyLabels() {
        document.querySelectorAll('.input-wrapper .currency').forEach(label => {
            label.textContent = this.currencySymbol;
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

        // Real-time calculation ('input' covers typing, pasting and the spinner buttons)
        // The shared fields at the top feed all three tabs
        ['principal', 'monthly', 'rate', 'years'].forEach(id => {
            document.getElementById(id)?.addEventListener('input', () => this.calculateAll());
        });
        ['target'].forEach(id => {
            document.getElementById(id)?.addEventListener('input', () => this.calculateGoal());
        });
        ['req-target', 'req-years'].forEach(id => {
            document.getElementById(id)?.addEventListener('input', () => this.calculateRequired());
        });

        // Tabs: click, plus arrow keys / Home / End as in the WAI-ARIA tabs pattern
        const tabs = [...document.querySelectorAll('.tab')];
        tabs.forEach((tab, index) => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchTab(tab.dataset.tab);
            });
            tab.addEventListener('keydown', (e) => {
                const keys = {
                    ArrowRight: (index + 1) % tabs.length,
                    ArrowLeft: (index - 1 + tabs.length) % tabs.length,
                    Home: 0,
                    End: tabs.length - 1
                };
                if (!(e.key in keys)) return;
                e.preventDefault();
                const next = tabs[keys[e.key]];
                this.switchTab(next.dataset.tab);
                next.focus();
            });
        });
    }

    switchTab(tabName) {
        document.querySelectorAll('.tab').forEach(tab => {
            const selected = tab.dataset.tab === tabName;
            tab.classList.toggle('active', selected);
            tab.setAttribute('aria-selected', String(selected));
            tab.tabIndex = selected ? 0 : -1;
        });

        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-content`);
        });
        this.applyCurrencyLabels();

        // Calculate for the active tab
        switch (tabName) {
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
        return this.currencyFormat.format(amount);
    }

    formatPercent(rate) {
        return percentFormat.format(rate) + '%';
    }

    calculateAll() {
        this.calculate();
        this.calculateGoal();
        this.calculateRequired();
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
            const breakdown = addYearlyContributions(result.yearlyBreakdown, principal);
            this.lastBreakdown = breakdown;
            this.updateCrossoverNote(breakdown);
            this.updateBreakdownTable(breakdown);
            this.updateChart(breakdown);
            this.updateYearlyChart(breakdown);
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

            let text;
            if (result.months === 0) text = 'Already reached';
            else if (result.months >= 1200) text = 'Not reachable within 100 years';
            else text = `${result.years} ${result.years === 1 ? 'year' : 'years'}`;
            document.getElementById('time-to-goal').textContent = text;
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

            // Zero or less means the starting amount reaches the target without further saving
            document.getElementById('required-monthly').textContent =
                required > 0 ? this.formatCurrency(required) : 'Nothing extra needed';
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

    updateCrossoverNote(yearlyBreakdown) {
        const note = document.getElementById('crossover-note');
        if (!note) return;

        const { text, year } = describeCrossover(yearlyBreakdown);
        const highlight = year > 1 ? `year ${year}` : null;
        note.textContent = '';
        if (highlight && text.includes(highlight)) {
            // Bold the crossover year, e.g. "From <strong>year 9</strong>, …"
            const [before, after] = text.split(highlight);
            const strong = document.createElement('strong');
            strong.textContent = highlight;
            note.append(before, strong, after);
        } else {
            note.textContent = text;
        }
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

    // Options shared by both charts; each chart adds its own specifics on top
    baseChartOptions(colors, { stacked = false, tooltipFooter } = {}) {
        const formatCurrency = amount => this.formatCurrency(amount);
        const compactFormat = this.compactCurrencyFormat;
        const callbacks = {
            title: items => `Year ${items[0].label}`,
            label: context => ` ${context.dataset.label}: ${formatCurrency(context.parsed.y)}`
        };
        if (tooltipFooter) callbacks.footer = tooltipFooter;

        return {
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
                        font: { family: CHART_FONT, size: 13 }
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
                    titleFont: { family: CHART_FONT, size: 13, weight: '600' },
                    bodyFont: { family: CHART_FONT, size: 13 },
                    footerFont: { family: CHART_FONT, size: 13, weight: '600' },
                    callbacks
                }
            },
            scales: {
                x: {
                    stacked,
                    title: {
                        display: true,
                        text: 'Year',
                        color: colors.textMuted,
                        font: { family: CHART_FONT, size: 12 }
                    },
                    grid: { display: false },
                    border: { color: colors.border },
                    ticks: {
                        font: { family: CHART_FONT, size: 12 },
                        color: colors.textMuted,
                        maxRotation: 0,
                        autoSkipPadding: 16
                    }
                },
                y: {
                    stacked,
                    beginAtZero: true,
                    grid: { color: colors.grid },
                    border: { display: false },
                    ticks: {
                        font: { family: CHART_FONT, size: 12 },
                        color: colors.textMuted,
                        padding: 8,
                        callback: value => compactFormat.format(value)
                    }
                }
            }
        };
    }

    // Update an existing chart in place (no teardown/flicker), or create it the first time
    renderChart(existing, canvasId, config) {
        const canvas = document.getElementById(canvasId);
        if (!canvas || typeof Chart === 'undefined') return existing;

        if (existing) {
            existing.data = config.data;
            existing.options = config.options;
            existing.update();
            return existing;
        }
        return new Chart(canvas, config);
    }

    updateChart(yearlyBreakdown) {
        const colors = this.getThemeColors();
        const options = this.baseChartOptions(colors);
        options.elements = {
            point: {
                radius: 0,
                hoverRadius: 5,
                hoverBorderWidth: 2
            }
        };

        this.chart = this.renderChart(this.chart, 'growth-chart', {
            type: 'line',
            data: {
                labels: yearlyBreakdown.map(year => year.year),
                datasets: [
                    {
                        label: 'Total balance',
                        data: yearlyBreakdown.map(year => year.balance),
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
                        data: yearlyBreakdown.map(year => year.totalContributions),
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
            options
        });
    }

    updateYearlyChart(yearlyBreakdown) {
        const colors = this.getThemeColors();
        const formatCurrency = amount => this.formatCurrency(amount);
        const options = this.baseChartOptions(colors, {
            stacked: true,
            tooltipFooter: items => `Growth: ${formatCurrency(items.reduce((sum, item) => sum + item.parsed.y, 0))}`
        });
        options.datasets = {
            bar: {
                barPercentage: 0.8,
                categoryPercentage: 0.9
            }
        };

        this.yearlyChart = this.renderChart(this.yearlyChart, 'yearly-chart', {
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
            options
        });
    }

    updateBreakdownTable(yearlyBreakdown) {
        const tbody = document.querySelector('#breakdown-table tbody');
        if (!tbody) return;

        tbody.innerHTML = yearlyBreakdown.map(year => `
            <tr>
                <td>Year ${year.year}</td>
                <td><span class="swatch swatch-contrib" aria-hidden="true"></span>${this.formatCurrency(year.yearlyContribution)}</td>
                <td><span class="swatch swatch-interest" aria-hidden="true"></span>${this.formatCurrency(year.yearlyInterest)}</td>
                <td>${this.formatCurrency(year.totalContributions)}</td>
                <td class="balance-cell">${this.formatCurrency(year.balance)}</td>
            </tr>
        `).join('');
    }
}

