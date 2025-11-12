// Instruction page logic
const page1 = document.getElementById("page1");
const page2 = document.getElementById("page2");
const page3 = document.getElementById("page3");
const nextPageBtn = document.getElementById("next-page-btn");
const page2NextBtn = document.getElementById("page2-next-btn");
const tutorialBtn = document.getElementById("tutorial-btn");
const contentLines = document.querySelectorAll('.content-line');
const spacebarHint = document.querySelector('.spacebar-hint');
let currentLineIndex = 0;
let currentPage = 1;

// Page 1 -> Page 2
nextPageBtn.onclick = () => {
    page1.style.display = 'none';
    page2.style.display = 'block';
    currentPage = 2;
};

// Page 2 -> Page 3 (only after all content is shown)
page2NextBtn.onclick = () => {
    // Check if all content has been revealed
    if (currentLineIndex < contentLines.length) {
        // Show all remaining lines instantly
        while (currentLineIndex < contentLines.length) {
            showNextLine();
        }
    } else {
        // Proceed to page 3
        page2.style.display = 'none';
        page3.style.display = 'block';
        currentPage = 3;
    }
};

// Tutorial button -> tutorial page
tutorialBtn.onclick = () => location.href = "tutorial.html";

// Show next line when space bar is pressed (only on page 2)
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && currentPage === 2 && currentLineIndex < contentLines.length) {
        e.preventDefault(); // Prevent page scroll
        showNextLine();
    }
});

function showNextLine() {
    if (currentLineIndex < contentLines.length) {
        contentLines[currentLineIndex].classList.remove('hidden');
        contentLines[currentLineIndex].classList.add('fade-in');
        currentLineIndex++;
        
        // Fade hint after first press
        if (currentLineIndex === 1 && spacebarHint) {
            spacebarHint.style.opacity = '0.5';
        }
        
        // Remove hint completely after all lines shown
        if (currentLineIndex === contentLines.length && spacebarHint) {
            spacebarHint.style.display = 'none';
        }
    }
}
