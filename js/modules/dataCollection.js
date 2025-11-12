/**
 * Enhanced Data Collection Module
 * Based on magic-stones design but adapted for pattern DSL experiment
 */

// ============================================
// Global Experiment Metadata
// ============================================
export const experimentMetadata = {
    experimentId: 'pattern_dsl_v1',
    participantId: generateParticipantId(),
    startTime: null,
    endTime: null,
    totalDuration: 0,
    
    config: {
        randomized: false,
        trialOrder: [],
        pointsMax: 100,
        pointsPerCorrect: null // will be calculated
    },
    
    tutorial: {
        completed: false,
        stepsCompleted: 0,
        timeSpent: 0,
        startTime: null,
        endTime: null
    },
    
    practice: {
        completed: false,
        exercises: []
    },
    
    comprehension: {
        passed: false,
        attempts: 0,
        answers: []
    },
    
    system: {
        userAgent: navigator.userAgent,
        screenResolution: `${screen.width}x${screen.height}`,
        windowSize: `${window.innerWidth}x${window.innerHeight}`,
        browser: detectBrowser(),
        platform: navigator.platform,
        language: navigator.language
    }
};

// ============================================
// Trial Data Structure (Enhanced)
// ============================================
export function createTrialRecord(trialNumber, problemIndex, problemName) {
    return {
        trial: trialNumber,
        problemIndex: problemIndex,
        problemName: problemName,
        
        // Timing
        startedAt: Date.now(),
        submittedAt: null,
        timeSpent: 0,
        
        // Target pattern (will be set separately)
        targetPattern: null,
        
        // Build history with detailed tracking
        buildHistory: [],
        
        // Favorites interactions
        favoritesActions: [],
        
        // Final submission
        submitted: false,
        finalPattern: null,
        finalStepCount: 0,
        
        // Results
        success: null,
        exactMatch: null,
        
        // Points
        pointsEarned: 0,
        pointsAwarded: 0,
        totalPointsAfter: 0,
        
        // Favorites snapshot at trial end
        favoritesSnapshot: []
    };
}

// ============================================
// Build Step Data Structure
// ============================================
export function createBuildStep(stepNumber, operationType, operation) {
    return {
        stepId: `s${Date.now()}_${Math.floor(Math.random() * 10000)}`,
        stepNumber: stepNumber,
        timestamp: Date.now(),
        
        // Operation type: 'binary', 'unary', 'primitive'
        operationType: operationType,
        operation: operation, // e.g., 'add', 'invert', etc.
        
        // Operands with source tracking
        operands: {}, // Will be populated: { a: {...}, b: {...} } or { input: {...} }
        
        // Result
        resultPattern: null,
        
        // User behavior tracking
        previewViewed: false,
        previewStartTime: null,
        previewDuration: 0,
        resetCount: 0,
        confirmTime: null,
        confirmDelay: 0 // Time from preview to confirm
    };
}

// ============================================
// Operand Source Tracking
// ============================================
export function createOperandInfo(source, pattern, label = '', sourceId = null) {
    return {
        source: source, // 'primitive', 'history', 'favorite', 'workspace'
        sourceId: sourceId, // null for primitives, step index for history, favorite ID for favorites
        pattern: JSON.parse(JSON.stringify(pattern)), // Deep copy
        label: label // Display label
    };
}

// ============================================
// Favorites Action Tracking
// ============================================
export function createFavoriteAction(action, favoriteId, stepId = null, pattern = null) {
    return {
        action: action, // 'add', 'remove', 'use'
        timestamp: Date.now(),
        favoriteId: favoriteId,
        stepId: stepId, // Which step was added/used from
        pattern: pattern ? JSON.parse(JSON.stringify(pattern)) : null
    };
}

// ============================================
// Session Storage Management
// ============================================
const STORAGE_KEY = 'pattern_experiment_data';
const METADATA_KEY = 'pattern_experiment_metadata';

export function saveToSessionStorage(allTrialsData) {
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(allTrialsData));
        sessionStorage.setItem(METADATA_KEY, JSON.stringify(experimentMetadata));
    } catch (e) {
        console.error('Failed to save to sessionStorage:', e);
    }
}

export function loadFromSessionStorage() {
    try {
        const data = sessionStorage.getItem(STORAGE_KEY);
        const metadata = sessionStorage.getItem(METADATA_KEY);
        return {
            trials: data ? JSON.parse(data) : [],
            metadata: metadata ? JSON.parse(metadata) : null
        };
    } catch (e) {
        console.error('Failed to load from sessionStorage:', e);
        return { trials: [], metadata: null };
    }
}

export function clearSessionStorage() {
    try {
        sessionStorage.removeItem(STORAGE_KEY);
        sessionStorage.removeItem(METADATA_KEY);
    } catch (e) {
        console.error('Failed to clear sessionStorage:', e);
    }
}

// ============================================
// Data Export Functions
// ============================================
export function exportDataAsJSON(allTrialsData, includeMetadata = true) {
    const exportData = {
        experimentMetadata: experimentMetadata,
        trials: allTrialsData,
        exportedAt: new Date().toISOString()
    };
    
    return JSON.stringify(exportData, null, 2);
}

export function downloadDataFile(allTrialsData, filename = null) {
    if (!filename) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        filename = `pattern_experiment_${experimentMetadata.participantId}_${timestamp}.json`;
    }
    
    const jsonData = exportDataAsJSON(allTrialsData);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ============================================
// Helper Functions
// ============================================
function generateParticipantId() {
    // Generate a unique participant ID
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `P${timestamp}_${random}`;
}

function detectBrowser() {
    const ua = navigator.userAgent;
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
    if (ua.includes('Edg')) return 'Edge';
    if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
    return 'Unknown';
}

// ============================================
// Metadata Update Functions
// ============================================
export function setExperimentStart() {
    experimentMetadata.startTime = new Date().toISOString();
}

export function setExperimentEnd() {
    experimentMetadata.endTime = new Date().toISOString();
    if (experimentMetadata.startTime) {
        const start = new Date(experimentMetadata.startTime);
        const end = new Date(experimentMetadata.endTime);
        experimentMetadata.totalDuration = end - start;
    }
}

export function setTrialOrder(order) {
    experimentMetadata.config.trialOrder = [...order];
}

export function setPointsConfig(pointsMax, pointsPerCorrect) {
    experimentMetadata.config.pointsMax = pointsMax;
    experimentMetadata.config.pointsPerCorrect = pointsPerCorrect;
}

export function setTutorialComplete(stepsCompleted, startTime, endTime) {
    experimentMetadata.tutorial.completed = true;
    experimentMetadata.tutorial.stepsCompleted = stepsCompleted;
    experimentMetadata.tutorial.startTime = startTime;
    experimentMetadata.tutorial.endTime = endTime;
    if (startTime && endTime) {
        experimentMetadata.tutorial.timeSpent = new Date(endTime) - new Date(startTime);
    }
}

export function addPracticeExercise(exerciseId, success, steps, timeSpent) {
    experimentMetadata.practice.exercises.push({
        exerciseId,
        success,
        steps,
        timeSpent
    });
}

export function setPracticeComplete() {
    experimentMetadata.practice.completed = true;
}

export function setComprehensionResult(passed, attempts, answers) {
    experimentMetadata.comprehension.passed = passed;
    experimentMetadata.comprehension.attempts = attempts;
    experimentMetadata.comprehension.answers = [...answers];
}

// ============================================
// Auto-save Mechanism
// ============================================
let autoSaveInterval = null;

export function startAutoSave(allTrialsDataRef, intervalMs = 30000) {
    if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
    }
    
    autoSaveInterval = setInterval(() => {
        saveToSessionStorage(allTrialsDataRef());
    }, intervalMs);
}

export function stopAutoSave() {
    if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
        autoSaveInterval = null;
    }
}

// ============================================
// Page Unload Protection
// ============================================
export function setupUnloadProtection(allTrialsDataRef) {
    window.addEventListener('beforeunload', (e) => {
        // Save data before leaving
        saveToSessionStorage(allTrialsDataRef());
        
        // Show warning if experiment is in progress
        if (allTrialsDataRef().length > 0 && !experimentMetadata.endTime) {
            e.preventDefault();
            e.returnValue = '';
            return '';
        }
    });
}
