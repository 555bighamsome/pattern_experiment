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

// Initially disable page2 next button
page2NextBtn.disabled = true;
page2NextBtn.style.opacity = '0.5';
page2NextBtn.style.cursor = 'not-allowed';

// Page 1 -> Page 2
nextPageBtn.onclick = () => {
    page1.style.display = 'none';
    page2.style.display = 'block';
    currentPage = 2;
};

// Page 2 -> Page 3 (only after all content is shown)
page2NextBtn.onclick = () => {
    // Only allow navigation if all lines have been shown
    if (currentLineIndex >= contentLines.length) {
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
        const currentLine = contentLines[currentLineIndex];
        currentLine.classList.remove('hidden');
        currentLine.classList.add('fade-in');
        
        // Smooth scroll to the newly revealed line
        setTimeout(() => {
            currentLine.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'nearest'
            });
        }, 100);
        
        currentLineIndex++;
        
        // Fade hint after first press
        if (currentLineIndex === 1 && spacebarHint) {
            spacebarHint.style.opacity = '0.5';
        }
        
        // Enable next button and remove hint after all lines shown
        if (currentLineIndex === contentLines.length) {
            if (spacebarHint) {
                spacebarHint.style.display = 'none';
            }
            // Enable the next page button
            page2NextBtn.disabled = false;
            page2NextBtn.style.opacity = '1';
            page2NextBtn.style.cursor = 'pointer';
            
            // Scroll to the button after all content is shown
            setTimeout(() => {
                page2NextBtn.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            }, 300);
        }
    }
}
