import {
    POINTS_MAX,
    appState,
    checkTutorialProgress,
    isTutorialMode,
    globalScope
} from './modules/state.js';
import { showToast } from './modules/toast.js';
import {
    geomDSL,
    transDSL,
    getOperationAbbreviation,
    formatOperationText,
    renderPattern,
    renderThumbnail,
    initializePrimitiveIcons
} from './modules/patterns.js';
import {
    testCases,
    shuffleArray,
    getTestCaseCount
} from './modules/testData.js';

// --- PRACTICE MODE ---
let isPracticeMode = false;
let currentPracticeExercise = 0;

// 练习题使用与正式试验相同的结构
const practiceExercises = [
    {
        name: "Practice Exercise 1",
        generate: () => [
            [0,1,1,1,1,1,1,1,1,1],
            [1,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,1],
            [1,1,1,1,1,1,1,1,1,0]
        ]
    },
    {
        name: "Practice Exercise 2",
        generate: () => [
            [0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0],
            [1,1,1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1,1,1],
            [0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0]
        ]
    }
];

// (favorites popup legacy removed)

appState.inlinePreview = createInlinePreviewState();
appState.unaryPreviewState = createUnaryPreviewState();

function updatePointsDisplay() {
    const el = document.getElementById('pointsValue');
    if (el) {
        el.textContent = String(totalPoints);
    }
    const maxEl = document.getElementById('pointsMaxValue');
    if (maxEl) {
        maxEl.textContent = String(POINTS_MAX);
    }
}

function formatPoints(value) {
    return String(value);
}

function showCompletionModal() {
    const modal = document.getElementById('completionModal');
    if (!modal) return;
    const pointsEl = document.getElementById('finalPointsValue');
    if (pointsEl) {
        pointsEl.textContent = String(totalPoints);
    }
    const maxEl = document.getElementById('finalPointsMax');
    if (maxEl) {
        maxEl.textContent = String(POINTS_MAX);
    }
    modal.style.display = 'flex';
}
// --- TUTORIAL STATE (removed) ---
// Keep minimal stubs so the rest of the code can call without effects.
// --- FAVORITES SYSTEM (persist across trials) ---
// Store snapshots, not indices, so favorites survive when operationsHistory resets between trials
// favorites: Array<{ id: string, pattern: number[][], op?: string, meta?: { opFn?: string, operands?: { a?: number[][], b?: number[][], input?: number[][] } }, createdAt: number }>

function patternsEqual(a, b) {
    if (!a || !b || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        const ra = a[i], rb = b[i];
        if (!ra || !rb || ra.length !== rb.length) return false;
        for (let j = 0; j < ra.length; j++) {
            if (ra[j] !== rb[j]) return false;
        }
    }
    return true;
}

// Calculate visual features of a pattern for cognitive analysis
function isPatternFavorited(pattern) {
    return favorites.some(f => patternsEqual(f.pattern, pattern));
}

function addFavoriteFromEntry(entry) {
    if (!entry || !entry.pattern) return;
    const pattern = entry.pattern;
    if (isPatternFavorited(pattern)) return; // no duplicates
    const id = `fav_${Date.now()}_${Math.floor(Math.random()*1000)}`;
    const snapshot = {
        id,
        pattern: JSON.parse(JSON.stringify(pattern)),
        op: entry.operation || '',
        meta: {
            opFn: entry.opFn || undefined,
            operands: entry.operands ? {
                a: entry.operands.a ? JSON.parse(JSON.stringify(entry.operands.a)) : undefined,
                b: entry.operands.b ? JSON.parse(JSON.stringify(entry.operands.b)) : undefined,
                input: entry.operands.input ? JSON.parse(JSON.stringify(entry.operands.input)) : undefined
            } : undefined
        },
        createdAt: Date.now()
    };
    favorites.push(snapshot);
    
    // Record favorite action for cognitive analysis with complete pattern data
    if (currentTrialRecord) {
        if (!currentTrialRecord.favoriteActions) {
            currentTrialRecord.favoriteActions = [];
        }
        
        currentTrialRecord.favoriteActions.push({
            action: 'add',
            favoriteId: id,
            operation: entry.operation,
            pattern: JSON.parse(JSON.stringify(pattern)), // Complete 10x10 matrix
            opFn: entry.opFn,
            operands: entry.operands ? {
                a: entry.operands.a ? JSON.parse(JSON.stringify(entry.operands.a)) : undefined,
                b: entry.operands.b ? JSON.parse(JSON.stringify(entry.operands.b)) : undefined,
                input: entry.operands.input ? JSON.parse(JSON.stringify(entry.operands.input)) : undefined
            } : undefined,
            timestamp: Date.now()
        });
    }
}

function removeFavoriteById(id) {
    // Record favorite removal for cognitive abstraction analysis
    if (currentTrialRecord) {
        if (!currentTrialRecord.favoriteActions) {
            currentTrialRecord.favoriteActions = [];
        }
        currentTrialRecord.favoriteActions.push({
            action: 'remove',
            favoriteId: id,
            timestamp: Date.now()
        });
    }
    
    favorites = favorites.filter(f => f.id !== id);
}

function toggleFavoriteFromWorkflow(idx) {
    const entry = operationsHistory[idx];
    if (!entry || !entry.pattern) return;
    if (isPatternFavorited(entry.pattern)) {
        // remove the first matching favorite by pattern
        const found = favorites.find(f => patternsEqual(f.pattern, entry.pattern));
        if (found) removeFavoriteById(found.id);
    } else {
        addFavoriteFromEntry(entry);
    }
    renderWorkflow();
    checkTutorialProgress();
}

// Helpers header '+' action: favorite the latest step if available
function addLastToFavorites() {
    if (!operationsHistory || operationsHistory.length === 0) {
        showToast('No steps yet. Perform an operation first.', 'warning');
        return;
    }
    const idx = operationsHistory.length - 1;
    const entry = operationsHistory[idx];
    if (!entry || !entry.pattern) {
        showToast('Nothing to favorite.', 'warning');
        return;
    }
    if (isPatternFavorited(entry.pattern)) {
        showToast('Already in favorites.', 'info');
        return;
    }
    addFavoriteFromEntry(entry);
    renderFavoritesShelf();
    showToast('Added latest step to helpers.', 'info');
}

function getFavoritePatterns() {
    // return shallow copy to avoid external mutation
    return favorites.slice();
}

// --- END FAVORITES SYSTEM ---
// --- FAVORITES SHELF RENDERING & CONTROLS ---
function renderFavoritesShelf() {
    const shelf = document.getElementById('favoritesShelf');
    if (!shelf) return;
    shelf.innerHTML = '';
    const list = getFavoritePatterns();
    if (list.length === 0) {
        shelf.innerHTML = '<div class="helpers-empty">Favorite a step to reuse it here.</div>';
        return;
    }

    // Render favorites as minimalist primitive-style buttons
    list.forEach(fav => {
        const { id, pattern } = fav;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'primitive-btn helper-primitive';
        btn.title = 'Use from helpers';
        const iconSpan = document.createElement('span');
        iconSpan.className = 'btn-icon';
        const icon = renderThumbnail(pattern, 3.5);
        iconSpan.appendChild(icon);
        btn.appendChild(iconSpan);
        btn.addEventListener('click', () => useFavoritePattern(id, pattern));
        btn.addEventListener('keydown', (evt) => {
            if (evt.key === 'Enter' || evt.key === ' ') {
                evt.preventDefault();
                useFavoritePattern(id, pattern);
            }
        });
        shelf.appendChild(btn);
    });
}

function useFavoritePattern(id, pattern) {
    // Find the favorite metadata for complete logging
    const favorite = favorites.find(f => f.id === id);
    
    // Record favorite usage for cognitive analysis with complete pattern data
    if (currentTrialRecord) {
        if (!currentTrialRecord.favoriteActions) {
            currentTrialRecord.favoriteActions = [];
        }
        
        const context = pendingBinaryOp ? 'binary' : (pendingUnaryOp ? 'unary' : 'none');
        
        currentTrialRecord.favoriteActions.push({
            action: 'use',
            favoriteId: id,
            context: context,
            operation: favorite ? favorite.op : undefined,
            pattern: JSON.parse(JSON.stringify(pattern)), // Complete 10x10 matrix being reused
            opFn: favorite && favorite.meta ? favorite.meta.opFn : undefined,
            operands: favorite && favorite.meta && favorite.meta.operands ? {
                a: favorite.meta.operands.a ? JSON.parse(JSON.stringify(favorite.meta.operands.a)) : undefined,
                b: favorite.meta.operands.b ? JSON.parse(JSON.stringify(favorite.meta.operands.b)) : undefined,
                input: favorite.meta.operands.input ? JSON.parse(JSON.stringify(favorite.meta.operands.input)) : undefined
            } : undefined,
            usedAs: context === 'binary' ? (inlinePreview.aPattern ? 'operandB' : 'operandA') : (context === 'unary' ? 'unaryInput' : 'unknown'),
            timestamp: Date.now()
        });
    }
    
    let filled = null;
    if (pendingBinaryOp) {
        const { aSource, bSource } = resolveBinaryOperandSources();
        if (!aSource) {
            inlinePreview.aPattern = pattern;
            inlinePreview.aIndex = null;
            inlinePreview.aFromFavorite = true; // Mark that operand A came from favorites
            filled = 'a';
        } else if (!bSource) {
            inlinePreview.bPattern = pattern;
            inlinePreview.bIndex = null;
            inlinePreview.bFromFavorite = true; // Mark that operand B came from favorites
            filled = 'b';
        } else {
            showToast('Both operands are already selected.', 'warning');
            return;
        }
        createBinaryPreview();
        renderWorkflow();
        updateAllButtonStates();
        // visual pulse on corresponding operand box and toast
        if (filled) {
            pulseOperandBox(filled);
            showToast(`Filled operand ${filled.toUpperCase()} from Favorites`, 'info', 1600);
        }
        renderFavoritesShelf();
    } else if (pendingUnaryOp) {
        unaryPreviewState.source = {
            type: 'favorite',
            index: null,
            pattern: pattern,
            origin: 'favorite'
        };
        unaryModeJustEntered = false;
        workflowSelections = [];
        createUnaryPreview();
        renderWorkflow();
        updateAllButtonStates();
        pulseOperandBox('u');
        showToast('Filled unary input from Favorites', 'info', 1600);
        renderFavoritesShelf();
    } else {
        showToast('⚠️ Please select an operation (binary or unary) before using a helper.', 'warning');
    }
    checkTutorialProgress();
    if (!pendingBinaryOp && !pendingUnaryOp) {
        renderFavoritesShelf();
    }
}

function pulseOperandBox(which) {
    let el = null;
    if (which === 'a') el = document.getElementById('binaryOperandA');
    else if (which === 'b') el = document.getElementById('binaryOperandB');
    else el = document.getElementById('unaryOperandBox');
    if (!el) return;
    const cls = which === 'a' ? 'operand-pulse-a' : which === 'b' ? 'operand-pulse-b' : 'operand-pulse-u';
    el.classList.remove('operand-pulse-a', 'operand-pulse-b', 'operand-pulse-u');
    void el.offsetWidth;
    el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), 700);
}

// --- END FAVORITES SHELF RENDERING & CONTROLS ---
function createInlinePreviewState() {
    return {
        op: null,
        aIndex: null,
        bIndex: null,
        aPattern: null, // temp operand from primitives (not logged)
        bPattern: null,
        aFromFavorite: false, // track if operand A came from favorites
        bFromFavorite: false  // track if operand B came from favorites
    };
}

function resetInlinePreviewState() {
    inlinePreview = createInlinePreviewState();
}

function createUnaryPreviewState() {
    return {
        op: null,
        source: null // { type: 'primitive'|'history'|'workspace', index: number|null, pattern }
    };
}

function resetUnaryPreviewState() {
    unaryPreviewState = createUnaryPreviewState();
}

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
// preview removed; operations commit immediately

function startExperiment() {
    allTrialsData = [];
    
    // No randomization option in task page - can be added as URL parameter if needed
    const urlParams = new URLSearchParams(window.location.search);
    const shouldRandomize = urlParams.get('randomize') === 'true';
    
    testOrder = Array.from({length: getTestCaseCount()}, (_, i) => i);
    if (shouldRandomize) {
        testOrder = shuffleArray(testOrder);
    }

    const totalTrials = testOrder.length;
    pointsPerCorrect = 1; // 1 point per correct trial
    totalPoints = 0;
    updatePointsDisplay();
    
    allTrialsData.push({
        metadata: {
            randomized: shouldRandomize,
            order: testOrder,
            pointsMax: POINTS_MAX,
            pointsPerCorrect
        }
    });
    
    loadTrial(0);
}

function loadTrial(index) {
    // ensure testOrder exists; fall back to sequential indices if not set
    if (!Array.isArray(testOrder) || testOrder.length === 0) {
        testOrder = Array.from({ length: getTestCaseCount() }, (_, i) => i);
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
        targetPattern: JSON.parse(JSON.stringify(targetPattern)), // Save target pattern for analysis
        steps: [], // will be populated by addOperation
        operations: [], // summary operation strings
        stepsCount: 0,
        timeSpent: 0,
        success: null,
        submitted: false,
        pointsEarned: 0,
        pointsAwarded: 0,
        startedAt: trialStartTime
    };
    allTrialsData.push(currentTrialRecord);
    
    updateProgressUI(currentTestIndex);

    if (!isTutorialMode()) {
        seedAddPreviewWithBlankOperand();
    }
}

// Helper: update progress UI elements consistently from one place
function updateProgressUI(index) {
    const idx = index;
    const total = (Array.isArray(testOrder) && testOrder.length > 0) ? testOrder.length : getTestCaseCount();
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
    return (Array.isArray(testOrder) && testOrder.length > 0) ? testOrder.length : getTestCaseCount();
}

// Helper function to record button clicks for cognitive analysis
function logButtonClick(buttonType, operationName, context = {}) {
    if (!currentTrialRecord) return;
    if (!currentTrialRecord.buttonClickActions) {
        currentTrialRecord.buttonClickActions = [];
    }
    currentTrialRecord.buttonClickActions.push({
        buttonType,  // 'primitive', 'transform', 'binary'
        operation: operationName,
        context,  // { currentMode, hasPreview, etc. }
        timestamp: Date.now()
    });
}

function applyPrimitive(name) {
    // Log button click for cognitive analysis
    logButtonClick('primitive', name, {
        pendingBinary: !!pendingBinaryOp,
        pendingUnary: !!pendingUnaryOp
    });

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
    checkTutorialProgress();
}

function selectUnaryOp(name) {
    // Log button click for cognitive analysis
    logButtonClick('transform', name, {
        wasActive: pendingUnaryOp === name,
        previousOp: pendingUnaryOp
    });

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
    checkTutorialProgress();
}

function applyTransform(name) {
    selectUnaryOp(name);
}

function addOperation(op, metadata = {}) {
    // default: simple operation entry
    const entry = {
        operation: op,
        pattern: JSON.parse(JSON.stringify(currentPattern)),
        timestamp: Date.now()
    };
    operationsHistory.push(entry);
    // also append a step record into the current trial record if present
    if (currentTrialRecord) {
        const now = Date.now();
        const stepEntry = {
            id: `s${now}_${Math.floor(Math.random()*1000)}`,
            operation: op,
            pattern: JSON.parse(JSON.stringify(currentPattern)),
            timestamp: now,
            intervalFromLast: 0,  // Calculate interval from last step
            // Save structured operation information for cognitive analysis
            opFn: metadata.opFn || undefined,
            operands: metadata.operands ? {
                a: metadata.operands.a ? JSON.parse(JSON.stringify(metadata.operands.a)) : undefined,
                b: metadata.operands.b ? JSON.parse(JSON.stringify(metadata.operands.b)) : undefined,
                input: metadata.operands.input ? JSON.parse(JSON.stringify(metadata.operands.input)) : undefined
            } : undefined
        };
        
        // Calculate time since last step for cognitive latency analysis
        if (currentTrialRecord.steps.length > 0) {
            const lastStep = currentTrialRecord.steps[currentTrialRecord.steps.length - 1];
            stepEntry.intervalFromLast = now - lastStep.timestamp;
        }
        
        currentTrialRecord.steps.push(stepEntry);
        currentTrialRecord.operations.push(op);
        currentTrialRecord.stepsCount = currentTrialRecord.steps.length;
    }
    updateOperationsLog();
    updateAllButtonStates();
    checkTutorialProgress();
}

function updateOperationsLog() {
    renderWorkflow();
}

// Lightweight update: only refresh selection highlights without rebuilding DOM
function updateWorkflowSelectionHighlight() {
    const workflow = document.getElementById('operationsLog');
    if (!workflow) return;
    
    const entries = workflow.querySelectorAll('.operation-thumb');
    entries.forEach((entry, idx) => {
        if (workflowSelections.includes(idx)) {
            entry.classList.add('selected');
        } else {
            entry.classList.remove('selected');
        }
        
        // Update selection badges
        const existingBadge = entry.querySelector('.selection-badge');
        if (existingBadge) {
            existingBadge.remove();
        }
        
        const selPos = workflowSelections.indexOf(idx);
        if (selPos !== -1) {
            const badge = document.createElement('div');
            badge.className = 'selection-badge';
            badge.textContent = (selPos + 1).toString();
            entry.appendChild(badge);
        }
    });
    
    updateInlinePreviewPanel();
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

        // --- FAVORITE UI: add-plus button (more visible) and favorited badge ---
        if (!isPatternFavorited(item.pattern)) {
            const favBtn = document.createElement('button');
            favBtn.className = 'favorite-btn favorite-add-btn';
            favBtn.title = 'Add to favorites';
            favBtn.textContent = '+';
            favBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleFavoriteFromWorkflow(idx);
                checkTutorialProgress();
            });
            entry.appendChild(favBtn);
        } else {
            const badge = document.createElement('div');
            badge.className = 'favorite-badge';
            badge.title = 'Favorited';
            badge.textContent = '★';
            entry.appendChild(badge);
        }
        // --- END FAVORITE UI ---

        // No automatic highlighting - only show selected items in blue
        const opText = item.operation || '';

        entry.onclick = () => onWorkflowClick(idx);

        // If operation is in function format like 'add(selected)' or 'add(W1,W2)'
        const binaryMatch = opText.match(/^(add|subtract|union)\((.*)\)$/);
        const unaryOps = new Set(['invert', 'reflect_horizontal', 'reflect_vertical', 'reflect_diag']);
        const isUnary = item.opFn && unaryOps.has(item.opFn);
        if (binaryMatch) {
            // 表达式渲染：结果缩略图 + 灰底表达式 token（op( A , B )）
            const fn = binaryMatch[1];
            const svgWrap = document.createElement('div');
            // Use preview-style operand box for result thumbnail
            svgWrap.className = 'operand-box program-result';
            const resultSvg = renderThumbnail(item.pattern, 4);
            svgWrap.appendChild(resultSvg);
            // Click on SVG should trigger the same selection logic as clicking the row

            // 表达式 token 区
            const expr = document.createElement('div');
            expr.className = 'program-expr';
            const opTok = document.createElement('span');
            opTok.className = 'program-expr-op';
            opTok.textContent = getOperationAbbreviation(fn) + '(';
            expr.appendChild(opTok);
            // A operand thumb (reuse preview operand-box style)
            const aTok = document.createElement('div');
            aTok.className = 'operand-box program-operand';
            const aSvg = renderThumbnail(item.operands?.a || item.pattern, 3.5);
            aTok.appendChild(aSvg);
            expr.appendChild(aTok);
            const comma = document.createElement('span');
            comma.className = 'program-expr-comma';
            comma.textContent = ', ';
            expr.appendChild(comma);
            // B operand thumb
            const bTok = document.createElement('div');
            bTok.className = 'operand-box program-operand';
            const bSvg = renderThumbnail(item.operands?.b || item.pattern, 3.5);
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
            svgWrap.className = 'operand-box program-result';
            const resultSvg = renderThumbnail(item.pattern, 4);
            svgWrap.appendChild(resultSvg);
            // Click on SVG should trigger the same selection logic as clicking the row

            const expr = document.createElement('div');
            expr.className = 'program-expr';
            const opTok = document.createElement('span');
            opTok.className = 'program-expr-op';
            const unaryName = item.opFn || opText.replace(/\(.*$/, '');
            opTok.textContent = getOperationAbbreviation(unaryName) + '(';
            expr.appendChild(opTok);

            const operandTok = document.createElement('div');
            operandTok.className = 'operand-box program-operand';
            const operandPattern = item.operands?.input || item.pattern;
            const operandSvg = renderThumbnail(operandPattern, 3.5);
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
            svgWrap.className = 'operand-box program-result';
            // Render primitive result using the same preview-style box
            const thumbSvg = renderThumbnail(item.pattern, 4);
            svgWrap.appendChild(thumbSvg);
            // Click on SVG should trigger the same selection logic as clicking the row

            const label = document.createElement('div');
            label.className = 'thumb-label';
            label.textContent = formatOperationText(item.operation);

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
    renderFavoritesShelf();
    checkTutorialProgress();
}

function onWorkflowClick(idx) {
    // Record workflow interaction for cognitive navigation analysis
    if (currentTrialRecord) {
        if (!currentTrialRecord.workflowActions) {
            currentTrialRecord.workflowActions = [];
        }
        currentTrialRecord.workflowActions.push({
            action: 'click',
            index: idx,
            mode: pendingBinaryOp ? 'binary' : (pendingUnaryOp ? 'unary' : 'normal'),
            timestamp: Date.now()
        });
    }
    
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
        // Optimized: only update selection state, don't rebuild entire workflow
        updateWorkflowSelectionHighlight();
        createUnaryPreview();
        // updateAllButtonStates already called in renderWorkflow via createUnaryPreview
    } else {
        // Normal mode: toggle selection - click to select, click again to deselect
        if (operationsHistory[idx] && operationsHistory[idx].pattern) {
            // Check if this item is already selected
            const isAlreadySelected = workflowSelections.length === 1 && workflowSelections[0] === idx;
            
            if (isAlreadySelected) {
                // Deselect: clear selection and clear YOUR PATTERN display
                workflowSelections = [];
                currentPattern = null;
                // Clear the workspace canvas
                const workspace = document.getElementById('workspace');
                if (workspace) workspace.innerHTML = '';
                renderWorkflow();
            } else {
                // Select: load pattern and mark as selected
                currentPattern = JSON.parse(JSON.stringify(operationsHistory[idx].pattern));
                renderPattern(currentPattern, 'workspace');
                
                // Mark this item as selected (for transform labeling)
                workflowSelections = [idx];
                renderWorkflow();
            }
        }
    }
}

function toggleWorkflowSelection(idx) {
    const pos = workflowSelections.indexOf(idx);
    const isCurrentlySelected = pos !== -1;
    
    // Check if this action will be blocked before recording
    if (isCurrentlySelected && (pendingBinaryOp || pendingUnaryOp)) {
        // In operation mode, don't allow deselecting operands - use Reset instead
        showToast('Cannot deselect operand. Use ⟲ Reset to cancel the operation.', 'warning');
        // Record the attempted (but blocked) deselect action
        if (currentTrialRecord) {
            if (!currentTrialRecord.workflowActions) {
                currentTrialRecord.workflowActions = [];
            }
            currentTrialRecord.workflowActions.push({
                action: 'deselect_blocked',
                index: idx,
                mode: pendingBinaryOp ? 'binary' : 'unary',
                currentSelections: [...workflowSelections],
                timestamp: Date.now()
            });
        }
        return;
    }
    
    // Check if selection will be blocked (too many operands)
    if (!isCurrentlySelected && pendingBinaryOp && workflowSelections.length >= 2) {
        showToast('Two operands are already selected. Use ⟲ Reset to cancel the operation.', 'warning');
        // Record the attempted (but blocked) selection
        if (currentTrialRecord) {
            if (!currentTrialRecord.workflowActions) {
                currentTrialRecord.workflowActions = [];
            }
            currentTrialRecord.workflowActions.push({
                action: 'select_blocked',
                index: idx,
                reason: 'max_operands',
                currentSelections: [...workflowSelections],
                timestamp: Date.now()
            });
        }
        return;
    }
    
    // Record the actual (successful) selection/deselection
    if (currentTrialRecord) {
        if (!currentTrialRecord.workflowActions) {
            currentTrialRecord.workflowActions = [];
        }
        currentTrialRecord.workflowActions.push({
            action: isCurrentlySelected ? 'deselect' : 'select',
            index: idx,
            currentSelections: [...workflowSelections],
            timestamp: Date.now()
        });
    }
    
    if (pos === -1) {
        // allow up to 2 selections, preserve click order
        if (pendingUnaryOp) {
            workflowSelections = [];
        }
        if (workflowSelections.length >= 2) {
            // non-binary fallback behavior: shift oldest selection
            const removed = workflowSelections.shift();
            if (inlinePreview.aIndex === removed) inlinePreview.aIndex = null;
            if (inlinePreview.bIndex === removed) inlinePreview.bIndex = null;
        }
        workflowSelections.push(idx);
    } else {
        // Normal mode: remove existing selection
        workflowSelections.splice(pos, 1);
        if (inlinePreview.aIndex === idx) inlinePreview.aIndex = null;
        if (inlinePreview.bIndex === idx) inlinePreview.bIndex = null;
    }
    renderWorkflow();
    updateInlinePreviewPanel();
}

// Called when user clicks a binary op button in the bottom bar
function selectBinaryOp(op) {
    // Log button click for cognitive analysis
    logButtonClick('binary', op, {
        wasActive: pendingBinaryOp === op,
        previousOp: pendingBinaryOp
    });

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
    checkTutorialProgress();
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
    
    // === SUBMIT BUTTON ===
    // Disable submit button when there's an unconfirmed operation
    const submitBtn = document.querySelector('.program-submit');
    if (submitBtn) {
        const hasUnconfirmedOperation = (isBinaryMode || isUnaryMode) && previewPattern !== null;
        if (hasUnconfirmedOperation) {
            submitBtn.disabled = true;
            submitBtn.title = 'Please Confirm or Reset your operation before submitting';
            submitBtn.style.opacity = '0.5';
            submitBtn.style.cursor = 'not-allowed';
        } else {
            submitBtn.disabled = false;
            submitBtn.title = 'Submit your answer';
            submitBtn.style.opacity = '1';
            submitBtn.style.cursor = 'pointer';
        }
    }
    
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
    addOperation(opText, {
        opFn: pendingBinaryOp,
        operands: { a: a, b: b }
    });
    const last = operationsHistory[operationsHistory.length - 1];
    last.opFn = pendingBinaryOp;
    last.operands = { a: a, b: b };
    
    // Mark if any operand came from favorites
    if (inlinePreview.aFromFavorite || inlinePreview.bFromFavorite) {
        last.helperUsed = true;
    }
    
    // Auto-select the newly added operation (last line)
    workflowSelections = [operationsHistory.length - 1];

    // clear preview state and exit binary mode
    clearBinaryPreview();
    renderWorkflow();
    checkTutorialProgress();
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

    // If we have first operand but not second, show the first operand in YOUR PATTERN
    if (aPattern && !bPattern) {
        previewPattern = null;
        previewBackupPattern = null;
        currentPattern = JSON.parse(JSON.stringify(aPattern));
        renderPattern(currentPattern, 'workspace');
        setWorkspaceGlow(false);
        updateInlinePreviewPanel();
        return;
    }

    // If we don't have any operands, restore to last committed pattern
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
    
    // Clear pending operation (keep selections as set by caller)
    pendingBinaryOp = null;
    pendingUnaryOp = null;
    
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

    const operandCopy = (sourceSnapshot !== undefined && sourceSnapshot !== null)
        ? JSON.parse(JSON.stringify(sourceSnapshot))
        : null;

    const opText = `${pendingUnaryOp}(${operandLabel})`;
    addOperation(opText, {
        opFn: pendingUnaryOp,
        operands: { input: operandCopy }
    });
    const last = operationsHistory[operationsHistory.length - 1];
    last.opFn = pendingUnaryOp;
    last.operands = { input: operandCopy };
    last.operandSource = operandSourceMeta;
    
    // Mark if operand came from favorites
    if (operandSourceMeta && operandSourceMeta.type === 'favorite') {
        last.helperUsed = true;
    }

    // Auto-select the newly added operation (last line)
    workflowSelections = [operationsHistory.length - 1];
    clearUnaryPreview();
    renderWorkflow();
    checkTutorialProgress();
}

function confirmPendingOperation() {
    // Record preview confirmation for cognitive planning analysis
    if (currentTrialRecord && (pendingBinaryOp || pendingUnaryOp)) {
        if (!currentTrialRecord.previewActions) {
            currentTrialRecord.previewActions = [];
        }
        currentTrialRecord.previewActions.push({
            action: 'confirm',
            operationType: pendingBinaryOp ? pendingBinaryOp : pendingUnaryOp,
            timestamp: Date.now()
        });
    }
    
    if (pendingBinaryOp) {
        applySelectedBinary();
    } else if (pendingUnaryOp) {
        applySelectedUnary();
    } else {
        showToast('Select an operation to confirm.', 'warning');
    }
}

function resetPendingOperation() {
    // Record preview cancellation for cognitive planning analysis
    if (currentTrialRecord && (pendingBinaryOp || pendingUnaryOp)) {
        if (!currentTrialRecord.previewActions) {
            currentTrialRecord.previewActions = [];
        }
        currentTrialRecord.previewActions.push({
            action: 'cancel',
            operationType: pendingBinaryOp ? pendingBinaryOp : pendingUnaryOp,
            timestamp: Date.now()
        });
    }
    
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

function undoLast() {
    if (operationsHistory.length > 0) {
        // Record undo action for cognitive error correction analysis
        if (currentTrialRecord) {
            if (!currentTrialRecord.undoActions) {
                currentTrialRecord.undoActions = [];
            }
            const undoneStep = operationsHistory[operationsHistory.length - 1];
            currentTrialRecord.undoActions.push({
                action: 'undo',
                undoneOperation: undoneStep ? undoneStep.operation : 'unknown',
                timestamp: Date.now()
            });
        }
        
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

function seedAddPreviewWithBlankOperand() {
    pendingBinaryOp = null;
    pendingUnaryOp = null;
    selectBinaryOp('add');
    inlinePreview.aPattern = geomDSL.blank();
    inlinePreview.aIndex = null;
    inlinePreview.bPattern = null;
    inlinePreview.bIndex = null;
    workflowSelections = [];
    previewPattern = null;
    previewBackupPattern = null;
    setWorkspaceGlow(false);
    createBinaryPreview();
    updateAllButtonStates();
    updateInlinePreviewPanel();
}

function resetWorkspace() {
    // Record reset action for cognitive error correction analysis
    if (currentTrialRecord) {
        if (!currentTrialRecord.undoActions) {
            currentTrialRecord.undoActions = [];
        }
        currentTrialRecord.undoActions.push({
            action: 'reset',
            stepsCleared: operationsHistory.length,
            timestamp: Date.now()
        });
    }
    
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
    // In tutorial mode (not practice), Submit button is for learning only
    if (!isPracticeMode) {
        showToast('This is tutorial mode. Submit button will work in practice exercises!', 'info', 2500);
        return;
    }
    
    if (!currentPattern) {
        showToast('Please create a pattern first', 'warning');
        return;
    }

    const match = JSON.stringify(currentPattern) === JSON.stringify(targetPattern);
    const previouslySuccessful = currentTrialRecord?.success === true;

    const modal = document.getElementById('feedbackModal');
    const icon = document.getElementById('feedbackIcon');
    const message = document.getElementById('feedbackMessage');

    let pointsAwardedThisSubmission = 0;
    const eligibleForPoints = match && !previouslySuccessful;
    if (eligibleForPoints) {
        const available = Math.max(0, POINTS_MAX - totalPoints);
        pointsAwardedThisSubmission = Math.min(pointsPerCorrect, available);
        if (pointsAwardedThisSubmission > 0) {
            totalPoints += pointsAwardedThisSubmission;
            updatePointsDisplay();
        }
    }

    // Record trial data
    if (currentTrialRecord) {
        const previousPointsEarned = currentTrialRecord.pointsEarned || 0;
        currentTrialRecord.operations = operationsHistory.map(h => h.operation);
        currentTrialRecord.stepsCount = operationsHistory.length;
        currentTrialRecord.timeSpent = Date.now() - trialStartTime;
        currentTrialRecord.success = match;
        currentTrialRecord.submitted = true;
        const trialEarned = match ? Math.max(previousPointsEarned, pointsAwardedThisSubmission) : previousPointsEarned;
        currentTrialRecord.pointsEarned = trialEarned;
        currentTrialRecord.pointsAwarded = pointsAwardedThisSubmission;
        currentTrialRecord.totalPointsAfter = totalPoints;
    }

    // Show centered modal feedback
    if (modal && icon && message) {
        // Tutorial/Practice mode: check if answer is correct
        if (match) {
            icon.textContent = '✓';
            icon.className = 'feedback-icon success';
            // Check if this is the last practice exercise
            const isLastPractice = isPracticeMode && currentPracticeExercise >= practiceExercises.length - 1;
            if (isLastPractice) {
                message.textContent = 'Perfect! Practice exercises completed.\nMoving to comprehension check...';
            } else if (isPracticeMode) {
                message.textContent = 'Perfect! Your pattern matches the target.\nMoving to the next practice...';
            } else {
                message.textContent = 'Correct! Your pattern matches the target.';
            }
        } else {
            icon.textContent = '✗';
            icon.className = 'feedback-icon failure';
            message.textContent = 'Not quite right. Your pattern doesn\'t match the target.\nTry again!';
        }

        modal.classList.add('show');

        setTimeout(() => {
            modal.classList.remove('show');
            
            // 练习模式：只有答案正确才进入下一个练习
            if (isPracticeMode) {
                if (match) {
                    if (currentPracticeExercise < practiceExercises.length - 1) {
                        loadPracticeExercise(currentPracticeExercise + 1);
                    } else {
                        // 练习完成，跳转到comprehension check
                        location.href = 'comprehension.html';
                    }
                }
                // 如果答案错误，保持在当前练习，让用户重试
            } else {
                // 正式试验模式
                if (currentTestIndex < getTotalTrials() - 1) {
                    const nextIndex = currentTestIndex + 1;
                    resetWorkspace();
                    loadTrial(nextIndex);
                } else {
                    showCompletionModal();
                }
            }
        }, 2000);
    }
}

function initializeApp() {
    initializePrimitiveIcons();
    initializePreviewControllers();
    bindButtonInteractions();
    registerKeyboardShortcuts();
    updateInlinePreviewPanel();
    renderFavoritesShelf();
    updatePointsDisplay();
}

function initializePreviewControllers() {
    pendingBinaryOp = null;
    pendingUnaryOp = null;
    resetInlinePreviewState();
    resetUnaryPreviewState();
    updateAllButtonStates();
}

function bindButtonInteractions() {
    document.querySelectorAll('.primitive-btn[data-op]').forEach(btn => {
        btn.addEventListener('dblclick', () => {
            const op = btn.getAttribute('data-op');
            applyPrimitive(op);
        });
    });

    document.querySelectorAll('.binary-btn[data-op]').forEach(btn => {
        btn.addEventListener('dblclick', () => {
            if (btn.classList.contains('disabled')) return;
            const op = btn.getAttribute('data-op');
            selectBinaryOp(op);
        });
    });

    document.querySelectorAll('.transform-btn, .primitive-btn').forEach(btn => {
        if (!btn.getAttribute('data-original-title') && btn.title) {
            btn.setAttribute('data-original-title', btn.title);
        }
    });
}

function handleExperimentShortcut(event) {
    if (!previewPattern) return;
    if (event.key === 'Enter') {
        event.preventDefault();
        confirmPendingOperation();
    } else if (event.key === 'Escape' || event.key === 'Esc') {
        event.preventDefault();
        resetPendingOperation();
    }
}

function registerKeyboardShortcuts() {
    document.addEventListener('keydown', handleExperimentShortcut);
}

// Expose functions globally for HTML onclick handlers
Object.assign(globalScope, {
    selectBinaryOp,
    applyTransform,
    applyPrimitive,
    confirmPendingOperation,
    resetPendingOperation,
    submitAnswer,
    addLastToFavorites,
    undoLast,
    resetWorkspace
});

// === TUTORIAL SPECIFIC CODE ===

let currentTutorialStep = 0;
let tutorialCompletionInterval = null;

const tutorialSteps = [
    {
        title: "Welcome to the Tutorial!",
        content: `<p>This interactive tutorial will show you how to use the interface.</p>
            <p>You'll see the same interface you'll use in the actual experiment.</p>
            <p>Click "Next" to continue.</p>`,
        onEnter: () => {
            const target = document.getElementById('targetPattern');
            if (target) renderPattern(geomDSL.square(), target);
        },
        waitForAction: false,
        checkCompletion: null
    },
    {
        title: "The Interface Overview",
        content: `<p>Here's what you'll see:</p>
            <ul>
                <li><strong>PREVIEW</strong>: Preview your operation before adding it</li>
                <li><strong>TARGET PATTERN</strong>: The goal pattern you need to match</li>
                <li><strong>YOUR PATTERN</strong>: Your current pattern as you build</li>
                <li><strong>OPERATIONS & PRIMITIVES</strong>: Tools to create and modify patterns</li>
                <li><strong>STEP SEQUENCE</strong>: History of all your building steps</li>
            </ul>`,
        onEnter: null,
        waitForAction: false,
        checkCompletion: null
    },
    {
        title: "Step 1: Select an Operation",
        content: `<p><strong>Task:</strong> Click <strong>invert</strong> in Operations.</p>
            <p>You must <em>first select an operation</em>, then provide input(s).</p>
            <p><em style="color: #fbbf24;">"Next" appears after you click invert.</em></p>`,
        onEnter: () => highlightTutorialElement('.operations-section'),
        waitForAction: true,
        checkCompletion: () => pendingUnaryOp === 'invert'
    },
    {
        title: "Step 2: Provide the Input",
        content: `<p><strong>Task:</strong> Click <strong>any primitive</strong>.</p>
            <p>You'll see a preview of the inverted pattern.</p>
            <p><em style="color: #fbbf24;">"Next" appears after you select a primitive.</em></p>`,
        onEnter: () => {
            removeTutorialHighlight();
            highlightTutorialElement('.primitives-section');
        },
        waitForAction: true,
        checkCompletion: () => unaryPreviewState.source !== null
    },
    {
        title: "Step 3: Confirm",
        content: `<p><strong>Task:</strong> Click <strong>✓ Confirm</strong>.</p>
            <p>This executes and adds to your step sequence!</p>
            <p><em style="color: #fbbf24;">"Next" appears after you confirm.</em></p>`,
        onEnter: function() {
            removeTutorialHighlight();
            highlightTutorialElement('#binaryPreviewPanel');
            this._startHistoryLength = operationsHistory.length;
        },
        waitForAction: true,
        checkCompletion: function() {
            // Check if a new operation was added (user confirmed)
            return operationsHistory.length > this._startHistoryLength;
        }
    },
    {
        title: "Try a Binary Operation",
        content: `<p><strong>Task:</strong> Complete a binary operation!</p>
            <ol>
                <li>Click <strong>add</strong></li>
                <li>Click <strong>any primitive</strong> (operand A)</li>
                <li>Click <strong>another primitive</strong> (operand B)</li>
                <li>Click <strong>✓ Confirm</strong></li>
            </ol>
            <p><em style="color: #fbbf24;">"Next" when complete.</em></p>`,
        onEnter: function() {
            removeTutorialHighlight();
            highlightTutorialElement('.operations-section');
            this._startHistoryLength = operationsHistory.length;
        },
        waitForAction: true,
        checkCompletion: function() {
            // Check if a new operation was added and it's a binary operation (add)
            if (operationsHistory.length <= this._startHistoryLength) return false;
            const lastOp = operationsHistory[operationsHistory.length - 1];
            return lastOp.operation && lastOp.operation.includes('add');
        }
    },
    {
        title: "Using Reset",
        content: `<p>If you make a mistake, click <strong>⟲ Reset</strong> to cancel a pending operation.</p>
            <p><strong>Try:</strong> Click an operation, then <strong>⟲ Reset</strong>.</p>
            <p>This is optional - just know it's there if you need it!</p>`,
        onEnter: () => {
            removeTutorialHighlight();
            highlightTutorialElement('#binaryPreviewPanel');
        },
        waitForAction: false,
        checkCompletion: null
    },
    {
        title: "Try SUBTRACT Operation",
        content: `<p><strong>Task:</strong> Learn SUBTRACT - it removes cells from a base pattern.</p>
            <ol>
                <li>Click <strong>subtract</strong></li>
                <li>Click <strong>any primitive</strong> as the base (operand A)</li>
                <li>Click <strong>another primitive</strong> to remove (operand B)</li>
                <li>Watch YOUR PATTERN - cells from B will be removed from A</li>
                <li>Click <strong>✓ Confirm</strong></li>
            </ol>
            <p><em style="color: #fbbf24;">"Next" when complete.</em></p>`,
        onEnter: () => {
            removeTutorialHighlight();
            highlightTutorialElement('.operations-section');
        },
        waitForAction: true,
        checkCompletion: () => {
            // Check if the last operation is a subtract
            if (operationsHistory.length === 0) return false;
            const lastOp = operationsHistory[operationsHistory.length - 1];
            return lastOp.operation && lastOp.operation.includes('subtract');
        }
    },
    {
        title: "Try UNION Operation",
        content: `<p><strong>Task:</strong> Learn UNION - it keeps only overlapping cells.</p>
            <ol>
                <li>Click <strong>union</strong></li>
                <li>Click <strong>any primitive</strong> (operand A)</li>
                <li>Click <strong>another primitive</strong> (operand B)</li>
                <li>Watch YOUR PATTERN - only overlapping cells remain</li>
                <li>Click <strong>✓ Confirm</strong></li>
            </ol>
            <p><em style="color: #fbbf24;">"Next" when complete.</em></p>`,
        onEnter: () => {
            removeTutorialHighlight();
            highlightTutorialElement('.operations-section');
        },
        waitForAction: true,
        checkCompletion: () => {
            // Check if the last operation is a union
            if (operationsHistory.length === 0) return false;
            const lastOp = operationsHistory[operationsHistory.length - 1];
            return lastOp.operation && lastOp.operation.includes('union');
        }
    },
    {
        title: "Try flip_h (Horizontal Flip)",
        content: `<p><strong>Task:</strong> Try horizontal flip!</p>
            <ol>
                <li>Click <strong>flip_h</strong></li>
                <li>Select any previous step or primitive</li>
                <li>Watch YOUR PATTERN - see how it flips around the canvas center?</li>
                <li>Click <strong>✓ Confirm</strong></li>
            </ol>
            <p><em style="color: #fbbf24;">"Next" when complete.</em></p>`,
        onEnter: function() {
            removeTutorialHighlight();
            highlightTutorialElement('.operations-section');
            // Store the current history length to check for new operation
            this._startHistoryLength = operationsHistory.length;
        },
        waitForAction: true,
        checkCompletion: function() {
            // Check if a new operation was added and it's reflect_horizontal
            if (operationsHistory.length <= (this._startHistoryLength || 0)) return false;
            const lastOp = operationsHistory[operationsHistory.length - 1];
            return lastOp.operation && lastOp.operation.includes('reflect_horizontal');
        }
    },
    {
        title: "Try flip_v (Vertical Flip)",
        content: `<p><strong>Task:</strong> Try vertical flip!</p>
            <ol>
                <li>Click <strong>flip_v</strong></li>
                <li>Select any previous step or primitive</li>
                <li>Notice how left and right swap around the canvas center</li>
                <li>Click <strong>✓ Confirm</strong></li>
            </ol>
            <p><em style="color: #fbbf24;">"Next" when complete.</em></p>`,
        onEnter: function() {
            removeTutorialHighlight();
            highlightTutorialElement('.operations-section');
            // Store the current history length to check for new operation
            this._startHistoryLength = operationsHistory.length;
        },
        waitForAction: true,
        checkCompletion: function() {
            // Check if a new operation was added and it's reflect_vertical
            if (operationsHistory.length <= (this._startHistoryLength || 0)) return false;
            const lastOp = operationsHistory[operationsHistory.length - 1];
            return lastOp.operation && lastOp.operation.includes('reflect_vertical');
        }
    },
    {
        title: "Practice: Using STEP SEQUENCE",
        content: `<p>You can reuse previous steps as inputs! Try it:</p>
            <ol>
                <li>Click <strong>add</strong></li>
                <li>Click <strong>any step</strong> in STEP SEQUENCE (not a primitive!)</li>
                <li>Click <strong>another step</strong> or primitive</li>
                <li>Click <strong>✓ Confirm</strong></li>
            </ol>
            <p><em style="color: #fbbf24;">"Next" when complete.</em></p>`,
        onEnter: function() {
            removeTutorialHighlight();
            highlightTutorialElement('.program-card');
            this._startHistoryLength = operationsHistory.length;
        },
        waitForAction: true,
        checkCompletion: function() {
            // Check if a new add operation was added using at least one step from history
            if (operationsHistory.length <= (this._startHistoryLength || 0)) return false;
            const lastOp = operationsHistory[operationsHistory.length - 1];
            if (!lastOp.operation || !lastOp.operation.includes('add')) return false;
            // Check if at least one operand came from history (has historyIndex)
            return lastOp.aIndex !== null || lastOp.bIndex !== null;
        }
    },
    {
        title: "Helpers - Save Favorites",
        content: `<p><strong>Helpers</strong> let you save patterns for quick reuse!</p>
            <ul>
                <li>Find the <strong>+ button</strong> next to any step in "STEP SEQUENCE"</li>
                <li>Click it to save that step as a helper</li>
                <li>The helper appears in <strong>"YOUR HELPERS"</strong> section</li>
                <li>Click helpers to use them as operands (just like primitives!)</li>
            </ul>
            <p><strong>Try it now:</strong> Click the + button on any step below to add it to helpers.</p>
            <p><em>This is optional but saves time when patterns repeat.</em></p>`,
        onEnter: function() {
            removeTutorialHighlight();
            this._initialFavoritesCount = favorites.length;
            highlightTutorialElement('.helpers-section');
            setTimeout(() => highlightTutorialElement('.program-card'), 1500);
        },
        waitForAction: true,
        checkCompletion: function() {
            // Check if user has added at least one favorite
            return favorites.length > (this._initialFavoritesCount || 0);
        }
    },
    {
        title: "Practice: Use a Helper",
        content: `<p>Now let's practice using your saved helper!</p>
            <p><strong>Task:</strong> Use a helper as an operand in an operation.</p>
            <ol>
                <li>Select any operation (like <strong>add</strong> or <strong>flip_h</strong>)</li>
                <li>Click your helper in <strong>"YOUR HELPERS"</strong> section to use it</li>
                <li>Complete the operation and confirm</li>
            </ol>
            <p><em>Helpers work just like primitives - click them to use as operands!</em></p>`,
        onEnter: function() {
            removeTutorialHighlight();
            this._startHistoryLength = operationsHistory.length;
            highlightTutorialElement('.helpers-section');
        },
        waitForAction: true,
        checkCompletion: function() {
            // Check if user has performed a new operation that used a helper
            if (operationsHistory.length <= this._startHistoryLength) return false;
            
            // Check recent operations for helper usage (marked by helperUsed flag)
            for (let i = this._startHistoryLength; i < operationsHistory.length; i++) {
                const op = operationsHistory[i];
                if (op.helperUsed) {
                    return true;
                }
            }
            return false;
        }
    },
    {
        title: "Submitting Your Answer",
        content: `<p>When you're satisfied with your pattern:</p>
            <ol>
                <li><strong>Option 1:</strong> Submit the last step (default) - just click <strong>✓ Submit</strong></li>
                <li><strong>Option 2:</strong> Click any step in "STEP SEQUENCE" to select it, then click <strong>✓ Submit</strong></li>
                <li>Get feedback and earn points!</li>
            </ol>
            <p><em>Tip: Click steps to preview different results before submitting!</em></p>`,
        onEnter: () => {
            removeTutorialHighlight();
            highlightTutorialElement('.program-card');
        },
        waitForAction: false,
        checkCompletion: null
    },
    {
        title: "Complete!",
        content: `<p>You've learned everything:</p>
            <ul>
                <li>✓ <strong>Operations:</strong> Binary & Unary</li>
                <li>✓ <strong>Workflow:</strong> Operation → Primitive → Preview → Confirm</li>
                <li>✓ <strong>Reset:</strong> Cancel operations</li>
                <li>✓ <strong>Helpers:</strong> Save favorites</li>
                <li>✓ <strong>Submit:</strong> Complete</li>
            </ul>
            <p><strong>Ready for the practice exercises?</strong></p>`,
        onEnter: () => removeTutorialHighlight(),
        waitForAction: false,
        checkCompletion: null
    }
];
function highlightTutorialElement(selector) {
    // Highlighting disabled - function does nothing
    return;
}

function removeTutorialHighlight() {
    // Highlighting disabled - function does nothing
    return;
}

function showTutorialStep(step) {
    const overlay = document.getElementById('tutorialOverlay');
    const stepSpan = document.getElementById('tutorialStep');
    const totalSpan = document.getElementById('tutorialTotal');
    const titleEl = document.getElementById('tutorialTitle');
    const contentEl = document.getElementById('tutorialContent');
    const nextBtn = document.getElementById('tutorialNextBtn');
    
    if (!overlay || !nextBtn) return;
    
    // 确保教程期间显示空白画布
    const tutorialBlankCanvas = document.getElementById('tutorialBlankCanvas');
    if (tutorialBlankCanvas) {
        tutorialBlankCanvas.style.display = 'flex';
        tutorialBlankCanvas.style.visibility = 'visible';
        tutorialBlankCanvas.style.position = 'static';
    }
    
    stepSpan.textContent = step + 1;
    totalSpan.textContent = tutorialSteps.length;
    titleEl.textContent = tutorialSteps[step].title;
    contentEl.innerHTML = tutorialSteps[step].content;
    
    if (tutorialCompletionInterval) {
        clearInterval(tutorialCompletionInterval);
        tutorialCompletionInterval = null;
    }
    
    if (tutorialSteps[step].onEnter) {
        tutorialSteps[step].onEnter();
    }
    
    if (tutorialSteps[step].waitForAction) {
        nextBtn.style.display = 'none';
        startTutorialCompletionCheck(step);
    } else {
        nextBtn.style.display = 'inline-block';
        nextBtn.classList.remove('pulse-animation');
    }
    
    if (step === tutorialSteps.length - 1) {
        nextBtn.textContent = 'Start Practice Exercises >>';
    } else {
        nextBtn.textContent = 'Next >>';
    }
}

function startTutorialCompletionCheck(step) {
    tutorialCompletionInterval = setInterval(() => {
        if (tutorialSteps[step].checkCompletion && tutorialSteps[step].checkCompletion()) {
            const nextBtn = document.getElementById('tutorialNextBtn');
            if (nextBtn) {
                nextBtn.style.display = 'inline-block';
                nextBtn.classList.add('pulse-animation');
            }
            clearInterval(tutorialCompletionInterval);
            tutorialCompletionInterval = null;
        }
    }, 300);
}

function handleTutorialNext() {
    const nextBtn = document.getElementById('tutorialNextBtn');
    if (nextBtn) nextBtn.classList.remove('pulse-animation');
    
    currentTutorialStep++;
    
    if (currentTutorialStep < tutorialSteps.length) {
        showTutorialStep(currentTutorialStep);
    } else {
        // Tutorial完成，切换到练习模式
        removeTutorialHighlight();
        startPracticeMode();
    }
}

// --- PRACTICE MODE FUNCTIONS ---
function startPracticeMode() {
    isPracticeMode = true;
    
    // 隐藏教程覆盖层
    const tutorialOverlay = document.getElementById('tutorialOverlay');
    if (tutorialOverlay) {
        tutorialOverlay.style.display = 'none';
    }
    
    // 隐藏教程期间的空白画布，显示实际目标图案
    const tutorialBlankCanvas = document.getElementById('tutorialBlankCanvas');
    const targetPattern = document.getElementById('targetPattern');
    if (tutorialBlankCanvas) {
        tutorialBlankCanvas.style.display = 'none';
        tutorialBlankCanvas.style.visibility = 'hidden';
        tutorialBlankCanvas.style.position = 'absolute';
    }
    if (targetPattern) {
        targetPattern.style.display = 'flex';
        targetPattern.style.visibility = 'visible';
        targetPattern.style.position = 'static';
    }
    
    // 加载第一个练习
    loadPracticeExercise(0);
    
    showToast('Practice mode started!', 'success');
}

// 完全复制task.js的loadTrial逻辑
function loadPracticeExercise(index) {
    // 确保索引有效
    const clamped = Math.max(0, Math.min(index, practiceExercises.length - 1));
    currentPracticeExercise = clamped;
    
    // 生成目标图案
    targetPattern = practiceExercises[currentPracticeExercise].generate();
    renderPattern(targetPattern, 'targetPattern');
    
    // 清空工作区和工作流程/日志（复制resetWorkspace逻辑）
    resetWorkspace();
    
    // 从空白画布开始
    currentPattern = geomDSL.blank();
    renderPattern(currentPattern, 'workspace', {
        diffMode: pendingBinaryOp,
        basePattern: previewBackupPattern?.pattern
    });
    
    // 初始化预览（复制task.js的逻辑）
    seedAddPreviewWithBlankOperand();
}

// Initialize tutorial
document.addEventListener('DOMContentLoaded', () => {
    console.log('Tutorial initializing...');
    
    // Initialize patterns module
    initializePrimitiveIcons();
    
    // Setup tutorial UI
    const totalSpan = document.getElementById('tutorialTotal');
    if (totalSpan) totalSpan.textContent = tutorialSteps.length;
    
    const nextBtn = document.getElementById('tutorialNextBtn');
    if (nextBtn) nextBtn.addEventListener('click', handleTutorialNext);
    
    // Initialize state
    currentPattern = geomDSL.blank();
    targetPattern = geomDSL.blank(); // Blank during tutorial
    renderPattern(currentPattern, 'workspace');
    // Render blank pattern in tutorialBlankCanvas to match Your Pattern
    renderPattern(geomDSL.blank(), 'tutorialBlankCanvas');
    
    // Initialize UI
    updateOperationsLog();
    updateAllButtonStates();
    updateInlinePreviewPanel();
    renderWorkflow();
    
    // Show first tutorial step
    showTutorialStep(0);
    
    console.log('Tutorial initialized');
});
