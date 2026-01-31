// MathSolver Pro - Main Application
const API_URL = window.location.origin + '/api';

class MathSolverApp {
    constructor() {
        this.currentTool = 'derivative';
        this.history = this.loadHistory();
        this.theme = localStorage.getItem('theme') || 'light';
        this.init();
    }

    init() {
        this.setupTheme();
        this.setupToolNavigation();
        this.setupCalculators();
        this.setupHistory();
        this.setupKeyboardShortcuts();
        this.setupExamples();
        this.setupPractice();
        this.setupModals();
    }

    // Theme Management
    setupTheme() {
        document.documentElement.setAttribute('data-theme', this.theme);
        const themeToggle = document.getElementById('themeToggle');
        
        themeToggle.addEventListener('click', () => {
            this.theme = this.theme === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', this.theme);
            localStorage.setItem('theme', this.theme);
            this.showToast('Theme changed', 'success');
        });
    }

    // Tool Navigation
    setupToolNavigation() {
        const toolButtons = document.querySelectorAll('.tool-btn');
        
        toolButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const tool = btn.dataset.tool;
                this.switchTool(tool);
            });
        });
    }

    switchTool(tool) {
        // Update active button
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === tool);
        });

        // Update active container
        document.querySelectorAll('.tool-container').forEach(container => {
            container.classList.remove('active');
        });
        
        const toolContainer = document.getElementById(`${tool}-tool`);
        if (toolContainer) {
            toolContainer.classList.add('active');
        }

        this.currentTool = tool;
    }

    // Calculator Setup
    setupCalculators() {
        // Derivative
        const derivativeCalc = document.getElementById('derivative-calculate');
        const derivativeInput = document.getElementById('derivative-input');
        
        derivativeCalc?.addEventListener('click', () => this.calculateDerivative());
        derivativeInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.calculateDerivative();
        });

        // Integral
        const integralCalc = document.getElementById('integral-calculate');
        const integralInput = document.getElementById('integral-input');
        const definiteCheckbox = document.getElementById('definite-integral');
        
        integralCalc?.addEventListener('click', () => this.calculateIntegral());
        integralInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.calculateIntegral();
        });
        
        definiteCheckbox?.addEventListener('change', (e) => {
            const bounds = document.getElementById('integral-bounds');
            if (bounds) {
                bounds.style.display = e.target.checked ? 'flex' : 'none';
            }
        });

        // Limit
        const limitCalc = document.getElementById('limit-calculate');
        const limitInput = document.getElementById('limit-input');
        
        limitCalc?.addEventListener('click', () => this.calculateLimit());
        limitInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.calculateLimit();
        });
    }

    async calculateDerivative() {
        const input = document.getElementById('derivative-input').value;
        const variable = document.getElementById('derivative-variable').value || 'x';
        
        if (!input.trim()) {
            this.showToast('Please enter an expression', 'error');
            return;
        }

        this.showLoading(true);

        try {
            const response = await fetch(`${API_URL}/calculate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    operation: 'derivative',
                    expression: input,
                    variable: variable
                })
            });

            const data = await response.json();
            
            if (response.ok) {
                this.displayResults('derivative', data);
                this.addToHistory('derivative', input, data.result);
                this.showToast('Derivative calculated!', 'success');
            } else {
                throw new Error(data.error || 'Calculation failed');
            }
        } catch (error) {
            this.showToast(error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async calculateIntegral() {
        const input = document.getElementById('integral-input').value;
        const variable = document.getElementById('integral-variable').value || 'x';
        const definite = document.getElementById('definite-integral').checked;
        
        if (!input.trim()) {
            this.showToast('Please enter an expression', 'error');
            return;
        }

        this.showLoading(true);

        try {
            const body = {
                operation: 'integral',
                expression: input,
                variable: variable,
                definite: definite
            };

            if (definite) {
                body.lower = document.getElementById('integral-lower').value || '0';
                body.upper = document.getElementById('integral-upper').value || '1';
            }

            const response = await fetch(`${API_URL}/calculate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await response.json();
            
            if (response.ok) {
                this.displayResults('integral', data);
                this.addToHistory('integral', input, data.result);
                this.showToast('Integral calculated!', 'success');
            } else {
                throw new Error(data.error || 'Calculation failed');
            }
        } catch (error) {
            this.showToast(error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async calculateLimit() {
        const input = document.getElementById('limit-input').value;
        const variable = document.getElementById('limit-variable').value || 'x';
        const point = document.getElementById('limit-point').value || '0';
        const direction = document.getElementById('limit-direction').value || '+-';
        
        if (!input.trim()) {
            this.showToast('Please enter an expression', 'error');
            return;
        }

        this.showLoading(true);

        try {
            const response = await fetch(`${API_URL}/calculate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    operation: 'limit',
                    expression: input,
                    variable: variable,
                    point: parseFloat(point),
                    direction: direction
                })
            });

            const data = await response.json();
            
            if (response.ok) {
                this.displayResults('limit', data);
                this.addToHistory('limit', input, data.result);
                this.showToast('Limit calculated!', 'success');
            } else {
                throw new Error(data.error || 'Calculation failed');
            }
        } catch (error) {
            this.showToast(error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    displayResults(type, data) {
        const resultsSection = document.getElementById(`${type}-results`);
        if (!resultsSection) return;

        resultsSection.style.display = 'block';

        // Display result
        const resultDisplay = resultsSection.querySelector('.result-content') || 
                            this.createResultsHTML(resultsSection);
        this.renderLatex(resultDisplay, data.result);

        // Display steps
        if (data.steps && data.steps.length > 0) {
            const stepsDisplay = resultsSection.querySelector('.steps-content') ||
                               this.createStepsHTML(resultsSection);
            this.renderSteps(stepsDisplay, data.steps);
        }

        // Display graph
        if (data.graph) {
            this.renderGraph(data.graph);
        }

        // Scroll to results
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    createResultsHTML(container) {
        const html = `
            <div class="result-card">
                <div class="result-header">
                    <h3>Result</h3>
                    <div class="result-actions">
                        <button class="icon-btn copy-result" title="Copy">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="result-content"></div>
            </div>
            <div class="steps-card">
                <div class="steps-header">
                    <h3>Step-by-Step Solution</h3>
                </div>
                <div class="steps-content"></div>
            </div>
            <div class="graph-card" style="display: none;">
                <div class="graph-header">
                    <h3>Visualization</h3>
                </div>
                <canvas id="graph-canvas"></canvas>
            </div>
        `;
        
        container.innerHTML = html;
        
        // Setup copy button
        container.querySelector('.copy-result')?.addEventListener('click', () => {
            const text = container.querySelector('.result-content').textContent;
            navigator.clipboard.writeText(text);
            this.showToast('Result copied!', 'success');
        });
        
        return container.querySelector('.result-content');
    }

    createStepsHTML(container) {
        return container.querySelector('.steps-content');
    }

    renderLatex(element, latex) {
        if (typeof latex === 'string') {
            try {
                katex.render(latex, element, {
                    throwOnError: false,
                    displayMode: true
                });
            } catch (e) {
                element.textContent = latex;
            }
        } else if (Array.isArray(latex)) {
            element.innerHTML = '';
            latex.forEach((item, i) => {
                const div = document.createElement('div');
                div.style.marginBottom = '1rem';
                try {
                    katex.render(item, div, {
                        throwOnError: false,
                        displayMode: true
                    });
                } catch (e) {
                    div.textContent = `Solution ${i + 1}: ${item}`;
                }
                element.appendChild(div);
            });
        }
    }

    renderSteps(container, steps) {
        container.innerHTML = '';
        
        steps.forEach((step, index) => {
            const stepDiv = document.createElement('div');
            stepDiv.className = 'step-item';
            stepDiv.style.animationDelay = `${index * 0.1}s`;
            
            stepDiv.innerHTML = `
                <div class="step-header">Step ${index + 1}: ${step.step}</div>
                <div class="step-expression"></div>
                <div class="step-explanation">${step.explanation}</div>
            `;
            
            container.appendChild(stepDiv);
            
            // Render LaTeX for expression
            const exprDiv = stepDiv.querySelector('.step-expression');
            try {
                katex.render(step.expression, exprDiv, {
                    throwOnError: false,
                    displayMode: true
                });
            } catch (e) {
                exprDiv.textContent = step.expression;
            }
        });
    }

    renderGraph(graphData) {
        const canvas = document.getElementById('graph-canvas');
        const container = canvas?.closest('.graph-card');
        
        if (!canvas || !container) return;
        
        container.style.display = 'block';
        
        // Destroy existing chart
        if (this.chart) {
            this.chart.destroy();
        }
        
        const datasets = [];
        
        if (graphData.original) {
            datasets.push({
                label: graphData.original.label,
                data: graphData.original.x.map((x, i) => ({
                    x: x,
                    y: graphData.original.y[i]
                })),
                borderColor: '#0066FF',
                backgroundColor: 'rgba(0, 102, 255, 0.1)',
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.4
            });
        }
        
        if (graphData.derivative) {
            datasets.push({
                label: graphData.derivative.label,
                data: graphData.derivative.x.map((x, i) => ({
                    x: x,
                    y: graphData.derivative.y[i]
                })),
                borderColor: '#FF0080',
                backgroundColor: 'rgba(255, 0, 128, 0.1)',
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.4
            });
        }
        
        if (graphData.function) {
            datasets.push({
                label: graphData.function.label,
                data: graphData.function.x.map((x, i) => ({
                    x: x,
                    y: graphData.function.y[i]
                })),
                borderColor: '#0066FF',
                backgroundColor: 'rgba(0, 102, 255, 0.1)',
                borderWidth: 2,
                pointRadius: 0,
                fill: true,
                tension: 0.4
            });
        }
        
        this.chart = new Chart(canvas, {
            type: 'line',
            data: { datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    x: {
                        type: 'linear',
                        title: {
                            display: true,
                            text: 'x'
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'y'
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        });
    }

    // History Management
    setupHistory() {
        const historyToggle = document.getElementById('historyToggle');
        const historyPanel = document.getElementById('historyPanel');
        const clearHistory = document.getElementById('clearHistory');
        const historySearch = document.getElementById('historySearch');
        
        historyToggle?.addEventListener('click', () => {
            historyPanel.classList.toggle('open');
        });
        
        clearHistory?.addEventListener('click', () => {
            if (confirm('Clear all history?')) {
                this.history = [];
                this.saveHistory();
                this.renderHistory();
                this.showToast('History cleared', 'success');
            }
        });
        
        historySearch?.addEventListener('input', (e) => {
            this.filterHistory(e.target.value);
        });
        
        this.renderHistory();
    }

    addToHistory(type, expression, result) {
        const entry = {
            id: Date.now(),
            type,
            expression,
            result: typeof result === 'string' ? result : JSON.stringify(result),
            timestamp: new Date().toISOString()
        };
        
        this.history.unshift(entry);
        
        // Keep only last 100 entries
        if (this.history.length > 100) {
            this.history = this.history.slice(0, 100);
        }
        
        this.saveHistory();
        this.renderHistory();
    }

    renderHistory() {
        const historyList = document.getElementById('historyList');
        if (!historyList) return;
        
        if (this.history.length === 0) {
            historyList.innerHTML = `
                <div class="empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                    </svg>
                    <p>No calculations yet</p>
                </div>
            `;
            return;
        }
        
        historyList.innerHTML = '';
        
        this.history.forEach(entry => {
            const item = document.createElement('div');
            item.className = 'history-item';
            item.innerHTML = `
                <div class="history-item-type">${entry.type}</div>
                <div class="history-item-expr">${this.truncate(entry.expression, 40)}</div>
            `;
            
            item.addEventListener('click', () => {
                this.loadFromHistory(entry);
            });
            
            historyList.appendChild(item);
        });
    }

    filterHistory(query) {
        const items = document.querySelectorAll('.history-item');
        const lowerQuery = query.toLowerCase();
        
        items.forEach(item => {
            const text = item.textContent.toLowerCase();
            item.style.display = text.includes(lowerQuery) ? 'block' : 'none';
        });
    }

    loadFromHistory(entry) {
        this.switchTool(entry.type);
        
        const input = document.getElementById(`${entry.type}-input`);
        if (input) {
            input.value = entry.expression;
            input.focus();
        }
        
        this.showToast('Loaded from history', 'success');
    }

    saveHistory() {
        localStorage.setItem('mathsolver_history', JSON.stringify(this.history));
    }

    loadHistory() {
        try {
            return JSON.parse(localStorage.getItem('mathsolver_history') || '[]');
        } catch {
            return [];
        }
    }

    // Examples
    setupExamples() {
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('example-btn')) {
                const example = e.target.dataset.example;
                const activeContainer = document.querySelector('.tool-container.active');
                const input = activeContainer?.querySelector('.math-input');
                
                if (input) {
                    input.value = example;
                    input.focus();
                    this.showToast('Example loaded', 'success');
                }
            }
        });
    }

    // Practice Problems
    setupPractice() {
        const generateBtn = document.getElementById('practice-generate');
        
        generateBtn?.addEventListener('click', () => {
            this.generatePracticeProblems();
        });
    }

    async generatePracticeProblems() {
        const topic = document.getElementById('practice-topic').value;
        const difficulty = document.getElementById('practice-difficulty').value;
        
        this.showLoading(true);
        
        try {
            const response = await fetch(`${API_URL}/practice`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic, difficulty })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.displayPracticeProblems(data.problems);
                this.showToast('Practice problems generated!', 'success');
            } else {
                throw new Error(data.error || 'Failed to generate problems');
            }
        } catch (error) {
            this.showToast(error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    displayPracticeProblems(problems) {
        const container = document.getElementById('practice-problems');
        if (!container) return;
        
        container.innerHTML = '';
        
        problems.forEach((problem, index) => {
            const problemDiv = document.createElement('div');
            problemDiv.className = 'practice-problem';
            problemDiv.innerHTML = `
                <div class="problem-number">Problem ${index + 1}</div>
                <div class="problem-question"></div>
                <div class="problem-actions">
                    <button class="btn-primary show-hint" data-hint="${problem.hint}">
                        Show Hint
                    </button>
                    <button class="btn-primary show-solution" data-index="${index}">
                        Show Solution
                    </button>
                </div>
                <div class="problem-solution" data-index="${index}">
                    <strong>Solution:</strong>
                    <div class="solution-content"></div>
                </div>
            `;
            
            container.appendChild(problemDiv);
            
            // Render problem
            const questionDiv = problemDiv.querySelector('.problem-question');
            try {
                katex.render(problem.problem, questionDiv, {
                    throwOnError: false,
                    displayMode: true
                });
            } catch (e) {
                questionDiv.textContent = problem.problem;
            }
            
            // Render solution
            const solutionDiv = problemDiv.querySelector('.solution-content');
            try {
                katex.render(problem.solution, solutionDiv, {
                    throwOnError: false,
                    displayMode: true
                });
            } catch (e) {
                solutionDiv.textContent = problem.solution;
            }
            
            // Setup buttons
            problemDiv.querySelector('.show-hint')?.addEventListener('click', function() {
                this.showToast(this.dataset.hint, 'success');
            }.bind(this));
            
            problemDiv.querySelector('.show-solution')?.addEventListener('click', function(e) {
                const solution = problemDiv.querySelector('.problem-solution');
                solution.classList.toggle('show');
                e.target.textContent = solution.classList.contains('show') ? 
                    'Hide Solution' : 'Show Solution';
            });
        });
    }

    // Keyboard Shortcuts
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+Enter: Calculate
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                const activeContainer = document.querySelector('.tool-container.active');
                const calcBtn = activeContainer?.querySelector('.btn-primary');
                calcBtn?.click();
            }
            
            // Ctrl+H: Toggle history
            if (e.ctrlKey && e.key === 'h') {
                e.preventDefault();
                document.getElementById('historyToggle')?.click();
            }
            
            // Ctrl+/: Show help
            if (e.ctrlKey && e.key === '/') {
                e.preventDefault();
                document.getElementById('helpModal')?.classList.add('show');
            }
            
            // Ctrl+K: Focus input
            if (e.ctrlKey && e.key === 'k') {
                e.preventDefault();
                const activeContainer = document.querySelector('.tool-container.active');
                const input = activeContainer?.querySelector('.math-input');
                input?.focus();
            }
        });
    }

    // Modals
    setupModals() {
        const helpBtn = document.getElementById('helpBtn');
        const helpModal = document.getElementById('helpModal');
        const closeHelp = document.getElementById('closeHelp');
        
        helpBtn?.addEventListener('click', () => {
            helpModal?.classList.add('show');
        });
        
        closeHelp?.addEventListener('click', () => {
            helpModal?.classList.remove('show');
        });
        
        helpModal?.addEventListener('click', (e) => {
            if (e.target === helpModal) {
                helpModal.classList.remove('show');
            }
        });
    }

    // UI Helpers
    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.toggle('show', show);
        }
    }

    showToast(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    truncate(str, length) {
        return str.length > length ? str.substring(0, length) + '...' : str;
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new MathSolverApp();
});
