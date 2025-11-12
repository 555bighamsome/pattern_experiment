// Consent page logic
const consentBtn = document.getElementById("consent-btn");
const consentText = document.getElementById("consent-info");

// Enable button only after scrolling to bottom
consentText.addEventListener("scroll", () => checkScrollHeight(consentText, consentBtn), false);

consentBtn.onclick = () => location.href = "reminder.html";

function checkScrollHeight(text, btn) {
    if ((text.scrollTop + text.offsetHeight) >= text.scrollHeight - 10) {
        btn.disabled = false;
    }
}
