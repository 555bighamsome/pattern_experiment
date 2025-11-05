// Tutorial System for Pattern DSL Experiment
// Separated from main experiment code for better organization

// Tutorial state management
let tutorialMode = false;
let tutorialCurrentStep = 0;
let tutorialFlags = { loadedFromBackpack: false };
let tutorialOverlay = null;

// Tutorial patterns - designed to teach operations without revealing experiment stimuli
const tutorialCases = [
    // Tutorial 1: Single horizontal line (teaches basic primitive)
    {
        name: "Tutorial-1",
        hint: "Let's start simple! Create a horizontal line by clicking the 'line_horizontal' button in the Primitives section.",
        expectedOps: ["line_horizontal"],
        generate: () => [
            [0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0],
            [1,1,1,1,1,1,1,1,1,1],
            [0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0]
        ]
    },

    // Tutorial 2: Simple corner (teaches binary operation - add)
    {
        name: "Tutorial-2",
        hint: "Now let's combine two patterns! Click 'add' in Operations, then select 'line_horizontal', then 'diagonal'. Finally click 'Confirm'.",
        expectedOps: ["add"],
        generate: () => [
            [1,0,0,0,0,0,0,0,0,0],
            [0,1,0,0,0,0,0,0,0,0],
            [0,0,1,0,0,0,0,0,0,0],
            [0,0,0,1,0,0,0,0,0,0],
            [0,0,0,0,1,0,0,0,0,0],
            [1,1,1,1,1,1,1,1,1,1],
            [0,0,0,0,0,0,1,0,0,0],
            [0,0,0,0,0,0,0,1,0,0],
            [0,0,0,0,0,0,0,0,1,0],
            [0,0,0,0,0,0,0,0,0,1]
        ]
    },

    // Tutorial 3: Inverted blank (teaches unary transform - invert)
    {
        name: "Tutorial-3",
        hint: "Time to transform! Click 'invert', then select 'blank', and click 'Confirm' to create a filled pattern.",
        expectedOps: ["invert"],
        generate: () => [
            [1,1,1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1,1,1]
        ]
    },

    // Tutorial 4: Simple frame (teaches subtract operation and workflow reuse)
    {
        name: "Tutorial-4",
        hint: "Final challenge! Create a frame by using 'subtract'. First make a filled pattern (invert blank), then subtract a square from it. Try clicking items in 'Your Program' to reuse them!",
        expectedOps: ["subtract"],
        generate: () => [
            [1,1,1,1,1,1,1,1,1,1],
            [1,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,1],
            [1,1,1,1,1,1,1,1,1,1]
        ]
    }
];

// Check if tutorial has been completed
function hasTutorialBeenCompleted() {
    try {
        return localStorage.getItem('tutorialCompleted') === 'true';
    } catch (e) {
        console.warn('localStorage not available:', e);
        return false;
    }
}

// Mark tutorial as completed
function markTutorialAsCompleted() {
    try {
        localStorage.setItem('tutorialCompleted', 'true');
        localStorage.setItem('tutorialCompletedAt', new Date().toISOString());
    } catch (e) {
        console.warn('Cannot save tutorial completion status:', e);
    }
}

// Reset tutorial completion (for testing/debugging)
function resetTutorialCompletion() {
    try {
        localStorage.removeItem('tutorialCompleted');
        localStorage.removeItem('tutorialCompletedAt');
    } catch (e) {
        console.warn('Cannot reset tutorial completion:', e);
    }
}

// Show tutorial hint overlay
function showTutorialHint(message) {
    if (!tutorialMode) return;

    let overlay = document.getElementById('tutorialOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'tutorialOverlay';
        overlay.className = 'tutorial-overlay';
        document.body.appendChild(overlay);
    }

    overlay.innerHTML = `
        <div class="tutorial-hint-box">
            <div class="tutorial-step-indicator">Tutorial ${tutorialCurrentStep + 1} / ${tutorialCases.length}</div>
            <div class="tutorial-hint-message">${message}</div>
            <div class="tutorial-hint-footer">
                <span class="tutorial-hint-tip">💡 Try to recreate the target pattern shown on the left</span>
            </div>
        </div>
    `;
    overlay.style.display = 'flex';
}

// Hide tutorial hint overlay
function hideTutorialHint() {
    const overlay = document.getElementById('tutorialOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// Check and show tutorial progress hints
function checkTutorialProgress() {
    if (!tutorialMode) return;

    const currentCase = tutorialCases[tutorialCurrentStep];
    if (!currentCase || !currentCase.hint) return;

    // Show the hint for the current step
    showTutorialHint(currentCase.hint);
}

// Complete tutorial and show completion modal
function completeTutorial() {
    tutorialMode = false;
    hideTutorialHint();

    // Mark as completed
    markTutorialAsCompleted();

    // Show completion modal
    const modal = document.createElement('div');
    modal.className = 'tutorial-completion-modal';
    modal.innerHTML = `
        <div class="tutorial-completion-content">
            <div class="tutorial-completion-icon">🎉</div>
            <h2>Tutorial Complete!</h2>
            <p>Great job! You've learned all the operations.</p>
            <p>Now you're ready to start the main experiment with 18 patterns.</p>
            <div class="tutorial-completion-actions">
                <button class="btn btn-primary tutorial-start-experiment-btn" onclick="startExperimentFromTutorial()">
                    Start Experiment
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Start experiment after completing tutorial
function startExperimentFromTutorial() {
    // Remove tutorial completion modal
    const modal = document.querySelector('.tutorial-completion-modal');
    if (modal) modal.remove();

    // Reset tutorial state
    tutorialMode = false;
    tutorialCurrentStep = 0;

    // Start the actual experiment
    startExperiment();
}

// Go back to welcome screen
function backToWelcome() {
    // Remove tutorial completion modal
    const modal = document.querySelector('.tutorial-completion-modal');
    if (modal) modal.remove();

    // Hide experiment content
    document.getElementById('experimentContent').classList.add('hidden');

    // Show welcome screen
    document.getElementById('welcomeScreen').style.display = 'flex';

    // Reset state
    tutorialMode = false;
    tutorialCurrentStep = 0;
    currentTestIndex = 0;
    totalPoints = 0;

    // Update UI to reflect tutorial completion status
    setTimeout(() => updateWelcomeScreenForTutorial(), 100);
}

// Start tutorial mode
function startTutorial() {
    tutorialMode = true;
    tutorialCurrentStep = 0;

    document.getElementById('welcomeScreen').style.display = 'none';
    document.getElementById('experimentContent').classList.remove('hidden');

    // Hide points card during tutorial
    const pointsCard = document.getElementById('pointsCard');
    if (pointsCard) {
        pointsCard.style.display = 'none';
    }

    // Update progress bar for tutorial
    const totalTrialsEl = document.getElementById('totalTrials');
    if (totalTrialsEl) {
        totalTrialsEl.textContent = String(tutorialCases.length);
    }

    loadTutorialStep(0);
}

// Load a specific tutorial step
function loadTutorialStep(stepIndex) {
    if (stepIndex >= tutorialCases.length) {
        completeTutorial();
        return;
    }

    tutorialCurrentStep = stepIndex;
    const tutorialCase = tutorialCases[stepIndex];

    // Update progress
    const currentTrialEl = document.getElementById('currentTrial');
    if (currentTrialEl) {
        currentTrialEl.textContent = String(stepIndex + 1);
    }

    const progressFill = document.getElementById('progressFill');
    if (progressFill) {
        const percent = ((stepIndex + 1) / tutorialCases.length) * 100;
        progressFill.style.width = `${percent}%`;
    }

    const percentComplete = document.getElementById('percentComplete');
    if (percentComplete) {
        const percent = Math.round(((stepIndex + 1) / tutorialCases.length) * 100);
        percentComplete.textContent = `${percent}%`;
    }

    // Update target number
    const targetNumberEl = document.getElementById('targetNumber');
    if (targetNumberEl) {
        targetNumberEl.textContent = `Tutorial ${stepIndex + 1}`;
    }

    // Load the target pattern
    targetPattern = tutorialCase.generate();
    renderPattern(targetPattern, 'targetPattern');

    // Reset workspace
    currentPattern = geomDSL.blank();
    renderPattern(currentPattern, 'workspace');

    // Clear operations history
    operationsHistory = [];
    updateOperationsLog();

    // Reset pending operations
    pendingBinaryOp = null;
    pendingUnaryOp = null;
    workflowSelections = [];
    updateAllButtonStates();

    // Show tutorial hint
    checkTutorialProgress();
}

// Handle tutorial submission (called from submitAnswer in main script)
function handleTutorialSubmit(match) {
    const modal = document.getElementById('feedbackModal');
    const icon = document.getElementById('feedbackIcon');
    const message = document.getElementById('feedbackMessage');

    if (modal && icon && message) {
        if (match) {
            icon.textContent = '✓';
            icon.className = 'feedback-icon success';
            message.textContent = `Excellent! You completed Tutorial ${tutorialCurrentStep + 1}.\n${tutorialCurrentStep < tutorialCases.length - 1 ? 'Moving to next tutorial...' : 'Tutorial complete!'}`;
        } else {
            icon.textContent = '✗';
            icon.className = 'feedback-icon error';
            message.textContent = 'Not quite right. Try again!\nCheck the hint above for guidance.';
        }

        modal.classList.add('show');

        setTimeout(() => {
            modal.classList.remove('show');
            if (match) {
                // Move to next tutorial step on success
                hideTutorialHint();
                loadTutorialStep(tutorialCurrentStep + 1);
            }
        }, 2000);
    }
    return true; // Indicates tutorial handled the submission
}

// Update UI based on tutorial completion status
function updateWelcomeScreenForTutorial() {
    const experimentBtn = document.querySelector('.start-btn[onclick="startExperiment()"]');
    const tutorialBtn = document.querySelector('.start-btn[onclick="startTutorial()"]');

    if (!experimentBtn) return;

    const isCompleted = hasTutorialBeenCompleted();

    if (isCompleted) {
        // Tutorial completed - enable experiment button
        experimentBtn.disabled = false;
        experimentBtn.style.opacity = '1';
        experimentBtn.style.cursor = 'pointer';
        experimentBtn.title = 'Start the main experiment';

        // Update tutorial button text
        if (tutorialBtn) {
            tutorialBtn.innerHTML = '🔄 Redo Tutorial (Optional)';
        }

        // Add completion badge
        let badge = document.getElementById('tutorialCompleteBadge');
        if (!badge) {
            badge = document.createElement('div');
            badge.id = 'tutorialCompleteBadge';
            badge.style.cssText = `
                margin-top: 0.5rem;
                padding: 0.5rem 1rem;
                background: #dcfce7;
                border: 1px solid #86efac;
                border-radius: 0.5rem;
                color: #166534;
                font-size: 0.9rem;
                text-align: center;
            `;
            badge.innerHTML = '✅ Tutorial completed! You can now start the experiment.';
            experimentBtn.parentElement.insertAdjacentElement('afterend', badge);
        }
    } else {
        // Tutorial not completed - disable experiment button
        experimentBtn.disabled = true;
        experimentBtn.style.opacity = '0.5';
        experimentBtn.style.cursor = 'not-allowed';
        experimentBtn.title = 'Please complete the tutorial first';

        // Add onclick handler to show alert
        experimentBtn.onclick = function(e) {
            e.preventDefault();
            alert('Please complete the tutorial before starting the experiment. This ensures you are familiar with all the operations.');
            return false;
        };
    }
}

// Initialize tutorial UI on page load
document.addEventListener('DOMContentLoaded', function() {
    updateWelcomeScreenForTutorial();
});
