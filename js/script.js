const SIZE = 10;
const CELL_SIZE = 40;
let currentTestIndex = 0;
let currentPattern = null;
let targetPattern = null;
let operationsHistory = [];
let workflowSelections = []; // indices of selected workflow items
let pendingBinaryOp = null; // e.g. 'add', 'subtract', 'union'
let pendingUnaryOp = null; // e.g. 'invert', 'reflect_horizontal'
let previewPattern = null;
let previewBackupPattern = null;
function createInlinePreviewState() {
    return {
        op: null,
        aIndex: null,
        bIndex: null,
        aPattern: null, // temp operand from primitives (not logged)
        bPattern: null
    };
}

let inlinePreview = createInlinePreviewState();

function resetInlinePreviewState() {
    inlinePreview = createInlinePreviewState();
}

function createUnaryPreviewState() {
    return {
        op: null,
        source: null // { type: 'primitive'|'history'|'workspace', index: number|null, pattern }
    };
}

let unaryPreviewState = createUnaryPreviewState();

function resetUnaryPreviewState() {
    unaryPreviewState = createUnaryPreviewState();
}

// when true, unary mode was just entered and we must NOT auto-fill operand from selection/implicit sources
let unaryModeJustEntered = false;

function setWorkspaceGlow(isActive) {
    const workspaceEl = document.getElementById('workspace');
    if (!workspaceEl) return;
    if (isActive) {
        workspaceEl.classList.add('preview-glow');
    } else {
        workspaceEl.classList.remove('preview-glow');
    }
}

function resolveBinaryOperandSources() {
    const sources = [];

    if (inlinePreview.aPattern) {
        sources.push({ slot: 'a', type: 'primitive', pattern: inlinePreview.aPattern, index: null, origin: 'aPattern' });
    }
    if (inlinePreview.bPattern) {
        sources.push({ slot: 'b', type: 'primitive', pattern: inlinePreview.bPattern, index: null, origin: 'bPattern' });
    }
    if (typeof inlinePreview.aIndex === 'number' && operationsHistory[inlinePreview.aIndex]) {
        sources.push({ slot: 'a', type: 'history', pattern: operationsHistory[inlinePreview.aIndex].pattern, index: inlinePreview.aIndex, origin: 'aIndex' });
    }
    if (typeof inlinePreview.bIndex === 'number' && operationsHistory[inlinePreview.bIndex]) {
        sources.push({ slot: 'b', type: 'history', pattern: operationsHistory[inlinePreview.bIndex].pattern, index: inlinePreview.bIndex, origin: 'bIndex' });
    }

    workflowSelections
        // 工作流选择按点击顺序记录在数组中，保留顺序即可
        .slice()
        .forEach(idx => {
            if (typeof idx !== 'number' || !operationsHistory[idx]) return;
            const already = sources.some(src => src.type === 'history' && src.index === idx);
            if (!already) {
                sources.push({ slot: null, type: 'history', pattern: operationsHistory[idx].pattern, index: idx, origin: 'selection' });
            }
        });

    let aSource = sources.find(src => src.slot === 'a');
    let bSource = sources.find(src => src.slot === 'b');

    const remaining = sources.filter(src => src !== aSource && src !== bSource);
    if (!aSource && remaining.length) {
        aSource = remaining.shift();
    }
    if (!bSource && remaining.length) {
        bSource = remaining.shift();
    }

    // If only one operand is available, always place it in the left slot
    if (!aSource && bSource) {
        aSource = bSource;
        bSource = null;
    }

    return { aSource, bSource };
}

function resolveUnaryOperandSource() {
    if (unaryPreviewState.source) {
        return unaryPreviewState.source;
    }
    // If unary mode was just entered, don't auto-populate the operand; require explicit user action
    if (unaryModeJustEntered) {
        return null;
    }

    if (workflowSelections.length > 0) {
        const idx = workflowSelections[0];
        if (typeof idx === 'number' && operationsHistory[idx]) {
            return {
                type: 'history',
                index: idx,
                pattern: operationsHistory[idx].pattern,
                origin: 'selection'
            };
        }
    }

    const lastIdx = operationsHistory.length - 1;
    if (lastIdx >= 0 && operationsHistory[lastIdx]) {
        return {
            type: 'history',
            index: lastIdx,
            pattern: operationsHistory[lastIdx].pattern,
            origin: 'implicit-last'
        };
    }

    if (currentPattern) {
        return {
            type: 'workspace',
            index: null,
            pattern: currentPattern,
            origin: 'workspace'
        };
    }

    return {
        type: 'workspace',
        index: null,
        pattern: geomDSL.blank(),
        origin: 'workspace'
    };
}
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

function renderPattern(pattern, containerId, options = {}) {
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
    const diffMode = options.diffMode || null; // 'add' | 'subtract' | 'union'
    const basePattern = options.basePattern || null;

    const palette = {
        add: {
            base: '#265dff',        // 原有保留
            newCell: '#22c55e',     // 新增
            ghost: 'rgba(37, 99, 235, 0.18)'
        },
        subtract: {
            base: '#312e81',        // 保留下来的
            removed: '#f97316',     // 被减掉的（高亮橙）
            newCell: '#22d3ee',     // 减完又出现的新形状（少见）
            ghost: 'rgba(249, 115, 22, 0.2)'
        },
        union: {
            overlap: '#9333ea',     // A∩B
            onlyBase: '#3b82f6',    // 仅来自被选中的第一图
            onlyOther: '#facc15',   // 仅来自第二图
            ghost: 'rgba(148, 163, 184, 0.2)'
        }
    };

    pattern.forEach((row, i) => {
        row.forEach((cell, j) => {
            const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            rect.setAttribute("x", j * CELL_SIZE);
            rect.setAttribute("y", i * CELL_SIZE);
            rect.setAttribute("width", CELL_SIZE);
            rect.setAttribute("height", CELL_SIZE);
            rect.setAttribute("stroke", "#9ca3af");
            rect.setAttribute("stroke-width", "1");

            if (diffMode && basePattern) {
                const baseVal = basePattern[i]?.[j] || 0;
                if (diffMode === 'add') {
                    if (cell && baseVal) {
                        rect.setAttribute("fill", palette.add.base);
                        rect.setAttribute("fill-opacity", "0.75");
                    } else if (cell && !baseVal) {
                        rect.setAttribute("fill", palette.add.newCell);
                        rect.setAttribute("fill-opacity", "0.88");
                    } else if (!cell && baseVal) {
                        rect.setAttribute("fill", palette.add.ghost);
                    } else {
                        rect.setAttribute("fill", 'transparent');
                    }
                } else if (diffMode === 'subtract') {
                    if (baseVal && !cell) {
                        rect.setAttribute("fill", palette.subtract.removed);
                        rect.setAttribute("fill-opacity", "0.75");
                    } else if (cell && baseVal) {
                        rect.setAttribute("fill", palette.subtract.base);
                        rect.setAttribute("fill-opacity", "0.68");
                    } else if (cell && !baseVal) {
                        rect.setAttribute("fill", palette.subtract.newCell);
                        rect.setAttribute("fill-opacity", "0.88");
                    } else if (!cell && baseVal) {
                        rect.setAttribute("fill", palette.subtract.ghost);
                    } else {
                        rect.setAttribute("fill", 'transparent');
                    }
                } else if (diffMode === 'union') {
                    if (cell && baseVal) {
                        rect.setAttribute("fill", palette.union.overlap);
                        rect.setAttribute("fill-opacity", "0.85");
                    } else if (cell && !baseVal) {
                        rect.setAttribute("fill", palette.union.onlyOther);
                        rect.setAttribute("fill-opacity", "0.95");
                    } else if (!cell && baseVal) {
                        rect.setAttribute("fill", palette.union.onlyBase);
                        rect.setAttribute("fill-opacity", "0.82");
                    } else {
                        rect.setAttribute("fill", palette.union.ghost);
                    }
                }
            } else {
                if (cell) {
                    rect.setAttribute("fill", "#08306B");
                } else {
                    rect.setAttribute("fill", 'transparent');
                }
            }

            if (cell || (diffMode && basePattern && basePattern[i]?.[j])) {
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

// --- Toast helper (non-blocking notifications) ---
function ensureToastContainer() {
    let c = document.getElementById('app-toast-container');
    if (!c) {
        c = document.createElement('div');
        c.id = 'app-toast-container';
        c.style.position = 'fixed';
        c.style.right = '16px';
        c.style.bottom = '16px';
        c.style.zIndex = 9999;
        c.style.display = 'flex';
        c.style.flexDirection = 'column';
        c.style.gap = '8px';
        document.body.appendChild(c);
    }
    return c;
}

function showToast(message, type = 'info', timeout = 2500) {
    const container = ensureToastContainer();
    const toast = document.createElement('div');
    toast.className = 'app-toast app-toast-' + type;
    toast.textContent = message;
    toast.style.padding = '8px 12px';
    toast.style.borderRadius = '6px';
    toast.style.boxShadow = '0 6px 16px rgba(0,0,0,0.12)';
    toast.style.background = (type === 'error') ? '#f87171' : (type === 'warning' ? '#fbbf24' : '#111827');
    toast.style.color = '#fff';
    toast.style.fontSize = '13px';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(6px)';
    toast.style.transition = 'opacity 180ms ease, transform 180ms ease';
    container.appendChild(toast);
    // trigger enter
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    });
    // remove after timeout
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(6px)';
        setTimeout(() => container.removeChild(toast), 220);
    }, timeout);
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
    renderPattern(currentPattern, 'workspace', {
        diffMode: pendingBinaryOp,
        basePattern: previewBackupPattern?.pattern
    });
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
    // Primitives provide operands for pending operations (binary or unary)
    if (!pendingBinaryOp && !pendingUnaryOp) {
        showToast('⚠️ Please select an operation (binary or unary) before choosing a primitive.', 'warning');
        return;
    }

    const pat = geomDSL[name]();

    if (pendingBinaryOp) {
        const { aSource, bSource } = resolveBinaryOperandSources();
        // If two operands are already selected, do not replace them.
        if (aSource && bSource) {
            showToast('Two operands are already selected. Reset or confirm the current operation before adding another.', 'warning');
            return;
        }

        if (!aSource) {
            inlinePreview.aPattern = pat;
            inlinePreview.aIndex = null;
        } else if (!bSource) {
            inlinePreview.bPattern = pat;
            inlinePreview.bIndex = null;
        }
        createBinaryPreview();
    } else if (pendingUnaryOp) {
        console.debug('applyPrimitive: setting unary operand from primitive', name);
        unaryPreviewState.source = {
            type: 'primitive',
            index: null,
            pattern: pat,
            origin: 'primitive'
        };
        // explicit operand provided
        unaryModeJustEntered = false;
        workflowSelections = [];
        createUnaryPreview();
    }

    renderWorkflow();
    updateAllButtonStates();
}

function selectUnaryOp(name) {
    const wasActive = pendingUnaryOp === name;

    if (pendingBinaryOp) {
        pendingBinaryOp = null;
        previewPattern = null;
        previewBackupPattern = null;
        resetInlinePreviewState();
    }

    if (workflowSelections.length > 1) {
        workflowSelections = workflowSelections.slice(0, 1);
    }

    if (wasActive) {
        clearUnaryPreview();
        renderWorkflow();
        return;
    }

    pendingUnaryOp = name;
    resetUnaryPreviewState();
    unaryPreviewState.op = name;
    // mark that unary mode was just entered — operand must be provided explicitly
    unaryModeJustEntered = true;
    previewPattern = null;
    previewBackupPattern = null;
    setWorkspaceGlow(false);

    // createUnaryPreview will return no preview until an explicit operand is provided
    createUnaryPreview();
    renderWorkflow();
    updateAllButtonStates();
    updateInlinePreviewPanel();
}

function applyTransform(name) {
    selectUnaryOp(name);
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
        const unaryOps = new Set(['invert', 'reflect_horizontal', 'reflect_vertical', 'reflect_diag']);
        const isUnary = item.opFn && unaryOps.has(item.opFn);
        if (binaryMatch) {
            // 表达式渲染：结果缩略图 + 灰底表达式 token（op( A , B )）
            const fn = binaryMatch[1];
            const svgWrap = document.createElement('div');
            svgWrap.className = 'thumb-svg';
            const resultSvg = renderThumbnail(item.pattern, 4);
            resultSvg.style.width = '48px';
            resultSvg.style.height = '48px';
            svgWrap.appendChild(resultSvg);
            svgWrap.addEventListener('click', (e) => {
                if (pendingBinaryOp) {
                    return; // allow parent click handler to handle selection
                }
                e.stopPropagation();
                currentPattern = JSON.parse(JSON.stringify(item.pattern));
                renderPattern(currentPattern, 'workspace');
            });

            // 表达式 token 区
            const expr = document.createElement('div');
            expr.className = 'program-expr';
            const opTok = document.createElement('span');
            opTok.className = 'program-expr-op';
            opTok.textContent = fn + '(';
            expr.appendChild(opTok);
            // A operand thumb
            const aTok = document.createElement('span');
            aTok.className = 'program-expr-thumb';
            const aSvg = renderThumbnail(item.operands?.a || item.pattern, 3.5);
            aSvg.style.width = '36px';
            aSvg.style.height = '36px';
            aTok.appendChild(aSvg);
            expr.appendChild(aTok);
            const comma = document.createElement('span');
            comma.className = 'program-expr-comma';
            comma.textContent = ', ';
            expr.appendChild(comma);
            // B operand thumb
            const bTok = document.createElement('span');
            bTok.className = 'program-expr-thumb';
            const bSvg = renderThumbnail(item.operands?.b || item.pattern, 3.5);
            bSvg.style.width = '36px';
            bSvg.style.height = '36px';
            bTok.appendChild(bSvg);
            expr.appendChild(bTok);
            const closeTok = document.createElement('span');
            closeTok.className = 'program-expr-close';
            closeTok.textContent = ')';
            expr.appendChild(closeTok);

            // prepend line number
            const num = document.createElement('div');
            num.className = 'line-number';
            num.textContent = (idx + 1).toString();
            entry.appendChild(num);
            entry.appendChild(svgWrap);
            entry.appendChild(expr);
        } else if (isUnary) {
            const svgWrap = document.createElement('div');
            svgWrap.className = 'thumb-svg';
            const resultSvg = renderThumbnail(item.pattern, 4);
            resultSvg.style.width = '48px';
            resultSvg.style.height = '48px';
            svgWrap.appendChild(resultSvg);
            svgWrap.addEventListener('click', (e) => {
                if (pendingBinaryOp) return;
                e.stopPropagation();
                currentPattern = JSON.parse(JSON.stringify(item.pattern));
                renderPattern(currentPattern, 'workspace');
            });

            const expr = document.createElement('div');
            expr.className = 'program-expr';
            const opTok = document.createElement('span');
            opTok.className = 'program-expr-op';
            opTok.textContent = item.opFn + '(';
            expr.appendChild(opTok);

            const operandTok = document.createElement('span');
            operandTok.className = 'program-expr-thumb';
            const operandPattern = item.operands?.input || item.pattern;
            const operandSvg = renderThumbnail(operandPattern, 3.5);
            operandSvg.style.width = '36px';
            operandSvg.style.height = '36px';
            operandTok.appendChild(operandSvg);
            expr.appendChild(operandTok);

            const labelInside = opText.match(/^[^\(]+\((.*)\)$/);
            const labelText = labelInside ? labelInside[1] : '';
            if (labelText && labelText.trim().length > 0 && labelText !== '•') {
                const labelSpan = document.createElement('span');
                labelSpan.className = 'program-expr-label';
                labelSpan.textContent = labelText;
                expr.appendChild(labelSpan);
            }

            const closeTok = document.createElement('span');
            closeTok.className = 'program-expr-close';
            closeTok.textContent = ')';
            expr.appendChild(closeTok);

            const num = document.createElement('div');
            num.className = 'line-number';
            num.textContent = (idx + 1).toString();
            entry.appendChild(num);
            entry.appendChild(svgWrap);
            entry.appendChild(expr);
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
            // Clicking thumbnail loads this pattern into workspace (does not toggle selection)
            svgWrap.addEventListener('click', (e) => {
                if (pendingBinaryOp) {
                    return; // let parent entry handle selection toggling
                }
                e.stopPropagation();
                currentPattern = JSON.parse(JSON.stringify(item.pattern));
                renderPattern(currentPattern, 'workspace');
            });

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
    // also refresh inline preview UI state
    updateInlinePreviewPanel();
}

function onWorkflowClick(idx) {
    // In binary mode: toggle selection for operands
    // In normal mode: load pattern and clear old selections
    
    if (pendingBinaryOp) {
        // Binary mode: select this item as operand
        toggleWorkflowSelection(idx);
        
        // Recompute preview using any combination of operands
        createBinaryPreview();
        
        updateAllButtonStates();
    } else if (pendingUnaryOp) {
        if (!operationsHistory[idx] || !operationsHistory[idx].pattern) {
            return;
        }
        console.debug('onWorkflowClick: setting unary operand from workflow index', idx);
        workflowSelections = [idx];
        unaryPreviewState.source = {
            type: 'history',
            index: idx,
            pattern: JSON.parse(JSON.stringify(operationsHistory[idx].pattern)),
            origin: 'selection'
        };
        // explicit operand provided
        unaryModeJustEntered = false;
        renderWorkflow();
        createUnaryPreview();
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
        if (pendingUnaryOp) {
            workflowSelections = [];
        }
        // If already have two operands in binary mode, do not replace them.
        if (pendingBinaryOp && workflowSelections.length >= 2) {
            showToast('Two operands are already selected. Reset or confirm the current operation before selecting another.', 'warning');
            return;
        }
        if (workflowSelections.length >= 2) {
            // non-binary fallback behavior: shift oldest selection
            const removed = workflowSelections.shift();
            if (inlinePreview.aIndex === removed) inlinePreview.aIndex = null;
            if (inlinePreview.bIndex === removed) inlinePreview.bIndex = null;
        }
        workflowSelections.push(idx);
    } else {
        // remove existing selection
        workflowSelections.splice(pos, 1);
        if (inlinePreview.aIndex === idx) inlinePreview.aIndex = null;
        if (inlinePreview.bIndex === idx) inlinePreview.bIndex = null;
    }
    renderWorkflow();
    updateInlinePreviewPanel();
}

// Called when user clicks a binary op button in the bottom bar
function selectBinaryOp(op) {
    const prev = pendingBinaryOp;
    
    // Toggle: clicking the same button again cancels binary mode
    if (prev === op) {
        clearBinaryPreview();
    } else {
        // Entering binary mode or switching to different operation
        pendingBinaryOp = op;
        pendingUnaryOp = null;
        resetUnaryPreviewState();
        
        // Clear selections when entering or switching
        workflowSelections = [];
        
        // Only clear preview if there was one, but don't reset pendingBinaryOp
        previewPattern = null;
        previewBackupPattern = null;
        resetInlinePreviewState();
    }
    
    renderWorkflow();
    updateAllButtonStates();
    updateInlinePreviewPanel();
}

// Unified button state management for intuitive interaction
function updateAllButtonStates() {
    const isBinaryMode = (pendingBinaryOp !== null);
    const isUnaryMode = (pendingUnaryOp !== null);
    
    // === PRIMITIVE BUTTONS ===
    // Enabled when an operation (binary or unary) is pending
    const prims = document.querySelectorAll('.primitive-btn');
    prims.forEach(b => {
        if (isBinaryMode || isUnaryMode) {
            b.classList.remove('disabled');
            b.classList.add('enabled');
            b.title = b.getAttribute('data-original-title') || 'Create a pattern to use in the current operation';
        } else {
            // Normal mode: primitives are disabled
            b.classList.add('disabled');
            b.classList.remove('enabled');
            b.title = 'Select an operation first to use primitives';
        }
    });
    
    // === UNARY BUTTONS ===
    const unaryButtons = document.querySelectorAll('.unary-btn');
    unaryButtons.forEach(btn => {
        const op = btn.getAttribute('data-op');
        if (isBinaryMode) {
            btn.classList.add('disabled');
            btn.classList.remove('enabled');
            btn.title = 'Unary operations are disabled while a binary operation is active';
        } else {
            btn.classList.remove('disabled');
            btn.classList.add('enabled');
            btn.title = btn.getAttribute('data-original-title') || '';
        }

        if (pendingUnaryOp === op) {
            btn.classList.add('selected');
        } else {
            btn.classList.remove('selected');
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
            btn.title = btn.getAttribute('data-original-title') || '';
        } else {
            btn.classList.remove('selected');
            if (isUnaryMode) {
                btn.classList.add('disabled');
                btn.classList.remove('enabled');
                btn.title = 'Binary operations are disabled while a unary operation is active';
            } else {
                btn.classList.remove('disabled');
                btn.classList.add('enabled');
                btn.title = btn.getAttribute('data-original-title') || '';
            }
        }
    });
    
    // === STATUS BAR & HINT TEXT ===
}

function applySelectedBinary() {
    // Confirm handler should route here: if a previewPattern exists, commit it
    if (!previewPattern) {
        showToast('No preview available to confirm', 'warning');
        return;
    }
    // commit preview to history
    currentPattern = JSON.parse(JSON.stringify(previewPattern));
    renderPattern(currentPattern, 'workspace');

    function operandLabel(opnd) {
        if (!opnd) return '•';
        const found = operationsHistory.findIndex(e => JSON.stringify(e.pattern) === JSON.stringify(opnd));
        if (found >= 0) return `${found+1}`;
        return '•';
    }

    // determine operands again for labeling (they were stored on preview)
    const a = previewBackupPattern && previewBackupPattern.operands ? previewBackupPattern.operands.a : null;
    const b = previewBackupPattern && previewBackupPattern.operands ? previewBackupPattern.operands.b : null;
    const labelA = operandLabel(a);
    const labelB = operandLabel(b);

    // 在 Program 中希望以“缩略图表达式”显示，因此 operation 文本保留，同时在 entry 上放置结构化字段
    const opText = `${pendingBinaryOp}(${labelA}, ${labelB})`;
    addOperation(opText);
    const last = operationsHistory[operationsHistory.length - 1];
    last.opFn = pendingBinaryOp;
    last.operands = { a: a, b: b };
    
    // Clear selections - don't auto-select the result
    workflowSelections = [];

    // clear preview state and exit binary mode
    clearBinaryPreview();
    renderWorkflow();
}

function createBinaryPreview() {
    if (!pendingBinaryOp) {
        previewPattern = null;
        previewBackupPattern = null;
        setWorkspaceGlow(false);
        updateInlinePreviewPanel();
        return;
    }

    const { aSource, bSource } = resolveBinaryOperandSources();
    const aPattern = aSource && aSource.pattern;
    const bPattern = bSource && bSource.pattern;

    if (!aPattern || !bPattern) {
        previewPattern = null;
        previewBackupPattern = null;
        const base = (operationsHistory.length > 0) ? operationsHistory[operationsHistory.length - 1].pattern : geomDSL.blank();
        currentPattern = JSON.parse(JSON.stringify(base));
        renderPattern(currentPattern, 'workspace');
        setWorkspaceGlow(false);
        updateInlinePreviewPanel();
        return;
    }

    const func = transDSL[pendingBinaryOp];
    if (!func) {
        showToast('Unknown binary operation', 'error');
        setWorkspaceGlow(false);
        return;
    }

    const base = (operationsHistory.length > 0) ? operationsHistory[operationsHistory.length - 1].pattern : geomDSL.blank();
    previewBackupPattern = {
        pattern: JSON.parse(JSON.stringify(base)),
        operands: {
            a: JSON.parse(JSON.stringify(aPattern)),
            b: JSON.parse(JSON.stringify(bPattern))
        }
    };

    inlinePreview.op = pendingBinaryOp;
    inlinePreview.aIndex = (aSource && aSource.type === 'history') ? aSource.index : null;
    inlinePreview.bIndex = (bSource && bSource.type === 'history') ? bSource.index : null;

    previewPattern = func(JSON.parse(JSON.stringify(aPattern)), JSON.parse(JSON.stringify(bPattern)));
    currentPattern = JSON.parse(JSON.stringify(previewPattern));
    renderPattern(currentPattern, 'workspace');
    setWorkspaceGlow(true);

    updateInlinePreviewPanel();
}

function createUnaryPreview() {
    if (!pendingUnaryOp) {
        previewPattern = null;
        previewBackupPattern = null;
        resetUnaryPreviewState();
        setWorkspaceGlow(false);
        updateInlinePreviewPanel();
        return;
    }

    const source = resolveUnaryOperandSource();
    if (!source || !source.pattern) {
        previewPattern = null;
        previewBackupPattern = null;
        const base = (operationsHistory.length > 0)
            ? operationsHistory[operationsHistory.length - 1].pattern
            : (currentPattern || geomDSL.blank());
        currentPattern = JSON.parse(JSON.stringify(base));
        renderPattern(currentPattern, 'workspace');
        setWorkspaceGlow(false);
        updateInlinePreviewPanel();
        return;
    }

    const func = transDSL[pendingUnaryOp];
    if (typeof func !== 'function') {
        showToast('Unknown unary operation', 'error');
        setWorkspaceGlow(false);
        return;
    }

    const base = (operationsHistory.length > 0)
        ? operationsHistory[operationsHistory.length - 1].pattern
        : (currentPattern || geomDSL.blank());

    previewBackupPattern = {
        pattern: JSON.parse(JSON.stringify(base)),
        operands: {
            input: JSON.parse(JSON.stringify(source.pattern))
        },
        mode: 'unary',
        operandSource: {
            type: source.type,
            index: source.index ?? null,
            origin: source.origin || null
        }
    };

    unaryPreviewState.op = pendingUnaryOp;
    unaryPreviewState.source = {
        type: source.type,
        index: source.index ?? null,
        pattern: JSON.parse(JSON.stringify(source.pattern)),
        origin: source.origin || null
    };

    previewPattern = func(JSON.parse(JSON.stringify(source.pattern)));
    currentPattern = JSON.parse(JSON.stringify(previewPattern));
    renderPattern(currentPattern, 'workspace');
    setWorkspaceGlow(true);
    updateInlinePreviewPanel();
}

function clearBinaryPreview() {
    previewPattern = null;
    previewBackupPattern = null;
    resetInlinePreviewState();
    resetUnaryPreviewState();
    setWorkspaceGlow(false);
    
    // restore workspace to last committed pattern if available
    const base = (operationsHistory.length > 0) ? operationsHistory[operationsHistory.length - 1].pattern : geomDSL.blank();
    currentPattern = JSON.parse(JSON.stringify(base));
    renderPattern(currentPattern, 'workspace');
    
    // Clear pending operation AND selections
    pendingBinaryOp = null;
    pendingUnaryOp = null;
    workflowSelections = [];
    
    updateAllButtonStates();
    updateInlinePreviewPanel();
}

function clearUnaryPreview() {
    previewPattern = null;
    previewBackupPattern = null;
    resetUnaryPreviewState();
    setWorkspaceGlow(false);

    const base = (operationsHistory.length > 0)
        ? operationsHistory[operationsHistory.length - 1].pattern
        : geomDSL.blank();
    currentPattern = JSON.parse(JSON.stringify(base));
    renderPattern(currentPattern, 'workspace');

    pendingUnaryOp = null;
    workflowSelections = [];

    updateAllButtonStates();
    updateInlinePreviewPanel();
}

function applySelectedUnary() {
    if (!pendingUnaryOp || !previewPattern) {
        showToast('No preview available to confirm', 'warning');
        return;
    }

    const sourceSnapshot = previewBackupPattern && previewBackupPattern.operands
        ? previewBackupPattern.operands.input
        : (unaryPreviewState.source && unaryPreviewState.source.pattern);
    const operandSourceMeta = previewBackupPattern && previewBackupPattern.operandSource
        ? previewBackupPattern.operandSource
        : (unaryPreviewState.source
            ? {
                type: unaryPreviewState.source.type,
                index: unaryPreviewState.source.index ?? null,
                origin: unaryPreviewState.source.origin || null
            }
            : null);

    currentPattern = JSON.parse(JSON.stringify(previewPattern));
    renderPattern(currentPattern, 'workspace');

    let operandLabel = '•';
    if (operandSourceMeta && typeof operandSourceMeta.index === 'number') {
        operandLabel = `${operandSourceMeta.index + 1}`;
    }

    const opText = `${pendingUnaryOp}(${operandLabel})`;
    addOperation(opText);
    const last = operationsHistory[operationsHistory.length - 1];
    last.opFn = pendingUnaryOp;
    const operandCopy = (sourceSnapshot !== undefined && sourceSnapshot !== null)
        ? JSON.parse(JSON.stringify(sourceSnapshot))
        : null;
    last.operands = { input: operandCopy };
    last.operandSource = operandSourceMeta;

    workflowSelections = [];
    clearUnaryPreview();
    renderWorkflow();
}

function confirmPendingOperation() {
    if (pendingBinaryOp) {
        applySelectedBinary();
    } else if (pendingUnaryOp) {
        applySelectedUnary();
    } else {
        showToast('Select an operation to confirm.', 'warning');
    }
}

function resetPendingOperation() {
    if (pendingBinaryOp) {
        if (previewBackupPattern && previewBackupPattern.pattern) {
            currentPattern = JSON.parse(JSON.stringify(previewBackupPattern.pattern));
            renderPattern(currentPattern, 'workspace');
        }
        pendingBinaryOp = null;
        workflowSelections = [];
        previewPattern = null;
        previewBackupPattern = null;
        resetInlinePreviewState();
        resetUnaryPreviewState();
        setWorkspaceGlow(false);
        updateAllButtonStates();
        updateInlinePreviewPanel();
        renderWorkflow();
    } else if (pendingUnaryOp) {
        if (previewBackupPattern && previewBackupPattern.pattern) {
            currentPattern = JSON.parse(JSON.stringify(previewBackupPattern.pattern));
            renderPattern(currentPattern, 'workspace');
        } else {
            const base = (operationsHistory.length > 0)
                ? operationsHistory[operationsHistory.length - 1].pattern
                : geomDSL.blank();
            currentPattern = JSON.parse(JSON.stringify(base));
            renderPattern(currentPattern, 'workspace');
        }
        pendingUnaryOp = null;
        workflowSelections = [];
        previewPattern = null;
        previewBackupPattern = null;
        resetUnaryPreviewState();
        setWorkspaceGlow(false);
        updateAllButtonStates();
        updateInlinePreviewPanel();
        renderWorkflow();
    }
}

function confirmBinaryPreview() {
    confirmPendingOperation();
}

function cancelBinaryPreview() {
    resetPendingOperation();
}

// Inline preview panel: keep UI synchronized with current binary mode state
function updateInlinePreviewPanel() {
    const panel = document.getElementById('binaryPreviewPanel');
    const header = document.querySelector('#binaryPreviewPanel .binary-preview-header');
    const title = document.getElementById('binaryPreviewTitle');
    const body = document.getElementById('binaryPreviewBody');
    const unaryBody = document.getElementById('unaryPreviewBody');
    const opLabel = document.getElementById('binaryInlineOpLabel');
    const aBox = document.getElementById('binaryOperandA');
    const bBox = document.getElementById('binaryOperandB');
    const unaryOpLabel = document.getElementById('unaryInlineOpLabel');
    const unaryOperandBox = document.getElementById('unaryOperandBox');
    const confirmBtn = document.getElementById('binaryConfirmBtn');
    const resetBtn = document.getElementById('binaryResetBtn');
    const placeholder = document.getElementById('binaryPreviewPlaceholder');
    if (!panel || !title || !confirmBtn || !resetBtn) return;

    const isBinaryMode = (pendingBinaryOp !== null);
    const isUnaryMode = (pendingUnaryOp !== null);
    const hasMode = isBinaryMode || isUnaryMode;

    if (placeholder) {
        if (hasMode) {
            placeholder.style.display = 'none';
        } else {
            placeholder.style.display = 'block';
            placeholder.textContent = 'Select an operation to get started';
        }
    }

    if (body) body.style.display = isBinaryMode ? 'flex' : 'none';
    if (unaryBody) unaryBody.style.display = isUnaryMode ? 'flex' : 'none';

    resetBtn.disabled = !hasMode;
    confirmBtn.disabled = true;

    if (!hasMode) {
        if (aBox) aBox.innerHTML = '';
        if (bBox) bBox.innerHTML = '';
        if (unaryOperandBox) unaryOperandBox.innerHTML = '';
        if (opLabel) opLabel.textContent = 'add(';
        if (unaryOpLabel) unaryOpLabel.textContent = '';
        title.textContent = '';
        if (header) header.classList.add('is-hidden');
        setWorkspaceGlow(false);
        return;
    }

    if (isBinaryMode) {
        const { aSource, bSource } = resolveBinaryOperandSources();
        const opMessages = {
            add: {
                label: 'ADD',
                hint: 'ADD – combine two patterns and keep all filled cells.'
            },
            subtract: {
                label: 'SUBTRACT',
                hint: 'SUBTRACT – choose a base pattern, then remove the second.'
            },
            union: {
                label: 'UNION',
                hint: 'UNION – keep only the overlapping cells from both patterns.'
            }
        };
        const opConfig = opMessages[pendingBinaryOp] || opMessages.add;
        title.textContent = opConfig.hint;
        if (header) header.classList.toggle('is-hidden', !title.textContent.trim());
        if (opLabel) opLabel.textContent = `${pendingBinaryOp}(`;

        if (aBox) {
            aBox.innerHTML = '';
            if (aSource && aSource.pattern) {
                const svg = renderThumbnail(aSource.pattern, 4);
                svg.style.width = '48px';
                svg.style.height = '48px';
                aBox.appendChild(svg);
            }
        }

        if (bBox) {
            bBox.innerHTML = '';
            if (bSource && bSource.pattern) {
                const svg = renderThumbnail(bSource.pattern, 4);
                svg.style.width = '48px';
                svg.style.height = '48px';
                bBox.appendChild(svg);
            }
        }

        const resolvedAPattern = aSource ? aSource.pattern : null;
        const resolvedBPattern = bSource ? bSource.pattern : null;
        const canPreview = !!resolvedAPattern && !!resolvedBPattern && !!pendingBinaryOp;
        const hasPreview = canPreview && !!previewPattern;
        confirmBtn.disabled = !hasPreview;
        setWorkspaceGlow(hasPreview);
    } else if (isUnaryMode) {
        const source = resolveUnaryOperandSource();
        const unaryMessages = {
            invert: {
                label: 'INVERT',
                hint: 'INVERT – flip filled and empty cells in the selected pattern.'
            },
            reflect_horizontal: {
                label: 'FLIP H',
                hint: 'FLIP H – reflect the pattern top ↔ bottom.'
            },
            reflect_vertical: {
                label: 'FLIP V',
                hint: 'FLIP V – reflect the pattern left ↔ right.'
            },
            reflect_diag: {
                label: 'FLIP D',
                hint: 'FLIP D – reflect the pattern across the diagonal.'
            }
        };

        const config = unaryMessages[pendingUnaryOp] || { label: pendingUnaryOp, hint: 'Unary transform preview.' };
        title.textContent = config.hint;
        if (header) header.classList.toggle('is-hidden', !title.textContent.trim());
        if (unaryOpLabel) unaryOpLabel.textContent = `${pendingUnaryOp}(`;

        if (unaryOperandBox) {
            unaryOperandBox.innerHTML = '';
            if (source && source.pattern) {
                const svg = renderThumbnail(source.pattern, 4);
                svg.style.width = '48px';
                svg.style.height = '48px';
                unaryOperandBox.appendChild(svg);
            }
        }

        const hasPreview = !!previewPattern && !!(source && source.pattern);
        confirmBtn.disabled = !hasPreview;
        setWorkspaceGlow(hasPreview);
    }
}

// Reset just the current binary step: keep history, exit binary mode, and restore workspace snapshot
function resetBinaryStep() {
    resetPendingOperation();
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
    pendingUnaryOp = null;
    previewPattern = null;
    previewBackupPattern = null;
    resetInlinePreviewState();
    resetUnaryPreviewState();
    setWorkspaceGlow(false);
    updateOperationsLog();
    renderWorkflow();
    // reflect strict gating state after reset
    updateAllButtonStates();
    updateInlinePreviewPanel();
}

function submitAnswer() {
    if (!currentPattern) {
        showToast('Please create a pattern first', 'warning');
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
    pendingUnaryOp = null;
    resetInlinePreviewState();
    resetUnaryPreviewState();
    updateAllButtonStates();
    // double-click primitive = 快速填充临时操作数（不写入 Program）
    document.querySelectorAll('.primitive-btn[data-op]').forEach(btn => {
        btn.addEventListener('dblclick', (e) => {
            const op = btn.getAttribute('data-op');
            applyPrimitive(op);
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

    document.querySelectorAll('.transform-btn, .primitive-btn').forEach(btn => {
        if (!btn.getAttribute('data-original-title') && btn.title) {
            btn.setAttribute('data-original-title', btn.title);
        }
    });

    // Keyboard shortcuts: Enter = Confirm preview, Esc = Cancel preview
    document.addEventListener('keydown', (e) => {
        if (!previewPattern) return; // only active during a preview
        if (e.key === 'Enter') {
            e.preventDefault();
            confirmPendingOperation();
        } else if (e.key === 'Escape' || e.key === 'Esc') {
            e.preventDefault();
            resetPendingOperation();
        }
    });

    // Initialize inline preview panel to placeholder state
    updateInlinePreviewPanel();
});
