/**
 * Enhanced Data Collection Integration for task.js
 * 
 * This file provides wrapper functions that integrate with the existing task.js
 * code to add enhanced data collection without modifying core logic extensively.
 */

import {
    createBuildStep,
    createOperandInfo,
    createFavoriteAction,
    saveToSessionStorage
} from './dataCollection.js';

/**
 * Record a binary operation with detailed tracking
 */
export function recordBinaryOperation(
    currentTrialRecord,
    allTrialsData,
    operation,
    aSource,
    bSource,
    aPattern,
    bPattern,
    resultPattern,
    labelA,
    labelB
) {
    if (!currentTrialRecord || !currentTrialRecord.buildHistory) {
        return;
    }
    
    const confirmTime = Date.now();
    const stepNumber = currentTrialRecord.buildHistory.length + 1;
    const buildStep = createBuildStep(stepNumber, 'binary', operation);
    
    // Record operands with source tracking
    if (aSource && aPattern) {
        buildStep.operands.a = createOperandInfo(
            aSource.type || 'unknown',
            aPattern,
            labelA || '',
            aSource.index ?? null
        );
    }
    if (bSource && bPattern) {
        buildStep.operands.b = createOperandInfo(
            bSource.type || 'unknown',
            bPattern,
            labelB || '',
            bSource.index ?? null
        );
    }
    
    // Record result
    buildStep.resultPattern = JSON.parse(JSON.stringify(resultPattern));
    buildStep.confirmTime = confirmTime;
    
    currentTrialRecord.buildHistory.push(buildStep);
    currentTrialRecord.finalStepCount = currentTrialRecord.buildHistory.length;
    
    // Save to session storage
    saveToSessionStorage(allTrialsData);
}

/**
 * Record a unary operation with detailed tracking
 */
export function recordUnaryOperation(
    currentTrialRecord,
    allTrialsData,
    operation,
    source,
    inputPattern,
    resultPattern,
    label
) {
    if (!currentTrialRecord || !currentTrialRecord.buildHistory) {
        return;
    }
    
    const confirmTime = Date.now();
    const stepNumber = currentTrialRecord.buildHistory.length + 1;
    const buildStep = createBuildStep(stepNumber, 'unary', operation);
    
    // Record operand with source tracking
    if (source && inputPattern) {
        buildStep.operands.input = createOperandInfo(
            source.type || 'unknown',
            inputPattern,
            label || '',
            source.index ?? null
        );
    }
    
    // Record result
    buildStep.resultPattern = JSON.parse(JSON.stringify(resultPattern));
    buildStep.confirmTime = confirmTime;
    
    currentTrialRecord.buildHistory.push(buildStep);
    currentTrialRecord.finalStepCount = currentTrialRecord.buildHistory.length;
    
    // Save to session storage
    saveToSessionStorage(allTrialsData);
}

/**
 * Record a primitive operation
 */
export function recordPrimitiveOperation(
    currentTrialRecord,
    allTrialsData,
    primitiveName,
    resultPattern
) {
    if (!currentTrialRecord || !currentTrialRecord.buildHistory) {
        return;
    }
    
    const confirmTime = Date.now();
    const stepNumber = currentTrialRecord.buildHistory.length + 1;
    const buildStep = createBuildStep(stepNumber, 'primitive', primitiveName);
    
    // For primitives, no input operands, just the result
    buildStep.resultPattern = JSON.parse(JSON.stringify(resultPattern));
    buildStep.confirmTime = confirmTime;
    
    currentTrialRecord.buildHistory.push(buildStep);
    currentTrialRecord.finalStepCount = currentTrialRecord.buildHistory.length;
    
    // Save to session storage
    saveToSessionStorage(allTrialsData);
}

/**
 * Record a favorite action (add/remove/use)
 */
export function recordFavoriteAction(
    currentTrialRecord,
    allTrialsData,
    action,
    favoriteId,
    stepId = null,
    pattern = null
) {
    if (!currentTrialRecord || !currentTrialRecord.favoritesActions) {
        return;
    }
    
    const favoriteAction = createFavoriteAction(action, favoriteId, stepId, pattern);
    currentTrialRecord.favoritesActions.push(favoriteAction);
    
    // Save to session storage
    saveToSessionStorage(allTrialsData);
}

/**
 * Snapshot favorites state at trial end
 */
export function snapshotFavorites(currentTrialRecord, allTrialsData, favorites) {
    if (!currentTrialRecord || !currentTrialRecord.favoritesSnapshot) {
        return;
    }
    
    currentTrialRecord.favoritesSnapshot = favorites.map((fav, index) => ({
        id: fav.id,
        pattern: JSON.parse(JSON.stringify(fav.pattern)),
        createdInTrial: currentTrialRecord.trial,
        index: index
    }));
    
    // Save to session storage
    saveToSessionStorage(allTrialsData);
}
