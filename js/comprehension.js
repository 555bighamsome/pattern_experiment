// Comprehension check logic
const checkBtn = document.getElementById("check-btn");
const checks = ["check1", "check2", "check3", "check4"];
// Correct answers: b, b, c, b
const answers = ["b", "b", "c", "b"];

const passBtn = document.getElementById("pass-btn");
const retryBtn = document.getElementById("retry-btn");

checkBtn.onclick = () => checkComprehension();
passBtn.onclick = () => location.href = "task.html";
retryBtn.onclick = () => location.href = "instruction.html";

document.getElementById("prequiz").onchange = () => {
    if (isFilled()) {
        checkBtn.disabled = false;
    }
};

function checkComprehension() {
    let allCorrect = true;
    
    for (let i = 0; i < checks.length; i++) {
        const selected = document.querySelector(`input[name="${checks[i]}"]:checked`);
        if (!selected || selected.value !== answers[i]) {
            allCorrect = false;
            break;
        }
    }
    
    showPostCheckPage(allCorrect);
}

function showPostCheckPage(isPass) {
    document.getElementById("comprehension").style.display = "none";
    
    if (isPass) {
        document.getElementById("pass").style.display = "block";
    } else {
        document.getElementById("retry").style.display = "block";
    }
}

function isFilled() {
    for (let i = 0; i < checks.length; i++) {
        const selected = document.querySelector(`input[name="${checks[i]}"]:checked`);
        if (!selected) {
            return false;
        }
    }
    return true;
}
