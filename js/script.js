const SIZE = 10;
const CELL_SIZE = 40;
let currentTestIndex = 0;
let currentPattern = null;
let targetPattern = null;
let operationsHistory = [];
let workflowSelections = []; // indices of selected workflow items
let pendingBinaryOp = null; // e.g. 'add', 'subtract', 'union'
let binaryBuffer = null;
let binaryOperation = null;
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
    svg.setAttribute("width", width);
    svg.setAttribute("height", height);
    svg.style.border = "3px solid #000";
    
    for (let i = 0; i <= SIZE; i++) {
        const vline = document.createElementNS("http://www.w3.org/2000/svg", "line");
        vline.setAttribute("x1", i * CELL_SIZE);
        vline.setAttribute("y1", 0);
        vline.setAttribute("x2", i * CELL_SIZE);
        vline.setAttribute("y2", height);
        vline.setAttribute("stroke", "#9ca3af");
        vline.setAttribute("stroke-width", "1");
        svg.appendChild(vline);
        
        const hline = document.createElementNS("http://www.w3.org/2000/svg", "line");
        hline.setAttribute("x1", 0);
        hline.setAttribute("y1", i * CELL_SIZE);
        hline.setAttribute("x2", width);
        hline.setAttribute("y2", i * CELL_SIZE);
        hline.setAttribute("stroke", "#9ca3af");
        hline.setAttribute("stroke-width", "1");
        svg.appendChild(hline);
    }
    
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
                svg.appendChild(rect);
            }
        });
    });
    
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
    console.log('=== loadTrial called with index:', index);
    // ensure testOrder exists; fall back to sequential indices if not set
    if (!Array.isArray(testOrder) || testOrder.length === 0) {
        testOrder = Array.from({ length: testCases.length }, (_, i) => i);
        console.log('testOrder initialized:', testOrder.length);
    }
    const total = testOrder.length;
    // clamp index into valid range
    const clamped = Math.max(0, Math.min(index, total - 1));
    console.log('Index clamped from', index, 'to', clamped);
    // set the current test index so UI and state remain consistent
    currentTestIndex = clamped;
    console.log('currentTestIndex set to:', currentTestIndex);
    const actualIndex = testOrder[currentTestIndex];
    console.log('actualIndex from testOrder:', actualIndex);
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
    
    console.log('Calling updateProgressUI with:', currentTestIndex);
    updateProgressUI(currentTestIndex);
    console.log('=== loadTrial completed');
}

// Helper: update progress UI elements consistently from one place
function updateProgressUI(index) {
    console.log('>>> updateProgressUI called with index:', index);
    const idx = index;
    const total = (Array.isArray(testOrder) && testOrder.length > 0) ? testOrder.length : testCases.length;
    console.log('>>> Total trials:', total);
    const currentEl = document.getElementById('currentTrial');
    const totalEl = document.getElementById('totalTrials');
    const targetEl = document.getElementById('targetNumber');
    const pctEl = document.getElementById('percentComplete');
    const fillEl = document.getElementById('progressFill');
    
    console.log('>>> DOM elements found:', {
        currentEl: !!currentEl,
        totalEl: !!totalEl,
        targetEl: !!targetEl, 
        pctEl: !!pctEl,
        fillEl: !!fillEl
    });
    
    if (currentEl) {
        currentEl.textContent = idx + 1;
        console.log('>>> Updated currentTrial to:', idx + 1);
    }
    if (totalEl) {
        totalEl.textContent = total;
        console.log('>>> Updated totalTrials to:', total);
    }
    if (targetEl) {
        targetEl.textContent = idx + 1;
        console.log('>>> Updated targetNumber to:', idx + 1);
    }
    if (pctEl) {
        const pct = Math.round(((idx + 1) / total) * 100) + '%';
        pctEl.textContent = pct;
        console.log('>>> Updated percentComplete to:', pct);
    }
    if (fillEl) {
        const width = ((idx + 1) / total * 100) + '%';
        fillEl.style.width = width;
        console.log('>>> Updated progressFill width to:', width);
    }
}

function getTotalTrials() {
    return (Array.isArray(testOrder) && testOrder.length > 0) ? testOrder.length : testCases.length;
}

function applyPrimitive(name) {
    // create and commit primitive immediately
    currentPattern = geomDSL[name]();
    renderPattern(currentPattern, 'workspace');
    addOperation(name + '()');
    // auto-select the newly added operation (keep at most 2 selections, preserve order)
    const newIndex = operationsHistory.length - 1;
    if (workflowSelections.length >= 2) workflowSelections.shift();
    workflowSelections.push(newIndex);
    renderWorkflow();
}

function applyTransform(name) {
    if (!currentPattern) {
        alert('Please create a pattern first');
        return;
    }
    
    // Determine what we're transforming
    let operationLabel = name + '(current)';
    
    // If user has selected a workflow step, indicate which step number
    if (workflowSelections.length === 1) {
        const selectedIndex = workflowSelections[0];
        operationLabel = name + '(' + (selectedIndex + 1) + ')';
    }
    
    // apply transform immediately and commit
    currentPattern = transDSL[name](currentPattern);
    renderPattern(currentPattern, 'workspace');
    addOperation(operationLabel);
    const newIndex = operationsHistory.length - 1;
    if (workflowSelections.length >= 2) workflowSelections.shift();
    workflowSelections.push(newIndex);
    renderWorkflow();
}

function prepareBinary(op) {
    if (!currentPattern) {
        alert('Please create a pattern first');
        return;
    }
    binaryBuffer = JSON.parse(JSON.stringify(currentPattern));
    binaryOperation = op;
    document.getElementById('bufferSection').style.display = 'block';
    document.getElementById('bufferInfo').textContent = `Saved, preparing: ${op}()`;
    const applyBtn = document.getElementById('applyBinaryBtn');
    if (applyBtn) applyBtn.style.display = 'block';
}

function applyBinary() {
    if (!binaryBuffer || !binaryOperation || !currentPattern) {
        alert('Please make sure you have saved the first pattern and created the second pattern');
        return;
    }
    currentPattern = transDSL[binaryOperation](binaryBuffer, currentPattern);
    renderPattern(currentPattern, 'workspace');
    addOperation(`${binaryOperation}(buffered, current)`);
    
    binaryBuffer = null;
    binaryOperation = null;
    document.getElementById('bufferSection').style.display = 'none';
    const applyBtn2 = document.getElementById('applyBinaryBtn');
    if (applyBtn2) applyBtn2.style.display = 'none';
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
    updateBinaryButtonStates();
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
    entry.onclick = () => onWorkflowClick(idx);

        // If operation is in function format like 'add(selected)' or 'add(W1,W2)'
        const opText = item.operation || '';
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
    updateBinaryButtonStates();
}

function onWorkflowClick(idx) {
    // Toggle selection as before
    toggleWorkflowSelection(idx);
    // If no preview is active, show the clicked pattern in the workspace
    if (!previewPattern && operationsHistory[idx] && operationsHistory[idx].pattern) {
        currentPattern = JSON.parse(JSON.stringify(operationsHistory[idx].pattern));
        renderPattern(currentPattern, 'workspace');
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
    // toggle selection
    const prev = pendingBinaryOp;
    pendingBinaryOp = (prev === op) ? null : op;
    updateBinaryButtonStates();
    // If operands are present, compute a preview and show Confirm/Cancel
    const canPreview = (workflowSelections.length === 2) || (workflowSelections.length === 1 && currentPattern);
    if (pendingBinaryOp && canPreview) {
        createBinaryPreview();
        return;
    }
    if (!pendingBinaryOp) {
        // user toggled off
        clearBinaryPreview();
        return;
    }
    // if we get here, inform user how to select operands
    alert('请选择两个工作流项（或一个工作流项并在工作区中创建第二个图形），然后再次点击二元操作以生成预览。');
}

// Update binary button visuals and primitive button enabled/disabled states
function updateBinaryButtonStates() {
    const bins = ['add','subtract','union'];
    bins.forEach(name => {
        const btn = document.getElementById('bin-' + name);
        if (!btn) return;
        if (pendingBinaryOp === name) {
            btn.classList.add('selected');
            btn.classList.remove('disabled');
        } else {
            btn.classList.remove('selected');
        }
    });

    // Primitive buttons: always enabled so participants can create steps
    const prims = document.querySelectorAll('.primitive-btn');
    prims.forEach(b => {
        b.classList.remove('disabled');
        b.classList.add('enabled');
    });

    // Strict gating: binary buttons enabled only when exactly two workflow items are selected
    const binsEls = document.querySelectorAll('.binary-btn');
    const enabled = (workflowSelections.length === 2);
    binsEls.forEach(b => {
        if (enabled) {
            b.classList.remove('disabled');
        } else {
            b.classList.add('disabled');
            b.classList.remove('selected');
            // also clear pendingBinaryOp if gating disables
            pendingBinaryOp = null;
        }
    });

    // Update workflow hint text
    const hint = document.getElementById('workflowHint');
    if (hint) {
        if (workflowSelections.length === 0) hint.textContent = 'Select two steps in the workflow to enable binary operations (clicking a primitive will generate and select the corresponding step in the workflow)';
        else if (workflowSelections.length === 1) hint.textContent = '1 selected, select 1 more to enable binary operations';
        else hint.textContent = '2 selected — you can now click add/subtract/union';
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
    const newIndex = operationsHistory.length - 1;
    // auto-select the newly appended result
    workflowSelections = [newIndex];

    // clear preview state
    clearBinaryPreview();
    renderWorkflow();
}

function createBinaryPreview() {
    // compute operands
    let a = null; let b = null;
    if (workflowSelections.length === 2) {
        a = operationsHistory[workflowSelections[0]].pattern;
        b = operationsHistory[workflowSelections[1]].pattern;
    } else if (workflowSelections.length === 1 && currentPattern) {
        a = operationsHistory[workflowSelections[0]].pattern;
        b = currentPattern;
    }
    const func = transDSL[pendingBinaryOp];
    if (!func) {
        alert('Unknown binary operation');
        return;
    }
    // backup current pattern so cancel can restore
    previewBackupPattern = { pattern: JSON.parse(JSON.stringify(currentPattern)), operands: { a: JSON.parse(JSON.stringify(a)), b: JSON.parse(JSON.stringify(b)) } };
    previewPattern = func(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)));
    // render preview but do not add to history
    renderPattern(previewPattern, 'workspace');
    // show confirm/cancel panel below workspace
    const panel = document.getElementById('binaryPreviewPanel');
    if (panel) panel.style.display = 'block';
    // Add a CSS class to subtly indicate preview mode on the workspace section
    const wsSection = document.querySelector('.workspace-section');
    if (wsSection) wsSection.classList.add('workspace-preview-active');
}

function clearBinaryPreview() {
    previewPattern = null;
    previewBackupPattern = null;
    const panel = document.getElementById('binaryPreviewPanel');
    if (panel) panel.style.display = 'none';
    const wsSection2 = document.querySelector('.workspace-section');
    if (wsSection2) wsSection2.classList.remove('workspace-preview-active');
    // restore workspace to last committed pattern if available
    if (operationsHistory.length > 0) {
        currentPattern = operationsHistory[operationsHistory.length - 1].pattern;
        renderPattern(currentPattern, 'workspace');
    } else {
        currentPattern = geomDSL.blank();
        renderPattern(currentPattern, 'workspace');
    }
    // clear pending op but keep selections
    pendingBinaryOp = null;
    updateBinaryButtonStates();
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
// confirm/cancel removed; operations commit immediately

function removeOperation(idx) {
    operationsHistory.splice(idx, 1);
    if (operationsHistory.length > 0) {
        currentPattern = operationsHistory[operationsHistory.length - 1].pattern;
        renderPattern(currentPattern, 'workspace');
    } else {
        currentPattern = null;
        document.getElementById('workspace').innerHTML = '';
    }
    updateOperationsLog();
}

function undoLast() {
    console.log('undoLast called, current operations:', operationsHistory.length);
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
        updateBinaryButtonStates();
        console.log('Undo complete, remaining operations:', operationsHistory.length);
    } else {
        console.log('Nothing to undo');
    }
}

function resetWorkspace() {
    console.log('resetWorkspace called - clearing ALL operations');
    currentPattern = geomDSL.blank();
    renderPattern(currentPattern, 'workspace');
    operationsHistory = [];
    binaryBuffer = null;
    binaryOperation = null;
    const bufferSection = document.getElementById('bufferSection');
    if (bufferSection) bufferSection.style.display = 'none';
    const applyBinaryBtn = document.getElementById('applyBinaryBtn');
    if (applyBinaryBtn) applyBinaryBtn.style.display = 'none';
    workflowSelections = [];
    pendingBinaryOp = null;
    updateOperationsLog();
    renderWorkflow();
    updateBinaryButtonStates();
    const resultMsg = document.getElementById('resultMessage');
    if (resultMsg) {
        resultMsg.textContent = '';
        resultMsg.className = 'result-message';
    }
    const nextBtn = document.getElementById('nextBtn');
    if (nextBtn) nextBtn.disabled = true;
    // reflect strict gating state after reset
    updateBinaryButtonStates();
    console.log('resetWorkspace completed - all operations cleared');
}

function submitAnswer() {
    console.log('submitAnswer called');
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
        console.log('Pattern matched correctly');
    } else {
        icon.textContent = '✗';
        icon.className = 'feedback-icon error';
        message.textContent = 'Not quite right.\nPattern does not match.';
        console.log('Pattern did not match');
    }
    
    modal.classList.add('show');
    
    // Auto-advance to next trial after showing message
    setTimeout(() => {
        modal.classList.remove('show');
        console.log('Auto-advancing to next trial after submit');
        if (currentTestIndex < getTotalTrials() - 1) {
            const nextIndex = currentTestIndex + 1;
            resetWorkspace();
            loadTrial(nextIndex);
        } else {
            console.log('Last trial completed, showing completion modal');
            document.getElementById('completionModal').style.display = 'flex';
        }
    }, 2000); // 2 seconds to read the message
}

function checkMatch() {
    // Keep for backward compatibility, redirect to submitAnswer
    submitAnswer();
}

function clearTrial() {
    if (confirm('Are you sure you want to clear all current operations?')) {
        resetWorkspace();
    }
}

function skipTrial() {
    console.log('skipTrial called, currentTestIndex:', currentTestIndex);
    if (confirm('Are you sure you want to skip this problem?')) {
        console.log('User confirmed skip');
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
        
        console.log('Total trials:', getTotalTrials(), 'Current:', currentTestIndex);
        if (currentTestIndex < getTotalTrials() - 1) {
            console.log('Advancing to next trial...');
            const nextIndex = currentTestIndex + 1;
            console.log('Next index will be:', nextIndex);
            resetWorkspace();
            console.log('Workspace reset, calling loadTrial...');
            loadTrial(nextIndex);
            console.log('loadTrial called with:', nextIndex);
        } else {
            console.log('Last trial, showing completion modal');
            document.getElementById('completionModal').style.display = 'flex';
        }
    } else {
        console.log('User cancelled skip');
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
    updateBinaryButtonStates();
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
