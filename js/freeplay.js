import { appState, globalScope, SIZE } from './modules/state.js';
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

// Free Play Mode - Global State
let currentPattern = geomDSL.blank();
let operationsHistory = [];
let workflowSelections = [];
let pendingBinaryOp = null;
let pendingUnaryOp = null;
let previewPattern = null;
let previewBackupPattern = null;
let unaryModeJustEntered = false;
let favorites = [];
let inlinePreview;
let unaryPreviewState;

// Session recording for research analysis
let sessionRecord = null;

// Initialize state objects
function createInlinePreviewState() {
    return {
        op: null,
        aIndex: null,
        bIndex: null,
        aPattern: null,
        bPattern: null,
        aFromFavorite: false,
        bFromFavorite: false
    };
}

function createUnaryPreviewState() {
    return {
        op: null,
        source: null
    };
}

inlinePreview = createInlinePreviewState();
unaryPreviewState = createUnaryPreviewState();
appState.inlinePreview = inlinePreview;
appState.unaryPreviewState = unaryPreviewState;

// Initialize session record
function initializeSessionRecord() {
    sessionRecord = {
        sessionId: `freeplay_${Date.now()}`,
        startTime: Date.now(),
        endTime: null,
        totalDuration: null,
        
        // All actions taken during the session
        buttonClickActions: [],
        favoriteActions: [],
        operationActions: [],
        
        // Final state
        finalPattern: null,
        totalOperations: 0,
        patternsCreated: [],
        helperUsageCount: {},
        
        // Session metadata
        userAgent: navigator.userAgent,
        screenSize: { width: window.innerWidth, height: window.innerHeight }
    };
}

// Log button clicks
function logButtonClick(buttonType, operationName, context = {}) {
    if (!sessionRecord) return;
    sessionRecord.buttonClickActions.push({
        buttonType,
        operation: operationName,
        context,
        timestamp: Date.now()
    });
}

// Log operation completion
function logOperationComplete(operation, operands, result) {
    if (!sessionRecord) return;
    sessionRecord.operationActions.push({
        operation,
        operands: {
            a: operands.a ? JSON.parse(JSON.stringify(operands.a)) : null,
            b: operands.b ? JSON.parse(JSON.stringify(operands.b)) : null,
            input: operands.input ? JSON.parse(JSON.stringify(operands.input)) : null
        },
        result: JSON.parse(JSON.stringify(result)),
        operationIndex: operationsHistory.length,
        timestamp: Date.now()
    });
}

// Save session to localStorage
function saveSessionRecord() {
    if (!sessionRecord) return;
    
    sessionRecord.endTime = Date.now();
    sessionRecord.totalDuration = sessionRecord.endTime - sessionRecord.startTime;
    sessionRecord.finalPattern = currentPattern ? JSON.parse(JSON.stringify(currentPattern)) : null;
    sessionRecord.totalOperations = operationsHistory.length;
    
    // Save to localStorage
    const allSessions = JSON.parse(localStorage.getItem('freeplaySessions') || '[]');
    allSessions.push(sessionRecord);
    localStorage.setItem('freeplaySessions', JSON.stringify(allSessions));
}

// ============ GALLERY FUNCTIONS ============
function getGalleryFromStorage() {
    const stored = localStorage.getItem('patternGallery');
    return stored ? JSON.parse(stored) : [];
}

function saveGalleryToStorage(gallery) {
    localStorage.setItem('patternGallery', JSON.stringify(gallery));
}

function updateGalleryCount() {
    const el = document.getElementById('galleryCount');
    if (el) {
        const gallery = getGalleryFromStorage();
        el.textContent = String(gallery.length);
    }
}

function saveToGallery() {
    if (!currentPattern) {
        showToast('Create a pattern first!', 'warning');
        return;
    }
    
    const gallery = getGalleryFromStorage();
    const totalOps = operationsHistory.length;
    
    const creation = {
        id: Date.now(),
        pattern: JSON.parse(JSON.stringify(currentPattern)),
        operations: operationsHistory.map(h => h.operation),
        operationsHistory: JSON.parse(JSON.stringify(operationsHistory)), // Full history
        totalOperations: totalOps,
        timestamp: new Date().toISOString(),
        createdAt: Date.now(),
        sessionId: sessionRecord ? sessionRecord.sessionId : null // Link to session
    };
    
    gallery.push(creation);
    saveGalleryToStorage(gallery);
    updateGalleryCount();
    
    // Save session record with this pattern
    saveSessionRecord();
    
    showToast(`Saved to gallery! (${totalOps} operations)`, 'success', 2000);
}

function viewGallery() {
    window.location.href = 'gallery.html';
}

function clearWorkspace() {
    if (operationsHistory.length > 0) {
        if (!confirm('Clear all work and start fresh? This cannot be undone.')) {
            return;
        }
    }
    
    currentPattern = geomDSL.blank();
    operationsHistory = [];
    favorites = [];
    workflowSelections = [];
    pendingBinaryOp = null;
    pendingUnaryOp = null;
    previewPattern = null;
    previewBackupPattern = null;
    inlinePreview = createInlinePreviewState();
    unaryPreviewState = createUnaryPreviewState();
    
    renderPattern(currentPattern, 'workspace');
    renderWorkflow();
    renderFavoritesShelf();
    updateAllButtonStates();
    updateInlinePreviewPanel();
    setWorkspaceGlow(false);
    
    showToast('Workspace cleared. Start creating!', 'info');
}

// ============ FAVORITES SYSTEM ============
// Load favorites from localStorage
function loadFavoritesFromStorage() {
    try {
        const stored = localStorage.getItem('patternHelpers');
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.warn('Failed to load favorites from localStorage:', e);
    }
    return [];
}

// Save favorites to localStorage
function saveFavoritesToStorage() {
    try {
        localStorage.setItem('patternHelpers', JSON.stringify(favorites));
    } catch (e) {
        console.warn('Failed to save favorites to localStorage:', e);
    }
}

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

function isPatternFavorited(pattern) {
    return favorites.some(f => patternsEqual(f.pattern, pattern));
}

function addFavoriteFromEntry(entry) {
    if (!entry || !entry.pattern) return;
    const pattern = entry.pattern;
    if (isPatternFavorited(pattern)) return;
    
    const id = `fav_${Date.now()}_${Math.floor(Math.random()*1000)}`;
    const snapshot = {
        id,
        pattern: JSON.parse(JSON.stringify(pattern)),
        op: entry.operation || '',
        meta: {
            opFn: entry.opFn,
            operands: entry.operands
        },
        createdAt: Date.now()
    };
    favorites.push(snapshot);
    saveFavoritesToStorage(); // Persist to localStorage
    
    // Log favorite addition for research
    if (sessionRecord) {
        if (!sessionRecord.favoriteActions) {
            sessionRecord.favoriteActions = [];
        }
        sessionRecord.favoriteActions.push({
            action: 'add',
            favoriteId: id,
            operation: entry.operation,
            pattern: JSON.parse(JSON.stringify(pattern)),
            opFn: entry.opFn,
            operands: entry.operands,
            timestamp: Date.now()
        });
    }
}

function removeFavoriteById(id) {
    favorites = favorites.filter(f => f.id !== id);
    saveFavoritesToStorage(); // Persist to localStorage
    
    // Log favorite removal for research
    if (sessionRecord) {
        if (!sessionRecord.favoriteActions) {
            sessionRecord.favoriteActions = [];
        }
        sessionRecord.favoriteActions.push({
            action: 'remove',
            favoriteId: id,
            timestamp: Date.now()
        });
    }
}

function toggleFavoriteFromWorkflow(idx) {
    const entry = operationsHistory[idx];
    if (!entry || !entry.pattern) return;
    
    if (isPatternFavorited(entry.pattern)) {
        const found = favorites.find(f => patternsEqual(f.pattern, entry.pattern));
        if (found) removeFavoriteById(found.id);
    } else {
        addFavoriteFromEntry(entry);
    }
    renderWorkflow();
}

function addLastToFavorites() {
    let entry = null;
    if (operationsHistory && operationsHistory.length > 0) {
        entry = operationsHistory[operationsHistory.length - 1];
    } else if (currentPattern) {
        entry = { pattern: JSON.parse(JSON.stringify(currentPattern)), operation: 'workspace' };
    }
    
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
    showToast('Added to helpers.', 'info');
}

function renderFavoritesShelf() {
    const shelf = document.getElementById('favoritesShelf');
    if (!shelf) return;
    shelf.innerHTML = '';
    
    if (favorites.length === 0) {
        shelf.innerHTML = '<div class="helpers-empty">Favorite a step to reuse it here.</div>';
        return;
    }
    
    favorites.forEach(fav => {
        const { id, pattern } = fav;
        const wrapper = document.createElement('div');
        wrapper.className = 'helper-item';
        
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
        
        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'helper-delete';
        del.title = 'Remove helper';
        del.textContent = '✕';
        del.addEventListener('click', (e) => {
            e.stopPropagation();
            removeFavoriteById(id);
            renderFavoritesShelf();
            showToast('Removed helper.', 'info');
        });
        
        wrapper.appendChild(btn);
        wrapper.appendChild(del);
        shelf.appendChild(wrapper);
    });
}

function useFavoritePattern(id, pattern) {
    let filled = null;
    const context = pendingBinaryOp ? 'binary' : (pendingUnaryOp ? 'unary' : 'none');
    
    // Find the favorite for logging
    const favorite = favorites.find(f => f.id === id);
    
    if (pendingBinaryOp) {
        const { aSource, bSource } = resolveBinaryOperandSources();
        if (!aSource) {
            inlinePreview.aPattern = pattern;
            inlinePreview.aIndex = null;
            inlinePreview.aFromFavorite = true;
            filled = 'a';
        } else if (!bSource) {
            inlinePreview.bPattern = pattern;
            inlinePreview.bIndex = null;
            inlinePreview.bFromFavorite = true;
            filled = 'b';
        } else {
            showToast('Both operands are already selected.', 'warning');
            return;
        }
        
        // Log helper usage for research
        if (sessionRecord) {
            if (!sessionRecord.favoriteActions) {
                sessionRecord.favoriteActions = [];
            }
            sessionRecord.favoriteActions.push({
                action: 'use',
                favoriteId: id,
                context: context,
                operation: favorite ? favorite.op : undefined,
                pattern: JSON.parse(JSON.stringify(pattern)),
                usedAs: filled === 'a' ? 'operandA' : 'operandB',
                timestamp: Date.now()
            });
            
            // Track helper usage count
            if (!sessionRecord.helperUsageCount[id]) {
                sessionRecord.helperUsageCount[id] = 0;
            }
            sessionRecord.helperUsageCount[id]++;
        }
        
        createBinaryPreview();
        renderWorkflow();
        updateAllButtonStates();
        if (filled) {
            pulseOperandBox(filled);
            showToast(`Filled operand ${filled.toUpperCase()} from Helpers`, 'info', 1600);
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
        
        // Log helper usage for research
        if (sessionRecord) {
            if (!sessionRecord.favoriteActions) {
                sessionRecord.favoriteActions = [];
            }
            sessionRecord.favoriteActions.push({
                action: 'use',
                favoriteId: id,
                context: context,
                operation: favorite ? favorite.op : undefined,
                pattern: JSON.parse(JSON.stringify(pattern)),
                usedAs: 'unaryInput',
                timestamp: Date.now()
            });
            
            // Track helper usage count
            if (!sessionRecord.helperUsageCount[id]) {
                sessionRecord.helperUsageCount[id] = 0;
            }
            sessionRecord.helperUsageCount[id]++;
        }
        
        createUnaryPreview();
        renderWorkflow();
        updateAllButtonStates();
        pulseOperandBox('u');
        showToast('Filled unary input from Helpers', 'info', 1600);
        renderFavoritesShelf();
    } else {
        showToast('⚠️ Please select an operation (binary or unary) before using a helper.', 'warning');
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

// ============ STATE HELPERS ============
function resetInlinePreviewState() {
    inlinePreview = createInlinePreviewState();
    appState.inlinePreview = inlinePreview;
}

function resetUnaryPreviewState() {
    unaryPreviewState = createUnaryPreviewState();
    appState.unaryPreviewState = unaryPreviewState;
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
        sources.push({ slot: 'a', type: 'primitive', pattern: inlinePreview.aPattern, index: null });
    }
    if (inlinePreview.bPattern) {
        sources.push({ slot: 'b', type: 'primitive', pattern: inlinePreview.bPattern, index: null });
    }
    if (typeof inlinePreview.aIndex === 'number' && operationsHistory[inlinePreview.aIndex]) {
        sources.push({ slot: 'a', type: 'history', pattern: operationsHistory[inlinePreview.aIndex].pattern, index: inlinePreview.aIndex });
    }
    if (typeof inlinePreview.bIndex === 'number' && operationsHistory[inlinePreview.bIndex]) {
        sources.push({ slot: 'b', type: 'history', pattern: operationsHistory[inlinePreview.bIndex].pattern, index: inlinePreview.bIndex });
    }
    
    workflowSelections.slice().forEach(idx => {
        if (typeof idx !== 'number' || !operationsHistory[idx]) return;
        const already = sources.some(src => src.type === 'history' && src.index === idx);
        if (!already) {
            sources.push({ slot: null, type: 'history', pattern: operationsHistory[idx].pattern, index: idx });
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
    if (unaryModeJustEntered) {
        return null;
    }
    
    if (workflowSelections.length > 0) {
        const idx = workflowSelections[0];
        if (typeof idx === 'number' && operationsHistory[idx]) {
            return {
                type: 'history',
                index: idx,
                pattern: operationsHistory[idx].pattern
            };
        }
    }
    
    const lastIdx = operationsHistory.length - 1;
    if (lastIdx >= 0 && operationsHistory[lastIdx]) {
        return {
            type: 'history',
            index: lastIdx,
            pattern: operationsHistory[lastIdx].pattern
        };
    }
    
    if (currentPattern) {
        return {
            type: 'workspace',
            index: null,
            pattern: currentPattern
        };
    }
    
    return {
        type: 'workspace',
        index: null,
        pattern: geomDSL.blank()
    };
}

// ============ PRIMITIVES & OPERATIONS ============
function applyPrimitive(name) {
    // Log button click for research
    logButtonClick('primitive', name, {
        pendingBinary: !!pendingBinaryOp,
        pendingUnary: !!pendingUnaryOp
    });
    
    if (!pendingBinaryOp && !pendingUnaryOp) {
        showToast('⚠️ Please select an operation (binary or unary) before choosing a primitive.', 'warning');
        return;
    }
    
    const pat = geomDSL[name]();
    
    if (pendingBinaryOp) {
        const { aSource, bSource } = resolveBinaryOperandSources();
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
        unaryPreviewState.source = {
            type: 'primitive',
            index: null,
            pattern: pat
        };
        unaryModeJustEntered = false;
        workflowSelections = [];
        createUnaryPreview();
    }
    
    renderWorkflow();
    updateAllButtonStates();
}

function selectUnaryOp(name) {
    // Log button click for research
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
    unaryModeJustEntered = true;
    previewPattern = null;
    previewBackupPattern = null;
    setWorkspaceGlow(false);
    
    createUnaryPreview();
    renderWorkflow();
    updateAllButtonStates();
    updateInlinePreviewPanel();
}

function applyTransform(name) {
    selectUnaryOp(name);
}

function selectBinaryOp(op) {
    // Log button click for research
    logButtonClick('binary', op, {
        wasActive: pendingBinaryOp === op,
        previousOp: pendingBinaryOp
    });
    
    const prev = pendingBinaryOp;
    
    if (prev === op) {
        clearBinaryPreview();
    } else {
        pendingBinaryOp = op;
        pendingUnaryOp = null;
        resetUnaryPreviewState();
        workflowSelections = [];
        previewPattern = null;
        previewBackupPattern = null;
        resetInlinePreviewState();
    }
    
    renderWorkflow();
    updateAllButtonStates();
    updateInlinePreviewPanel();
}

function addOperation(op, metadata = {}) {
    const now = Date.now();
    const lastTimestamp = operationsHistory.length > 0 
        ? operationsHistory[operationsHistory.length - 1].timestamp 
        : Date.now();
    const interval = now - lastTimestamp;
    
    const entry = {
        operation: op,
        pattern: JSON.parse(JSON.stringify(currentPattern)),
        timestamp: now,
        intervalFromLast: interval,
        opFn: metadata.opFn,
        operands: metadata.operands
    };
    operationsHistory.push(entry);
    updateOperationsLog();
    updateAllButtonStates();
}

function updateOperationsLog() {
    renderWorkflow();
}

// ============ WORKFLOW & SELECTION ============
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
        
        // Favorite button/badge
        if (!isPatternFavorited(item.pattern)) {
            const favBtn = document.createElement('button');
            favBtn.className = 'favorite-btn favorite-add-btn';
            favBtn.title = 'Add to favorites';
            favBtn.textContent = '+';
            favBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleFavoriteFromWorkflow(idx);
            });
            entry.appendChild(favBtn);
        } else {
            const badge = document.createElement('div');
            badge.className = 'favorite-badge';
            badge.title = 'Favorited';
            badge.textContent = '★';
            entry.appendChild(badge);
        }
        
        const opText = item.operation || '';
        entry.onclick = () => onWorkflowClick(idx);
        
        const binaryMatch = opText.match(/^(add|subtract|union)\((.*)\)$/);
        const unaryOps = new Set(['invert', 'reflect_horizontal', 'reflect_vertical', 'reflect_diag']);
        const isUnary = item.opFn && unaryOps.has(item.opFn);
        
        if (binaryMatch) {
            const fn = binaryMatch[1];
            const svgWrap = document.createElement('div');
            svgWrap.className = 'operand-box program-result';
            const resultSvg = renderThumbnail(item.pattern, 4);
            svgWrap.appendChild(resultSvg);
            
            const expr = document.createElement('div');
            expr.className = 'program-expr';
            const opTok = document.createElement('span');
            opTok.className = 'program-expr-op';
            opTok.textContent = getOperationAbbreviation(fn) + '(';
            expr.appendChild(opTok);
            
            const aTok = document.createElement('div');
            aTok.className = 'operand-box program-operand';
            const aSvg = renderThumbnail(item.operands?.a || item.pattern, 3.5);
            aTok.appendChild(aSvg);
            expr.appendChild(aTok);
            
            const comma = document.createElement('span');
            comma.className = 'program-expr-comma';
            comma.textContent = ', ';
            expr.appendChild(comma);
            
            const bTok = document.createElement('div');
            bTok.className = 'operand-box program-operand';
            const bSvg = renderThumbnail(item.operands?.b || item.pattern, 3.5);
            bTok.appendChild(bSvg);
            expr.appendChild(bTok);
            
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
        } else if (isUnary) {
            const svgWrap = document.createElement('div');
            svgWrap.className = 'operand-box program-result';
            const resultSvg = renderThumbnail(item.pattern, 4);
            svgWrap.appendChild(resultSvg);
            
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
            const thumbSvg = renderThumbnail(item.pattern, 4);
            svgWrap.appendChild(thumbSvg);
            
            const label = document.createElement('div');
            label.className = 'thumb-label';
            label.textContent = formatOperationText(item.operation);
            
            const num = document.createElement('div');
            num.className = 'line-number';
            num.textContent = (idx + 1).toString();
            entry.appendChild(num);
            entry.appendChild(svgWrap);
            entry.appendChild(label);
        }
        
        const selPos = workflowSelections.indexOf(idx);
        if (selPos !== -1) {
            const badge = document.createElement('div');
            badge.className = 'selection-badge';
            badge.textContent = (selPos + 1).toString();
            entry.appendChild(badge);
        }
        
        workflow.appendChild(entry);
    });
    
    updateAllButtonStates();
    updateInlinePreviewPanel();
    renderFavoritesShelf();
}

function onWorkflowClick(idx) {
    if (pendingBinaryOp) {
        toggleWorkflowSelection(idx);
        createBinaryPreview();
        updateAllButtonStates();
    } else if (pendingUnaryOp) {
        if (!operationsHistory[idx] || !operationsHistory[idx].pattern) {
            return;
        }
        workflowSelections = [idx];
        unaryPreviewState.source = {
            type: 'history',
            index: idx,
            pattern: JSON.parse(JSON.stringify(operationsHistory[idx].pattern))
        };
        unaryModeJustEntered = false;
        updateWorkflowSelectionHighlight();
        createUnaryPreview();
    } else {
        if (operationsHistory[idx] && operationsHistory[idx].pattern) {
            const isAlreadySelected = workflowSelections.length === 1 && workflowSelections[0] === idx;
            
            if (isAlreadySelected) {
                workflowSelections = [];
                currentPattern = null;
                const workspace = document.getElementById('workspace');
                if (workspace) workspace.innerHTML = '';
                renderWorkflow();
            } else {
                currentPattern = JSON.parse(JSON.stringify(operationsHistory[idx].pattern));
                renderPattern(currentPattern, 'workspace');
                workflowSelections = [idx];
                renderWorkflow();
            }
        }
    }
}

function toggleWorkflowSelection(idx) {
    const pos = workflowSelections.indexOf(idx);
    const isCurrentlySelected = pos !== -1;
    
    if (isCurrentlySelected && (pendingBinaryOp || pendingUnaryOp)) {
        showToast('Cannot deselect operand. Use ⟲ Reset to cancel the operation.', 'warning');
        return;
    }
    
    if (!isCurrentlySelected && pendingBinaryOp && workflowSelections.length >= 2) {
        showToast('Two operands are already selected. Use ⟲ Reset to cancel the operation.', 'warning');
        return;
    }
    
    if (pos === -1) {
        if (pendingUnaryOp) {
            workflowSelections = [];
        }
        if (workflowSelections.length >= 2) {
            const removed = workflowSelections.shift();
            if (inlinePreview.aIndex === removed) inlinePreview.aIndex = null;
            if (inlinePreview.bIndex === removed) inlinePreview.bIndex = null;
        }
        workflowSelections.push(idx);
    } else {
        workflowSelections.splice(pos, 1);
        if (inlinePreview.aIndex === idx) inlinePreview.aIndex = null;
        if (inlinePreview.bIndex === idx) inlinePreview.bIndex = null;
    }
    renderWorkflow();
    updateInlinePreviewPanel();
}

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

// ============ PREVIEW FUNCTIONS ============
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
    
    if (aPattern && !bPattern) {
        previewPattern = null;
        previewBackupPattern = null;
        currentPattern = JSON.parse(JSON.stringify(aPattern));
        renderPattern(currentPattern, 'workspace');
        setWorkspaceGlow(false);
        updateInlinePreviewPanel();
        return;
    }
    
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
        }
    };
    
    unaryPreviewState.op = pendingUnaryOp;
    unaryPreviewState.source = {
        type: source.type,
        index: source.index ?? null,
        pattern: JSON.parse(JSON.stringify(source.pattern))
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
    
    const base = (operationsHistory.length > 0) ? operationsHistory[operationsHistory.length - 1].pattern : geomDSL.blank();
    currentPattern = JSON.parse(JSON.stringify(base));
    renderPattern(currentPattern, 'workspace');
    
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

function applySelectedBinary() {
    if (!previewPattern) {
        showToast('No preview available to confirm', 'warning');
        return;
    }
    
    currentPattern = JSON.parse(JSON.stringify(previewPattern));
    renderPattern(currentPattern, 'workspace');
    
    function operandLabel(opnd) {
        if (!opnd) return '•';
        const found = operationsHistory.findIndex(e => JSON.stringify(e.pattern) === JSON.stringify(opnd));
        if (found >= 0) return `${found+1}`;
        return '•';
    }
    
    const a = previewBackupPattern && previewBackupPattern.operands ? previewBackupPattern.operands.a : null;
    const b = previewBackupPattern && previewBackupPattern.operands ? previewBackupPattern.operands.b : null;
    const labelA = operandLabel(a);
    const labelB = operandLabel(b);
    
    const opText = `${pendingBinaryOp}(${labelA}, ${labelB})`;
    addOperation(opText, {
        opFn: pendingBinaryOp,
        operands: { a: a, b: b }
    });
    
    const last = operationsHistory[operationsHistory.length - 1];
    last.opFn = pendingBinaryOp;
    last.operands = { a: a, b: b };
    
    if (inlinePreview.aFromFavorite || inlinePreview.bFromFavorite) {
        last.helperUsed = true;
    }
    
    // Log operation completion for research
    logOperationComplete(pendingBinaryOp, { a: a, b: b }, currentPattern);
    
    workflowSelections = [operationsHistory.length - 1];
    clearBinaryPreview();
    renderWorkflow();
}

function applySelectedUnary() {
    if (!pendingUnaryOp || !previewPattern) {
        showToast('No preview available to confirm', 'warning');
        return;
    }
    
    const sourceSnapshot = previewBackupPattern && previewBackupPattern.operands
        ? previewBackupPattern.operands.input
        : (unaryPreviewState.source && unaryPreviewState.source.pattern);
    
    currentPattern = JSON.parse(JSON.stringify(previewPattern));
    renderPattern(currentPattern, 'workspace');
    
    let operandLabel = '•';
    if (unaryPreviewState.source && typeof unaryPreviewState.source.index === 'number') {
        operandLabel = `${unaryPreviewState.source.index + 1}`;
    }
    
    const operandCopy = sourceSnapshot !== undefined && sourceSnapshot !== null
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
    
    // Log operation completion for research
    logOperationComplete(pendingUnaryOp, { input: operandCopy }, currentPattern);
    
    workflowSelections = [operationsHistory.length - 1];
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

// ============ PREVIEW PANEL UI ============
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
            add: { hint: 'ADD – combine two patterns and keep all filled cells.' },
            subtract: { hint: 'SUBTRACT – choose a base pattern, then remove the second.' },
            union: { hint: 'UNION – keep only the overlapping cells from both patterns.' }
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
            invert: { hint: 'INVERT – flip filled and empty cells in the selected pattern.' },
            reflect_horizontal: { hint: 'FLIP H – reflect the pattern top ↔ bottom.' },
            reflect_vertical: { hint: 'FLIP V – reflect the pattern left ↔ right.' },
            reflect_diag: { hint: 'FLIP D – reflect the pattern across the diagonal.' }
        };
        
        const config = unaryMessages[pendingUnaryOp] || { hint: 'Unary transform preview.' };
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

// ============ BUTTON STATES ============
function updateAllButtonStates() {
    const isBinaryMode = (pendingBinaryOp !== null);
    const isUnaryMode = (pendingUnaryOp !== null);
    
    // Primitives
    const prims = document.querySelectorAll('.primitive-btn');
    prims.forEach(b => {
        if (isBinaryMode || isUnaryMode) {
            b.classList.remove('disabled');
            b.classList.add('enabled');
            b.title = b.getAttribute('data-original-title') || 'Create a pattern to use in the current operation';
        } else {
            b.classList.add('disabled');
            b.classList.remove('enabled');
            b.title = 'Select an operation first to use primitives';
        }
    });
    
    // Unary buttons
    const unaryButtons = document.querySelectorAll('.unary-btn');
    unaryButtons.forEach(btn => {
        const op = btn.getAttribute('data-op');
        btn.classList.remove('disabled');
        btn.classList.add('enabled');
        btn.title = btn.getAttribute('data-original-title') || '';
        
        if (pendingUnaryOp === op) {
            btn.classList.add('selected');
        } else {
            btn.classList.remove('selected');
        }
    });
    
    // Binary buttons
    const bins = ['add','subtract','union'];
    bins.forEach(name => {
        const btn = document.getElementById('bin-' + name);
        if (!btn) return;
        
        if (pendingBinaryOp === name) {
            btn.classList.add('selected');
            btn.classList.remove('disabled');
            btn.classList.add('enabled');
            btn.title = btn.getAttribute('data-original-title') || '';
        } else {
            btn.classList.remove('selected');
            btn.classList.remove('disabled');
            btn.classList.add('enabled');
            btn.title = btn.getAttribute('data-original-title') || '';
        }
    });
}

// ============ INITIALIZATION ============
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

function initializeApp() {
    // Clear gallery at the start of each free play session
    localStorage.removeItem('patternGallery');
    
    // Load favorites from localStorage
    favorites = loadFavoritesFromStorage();
    
    // Initialize session recording for research
    initializeSessionRecord();
    
    initializePrimitiveIcons();
    initializePreviewControllers();
    bindButtonInteractions();
    registerKeyboardShortcuts();
    updateInlinePreviewPanel();
    renderFavoritesShelf();
    updateGalleryCount();
    
    // Initialize workspace
    renderPattern(currentPattern, 'workspace');
    
    // Seed with add(blank, ?) like in task mode
    seedAddPreviewWithBlankOperand();
}

function initializePreviewControllers() {
    pendingBinaryOp = null;
    pendingUnaryOp = null;
    inlinePreview = createInlinePreviewState();
    unaryPreviewState = createUnaryPreviewState();
    appState.inlinePreview = inlinePreview;
    appState.unaryPreviewState = unaryPreviewState;
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
    
    // Bind End Free Play button
    const endBtn = document.getElementById('endFreePlayBtn');
    console.log('Looking for End Free Play button:', endBtn);
    if (endBtn) {
        console.log('End Free Play button found, adding event listener');
        endBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('End Free Play button clicked!');
            endFreePlayMode();
        });
        // Also test if button is clickable
        console.log('Button style:', window.getComputedStyle(endBtn).display);
    } else {
        console.error('End Free Play button not found in DOM');
    }
}

function handleShortcut(event) {
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
    document.addEventListener('keydown', handleShortcut);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

// Export all session data for research
function exportAllSessionData() {
    const allSessions = JSON.parse(localStorage.getItem('freeplaySessions') || '[]');
    const gallery = getGalleryFromStorage();
    const helpers = loadFavoritesFromStorage();
    
    const exportData = {
        exportDate: new Date().toISOString(),
        totalSessions: allSessions.length,
        sessions: allSessions,
        gallery: gallery,
        helpers: helpers,
        currentSession: sessionRecord
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.download = `freeplay_data_${Date.now()}.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    
    showToast('Session data exported!', 'success', 2000);
}

// End free play mode and show completion modal
function endFreePlayMode() {
    try {
        // Finalize session recording - IMPORTANT: This data is still recorded for research!
        if (sessionRecord) {
            sessionRecord.endTime = new Date().toISOString();
            sessionRecord.durationSeconds = Math.floor((new Date() - new Date(sessionRecord.startTime)) / 1000);
            saveSessionRecord();
        }
        
        // Collect statistics for research (not displayed to user, but saved in data)
        const gallery = getGalleryFromStorage();
        const totalOps = sessionRecord ? sessionRecord.operationActions.length : 0;
        const helpersUsed = sessionRecord ? Object.keys(sessionRecord.helperUsageCount).length : 0;
        
        // Log for debugging/verification
        console.log('Session completed - Stats collected for research:', {
            patternsCreated: gallery.length,
            totalOperations: totalOps,
            helpersUsed: helpersUsed
        });
        
        // Render patterns (display only, stats hidden from user)
        const grid = document.getElementById('creationsGrid');
        grid.innerHTML = '';
        
        if (gallery.length === 0) {
            grid.innerHTML = '<p style="color: #64748b; text-align: center; grid-column: 1/-1; font-size: 0.95rem; padding: 2rem;">No patterns saved</p>';
        } else {
            gallery.forEach((item, i) => {
                const card = document.createElement('div');
                card.style.cssText = 'background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 8px; padding: 0.5rem; transition: all 0.2s;';
                
                const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                svg.setAttribute('viewBox', `0 0 ${SIZE * 10} ${SIZE * 10}`);
                svg.style.cssText = 'width: 100%; height: auto; background: #ffffff; border-radius: 4px;';
                
                // item.pattern is already a 2D array (grid)
                const pattern = item.pattern;
                for (let r = 0; r < SIZE; r++) {
                    for (let c = 0; c < SIZE; c++) {
                        if (pattern[r] && pattern[r][c]) {
                            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                            rect.setAttribute('x', c * 10);
                            rect.setAttribute('y', r * 10);
                            rect.setAttribute('width', 10);
                            rect.setAttribute('height', 10);
                            rect.setAttribute('fill', '#1e3a8a');
                            svg.appendChild(rect);
                        }
                    }
                }
                
                card.appendChild(svg);
                
                const label = document.createElement('div');
                label.style.cssText = 'font-size: 0.7rem; color: #64748b; text-align: center; margin-top: 0.4rem; font-weight: 500;';
                label.textContent = `#${i + 1}`;
                card.appendChild(label);
                
                grid.appendChild(card);
            });
        }
        
        // Show modal
        const modal = document.getElementById('freeplayCompletionModal');
        if (modal) {
            modal.style.display = 'flex';
        } else {
            console.error('Modal not found!');
        }
    } catch (error) {
        console.error('Error in endFreePlayMode:', error);
    }
}

// Download combined task + free play data
function downloadCombinedData() {
    // Load task data from localStorage
    const taskDataStr = localStorage.getItem('taskExperimentData');
    const taskCompletionTime = localStorage.getItem('taskCompletionTime');
    
    let taskData = null;
    if (taskDataStr) {
        try {
            taskData = JSON.parse(taskDataStr);
        } catch (e) {
            console.error('Failed to parse task data:', e);
        }
    }
    
    // Get free play data
    const allSessions = JSON.parse(localStorage.getItem('freeplaySessions') || '[]');
    const gallery = getGalleryFromStorage();
    const helpers = loadFavoritesFromStorage();
    
    // Build combined export
    const combinedData = {
        metadata: {
            experimentName: 'Pattern Experiment - Complete',
            taskCompletionTime: taskCompletionTime || 'unknown',
            freePlayCompletionTime: new Date().toISOString(),
            includesFreePlay: true,
            exportDate: new Date().toISOString()
        },
        taskData: taskData || { note: 'No task data found' },
        freePlayData: {
            totalSessions: allSessions.length,
            sessions: allSessions,
            gallery: gallery,
            finalHelpers: helpers,
            summary: {
                totalPatternsSaved: gallery.length,
                totalOperations: allSessions.reduce((sum, s) => sum + (s.operationActions?.length || 0), 0),
                totalButtonClicks: allSessions.reduce((sum, s) => sum + (s.buttonClickActions?.length || 0), 0),
                uniqueHelpersCreated: helpers.length
            }
        }
    };
    
    // Create and download file
    const dataStr = JSON.stringify(combinedData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.download = `pattern_experiment_complete_${Date.now()}.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    
    showToast('Complete experiment data downloaded!', 'success', 3000);
}

// Expose functions globally
Object.assign(globalScope, {
    selectBinaryOp,
    applyTransform,
    applyPrimitive,
    confirmPendingOperation,
    resetPendingOperation,
    addLastToFavorites,
    saveToGallery,
    viewGallery,
    clearWorkspace,
    exportAllSessionData,
    endFreePlayMode,
    downloadCombinedData
});
