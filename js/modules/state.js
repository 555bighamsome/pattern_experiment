const SIZE = 10;
const CELL_SIZE = 40;
const POINTS_MAX = 100;

const appState = {
    currentTestIndex: 0,
    currentPattern: null,
    targetPattern: null,
    operationsHistory: [],
    workflowSelections: [],
    pendingBinaryOp: null,
    pendingUnaryOp: null,
    previewPattern: null,
    previewBackupPattern: null,
    pointsPerCorrect: 0,
    totalPoints: 0,
    favorites: [],
    inlinePreview: null,
    unaryPreviewState: null,
    unaryModeJustEntered: false,
    allTrialsData: [],
    trialStartTime: null,
    testOrder: [],
    shouldRandomize: false,
    currentTrialRecord: null
};

const globalScope = typeof window !== 'undefined' ? window : globalThis;

const stateBindings = [
    'currentTestIndex',
    'currentPattern',
    'targetPattern',
    'operationsHistory',
    'workflowSelections',
    'pendingBinaryOp',
    'pendingUnaryOp',
    'previewPattern',
    'previewBackupPattern',
    'pointsPerCorrect',
    'totalPoints',
    'favorites',
    'inlinePreview',
    'unaryPreviewState',
    'unaryModeJustEntered',
    'allTrialsData',
    'trialStartTime',
    'testOrder',
    'shouldRandomize',
    'currentTrialRecord'
];

stateBindings.forEach((key) => {
    Object.defineProperty(globalScope, key, {
        configurable: false,
        enumerable: false,
        get() {
            return appState[key];
        },
        set(value) {
            appState[key] = value;
        }
    });
});

let tutorialMode = false;

export {
    SIZE,
    CELL_SIZE,
    POINTS_MAX,
    appState,
    stateBindings,
    globalScope
};

export function isTutorialMode() {
    return tutorialMode;
}

export function setTutorialMode(value) {
    tutorialMode = Boolean(value);
}

export function checkTutorialProgress() {
    // no-op placeholder retained for legacy calls
}
