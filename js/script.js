const SIZE = 10;
const CELL_SIZE = 40;
let currentTestIndex = 0;
let currentPattern = null;
let targetPattern = null;
let operationsHistory = [];
let workflowSelections = []; // indices of selected workflow items
let pendingBinaryOp = null; // e.g. 'add', 'subtract', 'union'
let previewPattern = null;
let previewBackupPattern = null;
let allTrialsData = [];
let trialStartTime = null;
let testOrder = [];
let shouldRandomize = false;
let currentTrialRecord = null; // holds per-trial detailed record (steps etc.)
// preview removed; operations commit immediately

const geomDSL = {
    blank: () => Array(SIZE).fill(0).map(() => Array(SIZE).fill(0)),
    line_horizontal: (row = Math.floor(SIZE / 2)) => {
        const pattern = geomDSL.blank();
        pattern[row].fill(1);
        return pattern;
    },
    line_vertical: (col = Math.floor(SIZE / 2)) => {
        const pattern = geomDSL.blank();
        for (let i = 0; i < SIZE; i++) pattern[i][col] = 1;
        return pattern;
    },
    diagonal: () => {
        const pattern = geomDSL.blank();
        for (let i = 0; i < SIZE; i++) pattern[i][i] = 1;
        return pattern;
    },
    square: () => {
        const pattern = geomDSL.blank();
        for (let i = 0; i < SIZE; i++) {
            pattern[0][i] = pattern[SIZE-1][i] = 1;
            pattern[i][0] = pattern[i][SIZE-1] = 1;
        }
        return pattern;
    },
    triangle: () => {
        const pattern = geomDSL.blank();
        for (let i = 0; i < SIZE; i++) {
            for (let j = 0; j <= i; j++) {
                pattern[i][j] = 1;
            }
        }
        return pattern;
    }
};

const transDSL = {
    subtract: (a, b) => a.map((row, i) => row.map((val, j) => val && !b[i][j] ? 1 : 0)),
    add: (a, b) => a.map((row, i) => row.map((val, j) => val || b[i][j] ? 1 : 0)),
    union: (a, b) => a.map((row, i) => row.map((val, j) => val && b[i][j] ? 1 : 0)),
    invert: (a) => a.map(row => row.map(val => val ? 0 : 1)),
    reflect_horizontal: (a) => [...a].reverse(),
    reflect_vertical: (a) => a.map(row => [...row].reverse()),
    reflect_diag: (a) => a[0].map((_, i) => a.map(row => row[i]))
};

const testCases = [
    // Row 1
    { name: "Row1-1", generate: () => [
        [0,0,0,0,0,1,0,0,0,0],
        [0,0,0,0,0,1,0,0,0,0],
        [0,0,0,0,0,1,0,0,0,0],
        [0,0,0,0,0,1,0,0,0,0],
        [0,0,0,0,0,1,0,0,0,0],
        [1,1,1,1,1,1,1,1,1,1],
        [0,0,0,0,0,1,0,0,0,0],
        [0,0,0,0,0,1,0,0,0,0],
        [0,0,0,0,0,1,0,0,0,0],
        [0,0,0,0,0,1,0,0,0,0]
    ]},
    
    { name: "Row1-2", generate: () => [
        [1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,1,0,0,0,1],
        [1,0,0,0,0,1,0,0,0,1],
        [1,0,0,0,0,1,0,0,0,1],
        [1,0,0,0,0,1,0,0,0,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,1,0,0,0,1],
        [1,0,0,0,0,1,0,0,0,1],
        [1,0,0,0,0,1,0,0,0,1],
        [1,1,1,1,1,1,1,1,1,1]
    ]},
    
    { name: "Row1-3", generate: () => [
        [1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,1,1,0,0,0,1],
        [1,0,0,0,1,1,0,0,0,1],
        [1,0,0,0,1,1,0,0,0,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,1,1,0,0,0,1],
        [1,0,0,0,1,1,0,0,0,1],
        [1,0,0,0,1,1,0,0,0,1],
        [1,1,1,1,1,1,1,1,1,1]
    ]},
    
    // Row 2
    { name: "Row2-1", generate: () => [
        [0,1,1,1,1,1,1,1,1,0],
        [1,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,1],
        [0,1,1,1,1,1,1,1,1,0]
    ]},
    
    { name: "Row2-2", generate: () => [
        [1,0,0,0,0,0,0,0,0,1],
        [0,1,0,0,0,0,0,0,1,0],
        [0,0,1,0,0,0,0,1,0,0],
        [0,0,0,1,0,0,1,0,0,0],
        [0,0,0,0,1,1,0,0,0,0],
        [0,0,0,0,1,1,0,0,0,0],
        [0,0,0,1,0,0,1,0,0,0],
        [0,0,1,0,0,0,0,1,0,0],
        [0,1,0,0,0,0,0,0,1,0],
        [1,0,0,0,0,0,0,0,0,1]
    ]},
    
    { name: "Row2-3", generate: () => [
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,0,0,0,0,0,0,1,1],
        [1,0,1,0,0,0,0,1,0,1],
        [1,0,0,1,0,0,1,0,0,1],
        [1,0,0,0,1,1,0,0,0,1],
        [1,0,0,0,1,1,0,0,0,1],
        [1,0,0,1,0,0,1,0,0,1],
        [1,0,1,0,0,0,0,1,0,1],
        [1,1,0,0,0,0,0,0,1,1],
        [1,1,1,1,1,1,1,1,1,1]
    ]},
    
    // Row 3
    { name: "Row3-1", generate: () => [
        [1,1,1,1,1,1,1,1,1,1],
        [0,1,1,1,1,1,1,1,1,1],
        [0,0,1,1,1,1,1,1,1,1],
        [0,0,0,1,1,1,1,1,1,1],
        [0,0,0,0,1,1,1,1,1,1],
        [0,0,0,0,0,1,1,1,1,1],
        [0,0,0,0,0,0,1,1,1,1],
        [0,0,0,0,0,0,0,1,1,1],
        [0,0,0,0,0,0,0,0,1,1],
        [0,0,0,0,0,0,0,0,0,1]
    ]},
    
    { name: "Row3-2", generate: () => [
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,0,1,1,1,1,1,1,1,1],
        [1,0,0,1,1,1,1,1,1,1],
        [1,0,0,0,1,1,1,1,1,1],
        [1,0,0,0,0,1,1,1,1,1],
        [1,0,0,0,0,0,1,1,1,1],
        [1,0,0,0,0,0,0,1,1,1],
        [1,0,0,0,0,0,0,0,1,1],
        [1,1,1,1,1,1,1,1,1,1]
    ]},
    
    { name: "Row3-3", generate: () => [
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,1,0,0,0,0,0,0,0,0],
        [0,1,1,0,0,0,0,0,0,0],
        [0,1,1,1,0,0,0,0,0,0],
        [0,1,1,1,1,0,0,0,0,0],
        [0,1,1,1,1,1,0,0,0,0],
        [0,1,1,1,1,1,1,0,0,0],
        [0,1,1,1,1,1,1,1,0,0],
        [0,0,0,0,0,0,0,0,0,0]
    ]},
    
    // Row 4
    { name: "Row4-1", generate: () => [
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,1,1,1,1,1,1,0,0],
        [0,1,0,1,1,1,1,0,1,0],
        [0,1,1,0,1,1,0,1,1,0],
        [0,1,1,1,0,0,1,1,1,0],
        [0,1,1,1,0,0,1,1,1,0],
        [0,1,1,0,1,1,0,1,1,0],
        [0,1,0,1,1,1,1,0,1,0],
        [0,0,1,1,1,1,1,1,0,0],
        [0,0,0,0,0,0,0,0,0,0]
    ]},
    
    { name: "Row4-2", generate: () => [
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,1,0,0,0,0,0,0,1,0],
        [0,1,1,0,0,0,0,1,1,0],
        [0,1,1,1,0,0,1,1,1,0],
        [0,1,1,1,1,1,1,1,1,0],
        [0,1,1,1,1,1,1,1,1,0],
        [0,1,1,1,1,1,1,1,1,0],
        [0,1,1,1,1,1,1,1,1,0],
        [0,0,0,0,0,0,0,0,0,0]
    ]},
    
    { name: "Row4-3", generate: () => [
        [0,0,0,0,0,0,0,0,0,0],
        [0,1,1,1,1,1,1,1,1,0],
        [0,0,1,1,1,1,1,1,0,0],
        [0,0,0,1,1,1,1,0,0,0],
        [0,0,0,0,1,1,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0]
    ]},
    
    // Row 5
    { name: "Row5-1", generate: () => [
        [0,0,0,0,0,0,0,0,0,0],
        [0,1,1,1,1,1,1,1,1,0],
        [0,0,1,1,1,1,1,1,0,0],
        [0,0,0,1,1,1,1,0,0,0],
        [0,0,0,0,1,1,0,0,0,0],
        [0,0,0,0,1,1,0,0,0,0],
        [0,0,0,1,1,1,1,0,0,0],
        [0,0,1,1,1,1,1,1,0,0],
        [0,1,1,1,1,1,1,1,1,0],
        [0,0,0,0,0,0,0,0,0,0]
    ]},
    
    { name: "Row5-2", generate: () => [
        [1,0,0,0,1,1,0,0,0,1],
        [0,1,0,0,1,1,0,0,1,0],
        [0,0,1,0,1,1,0,1,0,0],
        [0,0,0,1,1,1,1,0,0,0],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [0,0,0,1,1,1,1,0,0,0],
        [0,0,1,0,1,1,0,1,0,0],
        [0,1,0,0,1,1,0,0,1,0],
        [1,0,0,0,1,1,0,0,0,1]
    ]},
    
    { name: "Row5-3", generate: () => [
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,1,1,1,1,1,1,0,0],
        [0,0,0,1,1,1,1,0,0,0],
        [0,0,0,0,1,1,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,1,1,0,0,0,0],
        [0,0,0,1,1,1,1,0,0,0],
        [0,0,1,1,1,1,1,1,0,0],
        [0,0,0,0,0,0,0,0,0,0]
    ]},
    
    // Row 6
    { name: "Row6-1", generate: () => [
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,1,1,0,0,0,0],
        [0,0,0,0,1,1,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0]
    ]},
    
    { name: "Row6-2", generate: () => [
        [1,0,0,0,1,1,0,0,0,1],
        [0,1,0,0,1,1,0,0,1,0],
        [0,0,1,0,1,1,0,1,0,0],
        [0,0,0,1,1,1,1,0,0,0],
        [1,1,1,1,0,0,1,1,1,1],
        [1,1,1,1,0,0,1,1,1,1],
        [0,0,0,1,1,1,1,0,0,0],
        [0,0,1,0,1,1,0,1,0,0],
        [0,1,0,0,1,1,0,0,1,0],
        [1,0,0,0,1,1,0,0,0,1]
    ]},
    
    { name: "Row6-3", generate: () => [
        [0,0,0,0,1,1,0,0,0,0],
        [0,0,0,0,1,1,0,0,0,0],
        [0,0,0,0,1,1,0,0,0,0],
        [0,0,0,0,1,1,0,0,0,0],
        [1,1,1,1,0,0,1,1,1,1],
        [1,1,1,1,0,0,1,1,1,1],
        [0,0,0,0,1,1,0,0,0,0],
        [0,0,0,0,1,1,0,0,0,0],
        [0,0,0,0,1,1,0,0,0,0],
        [0,0,0,0,1,1,0,0,0,0]
    ]}
];

function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

function startExperiment() {
    shouldRandomize = document.getElementById('randomizeOrder').checked;
    
    testOrder = Array.from({length: testCases.length}, (_, i) => i);
    if (shouldRandomize) {
        testOrder = shuffleArray(testOrder);
    }
    
    document.getElementById('welcomeScreen').style.display = 'none';
    document.getElementById('experimentContent').classList.remove('hidden');
    
    allTrialsData.push({
        metadata: {
            randomized: shouldRandomize,
            order: testOrder
        }
    });
    
    loadTrial(0);
}

function renderPattern(pattern, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const width = SIZE * CELL_SIZE;
    const height = SIZE * CELL_SIZE;
    const borderWidth = 3;
    
    // Set SVG size to include border
    svg.setAttribute("width", width + borderWidth * 2);
    svg.setAttribute("height", height + borderWidth * 2);
    svg.setAttribute("viewBox", `0 0 ${width + borderWidth * 2} ${height + borderWidth * 2}`);
    
    // Create a group for the pattern, offset by border width
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("transform", `translate(${borderWidth}, ${borderWidth})`);
    
    // Draw grid lines
    for (let i = 0; i <= SIZE; i++) {
        const vline = document.createElementNS("http://www.w3.org/2000/svg", "line");
        vline.setAttribute("x1", i * CELL_SIZE);
        vline.setAttribute("y1", 0);
        vline.setAttribute("x2", i * CELL_SIZE);
        vline.setAttribute("y2", height);
        vline.setAttribute("stroke", "#9ca3af");
        vline.setAttribute("stroke-width", "1");
        g.appendChild(vline);
        
        const hline = document.createElementNS("http://www.w3.org/2000/svg", "line");
        hline.setAttribute("x1", 0);
        hline.setAttribute("y1", i * CELL_SIZE);
        hline.setAttribute("x2", width);
        hline.setAttribute("y2", i * CELL_SIZE);
        hline.setAttribute("stroke", "#9ca3af");
        hline.setAttribute("stroke-width", "1");
        g.appendChild(hline);
    }
    
    // Draw filled cells
    pattern.forEach((row, i) => {
        row.forEach((cell, j) => {
            if (cell) {
                const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                rect.setAttribute("x", j * CELL_SIZE);
                rect.setAttribute("y", i * CELL_SIZE);
                rect.setAttribute("width", CELL_SIZE);
                rect.setAttribute("height", CELL_SIZE);
                rect.setAttribute("fill", "#08306B");
                rect.setAttribute("stroke", "#9ca3af");
                rect.setAttribute("stroke-width", "1");
                g.appendChild(rect);
            }
        });
    });
    
    svg.appendChild(g);
    
    // Draw border as SVG rect (ensures all sides are visible)
    const border = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    border.setAttribute("x", borderWidth / 2);
    border.setAttribute("y", borderWidth / 2);
    border.setAttribute("width", width + borderWidth);
    border.setAttribute("height", height + borderWidth);
    border.setAttribute("fill", "none");
    border.setAttribute("stroke", "#000");
    border.setAttribute("stroke-width", borderWidth);
    svg.appendChild(border);
    
    container.appendChild(svg);
}

// Render a small thumbnail SVG for workflow preview
function renderThumbnail(pattern, scale = 6) {
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', SIZE * scale);
    svg.setAttribute('height', SIZE * scale);
    for (let i = 0; i <= SIZE; i++) {
        const vline = document.createElementNS(svgNS, 'line');
        vline.setAttribute('x1', i * scale);
        vline.setAttribute('y1', 0);
        vline.setAttribute('x2', i * scale);
        vline.setAttribute('y2', SIZE * scale);
        vline.setAttribute('stroke', '#e5e7eb');
        vline.setAttribute('stroke-width', Math.max(0.4, scale * 0.08));
        svg.appendChild(vline);
        const hline = document.createElementNS(svgNS, 'line');
        hline.setAttribute('x1', 0);
        hline.setAttribute('y1', i * scale);
        hline.setAttribute('x2', SIZE * scale);
        hline.setAttribute('y2', i * scale);
        hline.setAttribute('stroke', '#e5e7eb');
        hline.setAttribute('stroke-width', Math.max(0.4, scale * 0.08));
        svg.appendChild(hline);
    }
    pattern.forEach((row, i) => {
        row.forEach((cell, j) => {
            if (cell) {
                const rect = document.createElementNS(svgNS, 'rect');
                rect.setAttribute('x', j * scale);
                rect.setAttribute('y', i * scale);
                rect.setAttribute('width', scale);
                rect.setAttribute('height', scale);
                rect.setAttribute('fill', '#08306B');
                svg.appendChild(rect);
            }
        });
    });
    return svg;
}

// Render a very small icon SVG for primitive buttons (no grid lines)
function renderPrimitiveIcon(pattern, scale = 3.5) {
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', SIZE * scale);
    svg.setAttribute('height', SIZE * scale);
    svg.style.display = 'block';
    
    pattern.forEach((row, i) => {
        row.forEach((cell, j) => {
            if (cell) {
                const rect = document.createElementNS(svgNS, 'rect');
                rect.setAttribute('x', j * scale);
                rect.setAttribute('y', i * scale);
                rect.setAttribute('width', scale);
                rect.setAttribute('height', scale);
                rect.setAttribute('fill', '#3b82f6');
                svg.appendChild(rect);
            }
        });
    });
    return svg;
}

// Initialize primitive button icons
function initializePrimitiveIcons() {
    const primitiveNames = ['blank', 'line_horizontal', 'line_vertical', 'diagonal', 'square', 'triangle'];
    primitiveNames.forEach(name => {
        const btn = document.querySelector(`button[data-op="${name}"]`);
        if (btn) {
            const iconSpan = btn.querySelector('.btn-icon');
            if (iconSpan) {
                iconSpan.innerHTML = ''; // Clear existing content
                const pattern = geomDSL[name]();
                const icon = renderPrimitiveIcon(pattern);
                iconSpan.appendChild(icon);
            }
        }
    });
}

function loadTrial(index) {
    // ensure testOrder exists; fall back to sequential indices if not set
    if (!Array.isArray(testOrder) || testOrder.length === 0) {
        testOrder = Array.from({ length: testCases.length }, (_, i) => i);
    }
    const total = testOrder.length;
    // clamp index into valid range
    const clamped = Math.max(0, Math.min(index, total - 1));
    // set the current test index so UI and state remain consistent
    currentTestIndex = clamped;
    const actualIndex = testOrder[currentTestIndex];
    targetPattern = testCases[actualIndex].generate();
    renderPattern(targetPattern, 'targetPattern');
    // clear workspace and workflow/log for the new trial
    resetWorkspace();
    // start with a blank canvas in the workspace by default (do not log blank)
    currentPattern = geomDSL.blank();
    renderPattern(currentPattern, 'workspace');
    trialStartTime = Date.now();
    // create a detailed trial record and push to allTrialsData
    currentTrialRecord = {
        trial: currentTestIndex + 1,
        actualProblemIndex: actualIndex,
        testName: testCases[actualIndex].name,
        steps: [], // will be populated by addOperation
        operations: [], // summary operation strings
        stepsCount: 0,
        timeSpent: 0,
        success: null,
        skipped: false,
        submitted: false,
        startedAt: trialStartTime
    };
    allTrialsData.push(currentTrialRecord);
    
    updateProgressUI(currentTestIndex);
}

// Helper: update progress UI elements consistently from one place
function updateProgressUI(index) {
    const idx = index;
    const total = (Array.isArray(testOrder) && testOrder.length > 0) ? testOrder.length : testCases.length;
    const currentEl = document.getElementById('currentTrial');
    const totalEl = document.getElementById('totalTrials');
    const targetEl = document.getElementById('targetNumber');
    const pctEl = document.getElementById('percentComplete');
    const fillEl = document.getElementById('progressFill');
    
    if (currentEl) {
        currentEl.textContent = idx + 1;
    }
    if (totalEl) {
        totalEl.textContent = total;
    }
    if (targetEl) {
        targetEl.textContent = idx + 1;
    }
    if (pctEl) {
        const pct = Math.round(((idx + 1) / total) * 100) + '%';
        pctEl.textContent = pct;
    }
    if (fillEl) {
        const width = ((idx + 1) / total * 100) + '%';
        fillEl.style.width = width;
    }
}

function getTotalTrials() {
    return (Array.isArray(testOrder) && testOrder.length > 0) ? testOrder.length : testCases.length;
}

function applyPrimitive(name) {
    // Primitives only work in binary mode
    if (!pendingBinaryOp) {
        alert('⚠️ Please select a binary operation first!\n\nClick ADD, SUBTRACT, or UNION button to begin.');
        return;
    }
    
    // Create pattern and auto-select it as operand
    currentPattern = geomDSL[name]();
    renderPattern(currentPattern, 'workspace');
    addOperation(name + '()');
    
    // Auto-select this new pattern for binary operation
    const newIndex = operationsHistory.length - 1;
    if (workflowSelections.length >= 2) workflowSelections.shift();
    workflowSelections.push(newIndex);
    renderWorkflow();
    
    // Check if we have 2 selections now → create preview
    if (workflowSelections.length === 2) {
        createBinaryPreview();
    }
    
    updateAllButtonStates();
}

function applyTransform(name) {
    // Transforms disabled in binary mode
    if (pendingBinaryOp) {
        alert('❌ Transforms are not available in binary mode.\n\nPlease cancel the binary operation first (press Esc or click the selected binary button again).');
        return;
    }
    
    if (!currentPattern && operationsHistory.length === 0) {
        alert('Please create a pattern first');
        return;
    }
    
    // Determine source pattern and label
    let operationLabel;
    let sourcePattern;
    let sourceIndex;
    
    if (workflowSelections.length === 1) {
        // User explicitly selected a workflow item
        sourceIndex = workflowSelections[0];
        operationLabel = name + '(' + (sourceIndex + 1) + ')';
        sourcePattern = operationsHistory[sourceIndex].pattern;
    } else if (operationsHistory.length > 0) {
        // No selection: use the last workflow item
        sourceIndex = operationsHistory.length - 1;
        operationLabel = name + '(' + (sourceIndex + 1) + ')';
        sourcePattern = operationsHistory[sourceIndex].pattern;
    } else {
        // Fallback to currentPattern if workflow is empty
        operationLabel = name + '(1)';
        sourcePattern = currentPattern;
    }
    
    // Apply transform to the source pattern
    currentPattern = transDSL[name](JSON.parse(JSON.stringify(sourcePattern)));
    renderPattern(currentPattern, 'workspace');
    addOperation(operationLabel);
    
    // Auto-select the newly added result
    const newIndex = operationsHistory.length - 1;
    workflowSelections = [newIndex];
    renderWorkflow();
    updateAllButtonStates();
}

function addOperation(op) {
    // default: simple operation entry
    const entry = {
        operation: op,
        pattern: JSON.parse(JSON.stringify(currentPattern)),
        timestamp: Date.now()
    };
    operationsHistory.push(entry);
    // also append a step record into the current trial record if present
    if (currentTrialRecord) {
        const stepEntry = {
            id: `s${Date.now()}_${Math.floor(Math.random()*1000)}`,
            operation: op,
            pattern: JSON.parse(JSON.stringify(currentPattern)),
            timestamp: Date.now()
        };
        currentTrialRecord.steps.push(stepEntry);
        currentTrialRecord.operations.push(op);
        currentTrialRecord.stepsCount = currentTrialRecord.steps.length;
    }
    updateOperationsLog();
    renderWorkflow();
    updateAllButtonStates();
}

function updateOperationsLog() {
    // keep this for backward compatibility with other log area
    const log = document.getElementById('operationsLog');
    if (log) log.innerHTML = '';
    
    document.getElementById('trialCount').textContent = operationsHistory.length;
}

function renderWorkflow() {
    const workflow = document.getElementById('operationsLog');
    if (!workflow) return;
    workflow.innerHTML = '';
    if (operationsHistory.length === 0) {
        workflow.innerHTML = '<span style="color: #9ca3af; font-size: 0.85rem;">Waiting for operations...</span>';
        return;
    }

    operationsHistory.forEach((item, idx) => {
        const entry = document.createElement('div');
        entry.className = 'operation-thumb';
        if (workflowSelections.includes(idx)) entry.classList.add('selected');
        
        // Determine operation type and apply appropriate highlight
        const opText = item.operation || '';
        const isLastItem = (idx === operationsHistory.length - 1);
        
        if (isLastItem) {
            // Different colors for different operation types
            if (opText.match(/^(add|subtract|union)\(/)) {
                // Binary operations: Purple highlight
                entry.classList.add('newly-added-binary');
            } else if (opText.match(/\(/)) {
                // Primitives: Blue highlight
                entry.classList.add('newly-added-primitive');
            } else {
                // Transforms: Green highlight
                entry.classList.add('newly-added-transform');
            }
        }
        
        entry.onclick = () => onWorkflowClick(idx);

        // If operation is in function format like 'add(selected)' or 'add(W1,W2)'
        const binaryMatch = opText.match(/^(add|subtract|union)\((.*)\)$/);
        if (binaryMatch) {
            // For binary operations, show a single thumbnail of the resulting pattern
            const fn = binaryMatch[1];
            const args = binaryMatch[2].split(',').map(s => s.trim()).filter(Boolean);

            const svgWrap = document.createElement('div');
            svgWrap.className = 'thumb-svg';
            // item.pattern already holds the result pattern for this log entry
            const resultSvg = renderThumbnail(item.pattern, 4);
            resultSvg.style.width = '48px';
            resultSvg.style.height = '48px';
            svgWrap.appendChild(resultSvg);

            const label = document.createElement('div');
            label.className = 'thumb-label';
            label.textContent = `${fn}(${args.join(',')})`;

            // prepend line number badge
            const num = document.createElement('div');
            num.className = 'line-number';
            num.textContent = (idx + 1).toString();
            entry.appendChild(num);

            entry.appendChild(svgWrap);
            entry.appendChild(label);
        } else {
            const svgWrap = document.createElement('div');
            svgWrap.className = 'thumb-svg';
            // Render primitives at the same (small) scale as merged previews
            const thumbSvg = renderThumbnail(item.pattern, 4);
            thumbSvg.style.width = '48px';
            thumbSvg.style.height = '48px';
            svgWrap.style.width = '48px';
            svgWrap.style.height = '48px';
            svgWrap.appendChild(thumbSvg);

            const label = document.createElement('div');
            label.className = 'thumb-label';
            label.textContent = `${item.operation}`;

            // prepend line number badge
            const num = document.createElement('div');
            num.className = 'line-number';
            num.textContent = (idx + 1).toString();
            entry.appendChild(num);

            entry.appendChild(svgWrap);
            entry.appendChild(label);
        }

        // If this entry is selected, show selection badge with its order (1 or 2)
        const selPos = workflowSelections.indexOf(idx);
        if (selPos !== -1) {
            const badge = document.createElement('div');
            badge.className = 'selection-badge';
            badge.textContent = (selPos + 1).toString();
            entry.appendChild(badge);
        }

        workflow.appendChild(entry);
    });
    // ensure button states are synchronized with current workflow
    updateAllButtonStates();
}

function onWorkflowClick(idx) {
    // In binary mode: toggle selection for operands
    // In normal mode: load pattern and clear old selections
    
    if (pendingBinaryOp) {
        // Binary mode: select this item as operand
        toggleWorkflowSelection(idx);
        
        // Check if we have 2 selections → create preview
        if (workflowSelections.length === 2) {
            createBinaryPreview();
        }
        
        updateAllButtonStates();
    } else {
        // Normal mode: load pattern and mark as selected for transforms
        if (operationsHistory[idx] && operationsHistory[idx].pattern) {
            currentPattern = JSON.parse(JSON.stringify(operationsHistory[idx].pattern));
            renderPattern(currentPattern, 'workspace');
            
            // Mark this item as selected (for transform labeling)
            workflowSelections = [idx];
            renderWorkflow();
        }
    }
}

function toggleWorkflowSelection(idx) {
    const pos = workflowSelections.indexOf(idx);
    if (pos === -1) {
        // allow up to 2 selections, preserve click order
        if (workflowSelections.length >= 2) {
            workflowSelections.shift();
        }
        workflowSelections.push(idx);
    } else {
        // remove existing selection
        workflowSelections.splice(pos, 1);
    }
    renderWorkflow();
}

// Called when user clicks a binary op button in the bottom bar
function selectBinaryOp(op) {
    const prev = pendingBinaryOp;
    
    // Toggle: clicking the same button again cancels binary mode
    if (prev === op) {
        pendingBinaryOp = null;
        workflowSelections = [];
        clearBinaryPreview();
    } else {
        // Entering binary mode or switching to different operation
        pendingBinaryOp = op;
        
        // Clear selections when entering or switching
        workflowSelections = [];
        
        // Only clear preview if there was one, but don't reset pendingBinaryOp
        previewPattern = null;
        previewBackupPattern = null;
        const modal = document.getElementById('binaryPreviewModal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    }
    
    renderWorkflow();
    updateAllButtonStates();
}

// Unified button state management for intuitive interaction
function updateAllButtonStates() {
    const isBinaryMode = (pendingBinaryOp !== null);
    const workflowCount = operationsHistory.length;
    const selectionCount = workflowSelections.length;
    
    // === PRIMITIVE BUTTONS ===
    // Only enabled in binary mode
    const prims = document.querySelectorAll('.primitive-btn');
    prims.forEach(b => {
        if (isBinaryMode) {
            // Binary mode: primitives can be used as operands
            b.classList.remove('disabled');
            b.classList.add('enabled');
            b.title = 'Create a pattern to use in binary operation';
        } else {
            // Normal mode: primitives are disabled
            b.classList.add('disabled');
            b.classList.remove('enabled');
            b.title = 'Select a binary operation first to use primitives';
        }
    });
    
    // === TRANSFORM BUTTONS ===
    // Disabled in binary mode (to avoid confusion)
    const transforms = document.querySelectorAll('.transform-btn:not(.binary-btn)');
    transforms.forEach(b => {
        if (isBinaryMode) {
            b.classList.add('disabled');
            b.classList.remove('enabled');
            b.title = 'Not available in binary mode - cancel binary operation first';
        } else if (currentPattern) {
            b.classList.remove('disabled');
            b.classList.add('enabled');
            b.title = b.getAttribute('data-original-title') || '';
        } else {
            b.classList.add('disabled');
            b.classList.remove('enabled');
            b.title = 'Create a pattern first';
        }
    });
    
    // === BINARY BUTTONS ===
    // Always enabled - user can decide to do binary operations at any time
    const bins = ['add','subtract','union'];
    bins.forEach(name => {
        const btn = document.getElementById('bin-' + name);
        if (!btn) return;
        
        // Visual state: selected or not
        if (pendingBinaryOp === name) {
            btn.classList.add('selected');
            btn.classList.remove('disabled');
            btn.classList.add('enabled');
        } else {
            btn.classList.remove('selected');
            btn.classList.remove('disabled');
            btn.classList.add('enabled');
        }
    });
    
    // === STATUS BAR & HINT TEXT ===
    const hint = document.getElementById('workflowHint');
    const statusBar = document.getElementById('binaryStatusBar');
    const statusText = document.getElementById('binaryStatusText');
    
    if (isBinaryMode) {
        // Show status bar in binary mode
        if (statusBar) statusBar.style.display = 'block';
        
        const opNames = { add: 'ADD (OR)', subtract: 'SUBTRACT', union: 'UNION (AND)' };
        const opName = opNames[pendingBinaryOp];
        
        if (selectionCount === 0) {
            if (workflowCount === 0) {
                // Empty workflow - encourage creating patterns
                if (statusText) statusText.textContent = `🎯 ${opName} mode - Create 2 patterns using primitive buttons (0/2 selected)`;
                if (hint) hint.textContent = 'Click primitive buttons to create patterns for this operation';
            } else {
                // Has workflow items
                if (statusText) statusText.textContent = `🎯 ${opName} mode - Select 2 patterns from workflow OR create new patterns (0/2 selected)`;
                if (hint) hint.textContent = 'Click workflow items or primitive buttons to select patterns';
            }
        } else if (selectionCount === 1) {
            if (statusText) statusText.textContent = `🎯 ${opName} mode - Select 1 more pattern (1/2 selected)`;
            if (hint) hint.textContent = 'Click another workflow item or create a new primitive';
        } else if (selectionCount >= 2) {
            if (statusText) statusText.textContent = `✅ ${opName} - Preview ready! Press Enter to confirm or Esc to cancel`;
            if (hint) hint.textContent = 'Review the preview modal and confirm or cancel the operation';
        }
    } else {
        // Hide status bar in normal mode
        if (statusBar) statusBar.style.display = 'none';
        
        if (hint) {
            if (workflowCount === 0) {
                hint.textContent = '💡 Click a binary operation (add/subtract/union) to begin';
            } else if (workflowCount === 1) {
                hint.textContent = '💡 Click a binary operation to combine patterns, or select a workflow item to view it';
            } else {
                hint.textContent = '💡 Click workflow items to view them, or use binary operations to combine patterns';
            }
        }
    }
}

function applySelectedBinary() {
    // Confirm handler should route here: if a previewPattern exists, commit it
    if (!previewPattern) {
        alert('No preview available to confirm');
        return;
    }
    // commit preview to history
    currentPattern = JSON.parse(JSON.stringify(previewPattern));
    renderPattern(currentPattern, 'workspace');

    function operandLabel(opnd) {
        if (!opnd) return 'workspace';
        const found = operationsHistory.findIndex(e => JSON.stringify(e.pattern) === JSON.stringify(opnd));
        if (found >= 0) return `${found+1}`;
        return 'workspace';
    }

    // determine operands again for labeling (they were stored on preview)
    const a = previewBackupPattern && previewBackupPattern.operands ? previewBackupPattern.operands.a : null;
    const b = previewBackupPattern && previewBackupPattern.operands ? previewBackupPattern.operands.b : null;
    const labelA = operandLabel(a);
    const labelB = operandLabel(b);

    addOperation(`${pendingBinaryOp}(${labelA},${labelB})`);
    
    // Clear selections - don't auto-select the result
    workflowSelections = [];

    // clear preview state and exit binary mode
    clearBinaryPreview();
    renderWorkflow();
}

function createBinaryPreview() {
    // New workflow: require exactly 2 selections from workflow
    if (workflowSelections.length !== 2) {
        return; // Must have exactly 2 patterns selected
    }
    
    // compute operands from the two selected workflow items
    let a = operationsHistory[workflowSelections[0]].pattern;
    let b = operationsHistory[workflowSelections[1]].pattern;
    
    if (!a || !b) {
        return; // Not enough operands yet
    }
    
    const func = transDSL[pendingBinaryOp];
    if (!func) {
        alert('Unknown binary operation');
        return;
    }
    
    // backup current pattern so cancel can restore
    previewBackupPattern = { 
        pattern: JSON.parse(JSON.stringify(currentPattern)), 
        operands: { a: JSON.parse(JSON.stringify(a)), b: JSON.parse(JSON.stringify(b)) } 
    };
    
    previewPattern = func(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)));
    
    // Show preview in modal overlay
    const modal = document.getElementById('binaryPreviewModal');
    const operand1 = document.getElementById('previewOperand1');
    const operand2 = document.getElementById('previewOperand2');
    const result = document.getElementById('previewResult');
    const operatorSymbol = document.getElementById('previewOperatorSymbol');
    
    if (modal && operand1 && operand2 && result) {
        // Clear previous content
        operand1.innerHTML = '';
        operand2.innerHTML = '';
        result.innerHTML = '';
        
        // Render operands and result
        renderPattern(a, 'previewOperand1');
        renderPattern(b, 'previewOperand2');
        renderPattern(previewPattern, 'previewResult');
        
        // Set operator symbol
        const opSymbols = { add: '+', subtract: '−', union: '∩' };
        operatorSymbol.textContent = opSymbols[pendingBinaryOp] || '+';
        
        // Show modal
        modal.style.display = 'flex';
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
    }
}

function clearBinaryPreview() {
    previewPattern = null;
    previewBackupPattern = null;
    
    // Hide modal
    const modal = document.getElementById('binaryPreviewModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
    
    // restore workspace to last committed pattern if available
    if (operationsHistory.length > 0) {
        currentPattern = operationsHistory[operationsHistory.length - 1].pattern;
        renderPattern(currentPattern, 'workspace');
    } else {
        currentPattern = geomDSL.blank();
        renderPattern(currentPattern, 'workspace');
    }
    
    // Clear pending operation AND selections
    pendingBinaryOp = null;
    workflowSelections = [];
    
    updateAllButtonStates();
}

function confirmBinaryPreview() {
    applySelectedBinary();
}

function cancelBinaryPreview() {
    // revert workspace to backup
    if (previewBackupPattern && previewBackupPattern.pattern) {
        currentPattern = previewBackupPattern.pattern;
        renderPattern(currentPattern, 'workspace');
    }
    // clear preview state and pending op
    clearBinaryPreview();
    // keep workflow selections as they were (so user can reattempt)
}

function undoLast() {
    if (operationsHistory.length > 0) {
        operationsHistory.pop();
        // Clear workflow selections that reference removed items
        workflowSelections = workflowSelections.filter(idx => idx < operationsHistory.length);
        
        if (operationsHistory.length > 0) {
            currentPattern = operationsHistory[operationsHistory.length - 1].pattern;
            renderPattern(currentPattern, 'workspace');
        } else {
            currentPattern = geomDSL.blank();
            renderPattern(currentPattern, 'workspace');
        }
        updateOperationsLog();
        renderWorkflow();
        updateAllButtonStates();
    }
}

function resetWorkspace() {
    currentPattern = geomDSL.blank();
    renderPattern(currentPattern, 'workspace');
    operationsHistory = [];
    workflowSelections = [];
    pendingBinaryOp = null;
    updateOperationsLog();
    renderWorkflow();
    updateAllButtonStates();
    const resultMsg = document.getElementById('resultMessage');
    if (resultMsg) {
        resultMsg.textContent = '';
        resultMsg.className = 'result-message';
    }
    const nextBtn = document.getElementById('nextBtn');
    if (nextBtn) nextBtn.disabled = true;
    // reflect strict gating state after reset
    updateAllButtonStates();
}

function submitAnswer() {
    if (!currentPattern) {
        alert('Please create a pattern first');
        return;
    }
    
    const match = JSON.stringify(currentPattern) === JSON.stringify(targetPattern);
    
    // Record trial data
    if (currentTrialRecord) {
        currentTrialRecord.operations = operationsHistory.map(h => h.operation);
        currentTrialRecord.stepsCount = operationsHistory.length;
        currentTrialRecord.timeSpent = Date.now() - trialStartTime;
        currentTrialRecord.success = match;
        currentTrialRecord.submitted = true;
    }
    
    // Show centered modal feedback
    const modal = document.getElementById('feedbackModal');
    const icon = document.getElementById('feedbackIcon');
    const message = document.getElementById('feedbackMessage');
    
    if (match) {
        icon.textContent = '✓';
        icon.className = 'feedback-icon success';
        message.textContent = `Correct! Pattern matches.\nUsed ${operationsHistory.length} operations.`;
    } else {
        icon.textContent = '✗';
        icon.className = 'feedback-icon error';
        message.textContent = 'Not quite right.\nPattern does not match.';
    }
    
    modal.classList.add('show');
    
    // Auto-advance to next trial after showing message
    setTimeout(() => {
        modal.classList.remove('show');
        if (currentTestIndex < getTotalTrials() - 1) {
            const nextIndex = currentTestIndex + 1;
            resetWorkspace();
            loadTrial(nextIndex);
        } else {
            document.getElementById('completionModal').style.display = 'flex';
        }
    }, 2000); // 2 seconds to read the message
}

function skipTrial() {
    if (confirm('Are you sure you want to skip this problem?')) {
        const actualIndex = testOrder[currentTestIndex];
        if (currentTrialRecord) {
            currentTrialRecord.operations = operationsHistory.map(h => h.operation);
            currentTrialRecord.stepsCount = operationsHistory.length;
            currentTrialRecord.timeSpent = Date.now() - trialStartTime;
            currentTrialRecord.success = false;
            currentTrialRecord.skipped = true;
        } else {
            // fallback: push a minimal record
            allTrialsData.push({
                trial: currentTestIndex + 1,
                actualProblemIndex: actualIndex,
                testName: testCases[actualIndex].name,
                operations: operationsHistory.map(h => h.operation),
                steps: operationsHistory.length,
                timeSpent: Date.now() - trialStartTime,
                success: false,
                skipped: true
            });
        }
        
        if (currentTestIndex < getTotalTrials() - 1) {
            const nextIndex = currentTestIndex + 1;
            resetWorkspace();
            loadTrial(nextIndex);
        } else {
            document.getElementById('completionModal').style.display = 'flex';
        }
    }
}

function nextTrial() {
    if (currentTestIndex < getTotalTrials() - 1) {
        currentTestIndex++;
        // clear workflow/log then load next trial
        resetWorkspace();
        loadTrial(currentTestIndex);
    } else {
        document.getElementById('completionModal').style.display = 'flex';
    }
}

function downloadResults() {
    const completedCount = allTrialsData.filter(t => t && typeof t === 'object' && t.success).length;
    const data = {
        experimentDate: new Date().toISOString(),
        totalTrials: 18,
        completedTrials: completedCount,
        randomized: shouldRandomize,
        trials: allTrialsData
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pattern_dsl_experiment_${Date.now()}.json`;
    a.click();
}

// Run on initial load: default-select add and update UI
document.addEventListener('DOMContentLoaded', () => {
    // Initialize primitive button icons with actual pattern graphics
    initializePrimitiveIcons();
    
    pendingBinaryOp = null;
    updateAllButtonStates();
    // attach double-click handlers to primitive buttons for quick commit (double-click still commits immediately)
    document.querySelectorAll('.primitive-btn[data-op]').forEach(btn => {
        btn.addEventListener('dblclick', (e) => {
            const op = btn.getAttribute('data-op');
            currentPattern = geomDSL[op]();
            renderPattern(currentPattern, 'workspace');
            addOperation(op + '()');
            const newIndex = operationsHistory.length - 1;
            if (workflowSelections.length >= 2) workflowSelections.shift();
            workflowSelections.push(newIndex);
            renderWorkflow();
        });
    });
    // double-click on binary buttons to attempt immediate apply when enabled
    document.querySelectorAll('.binary-btn[data-op]').forEach(btn => {
        btn.addEventListener('dblclick', (e) => {
            if (btn.classList.contains('disabled')) return;
            const op = btn.getAttribute('data-op');
            // trigger select -> preview flow rather than immediate commit
            selectBinaryOp(op);
        });
    });

    // Keyboard shortcuts: Enter = Confirm preview, Esc = Cancel preview
    document.addEventListener('keydown', (e) => {
        if (!previewPattern) return; // only active during a preview
        if (e.key === 'Enter') {
            e.preventDefault();
            confirmBinaryPreview();
        } else if (e.key === 'Escape' || e.key === 'Esc') {
            e.preventDefault();
            cancelBinaryPreview();
        }
    });
});
