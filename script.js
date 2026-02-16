const cookingData = {
    rice: {
        "Long-grain white": 15,
        "Jasmine": 12,
        "Basmati (white)": 15,
        "Short/medium-grain white": 15,
        "Sushi rice (short-grain)": 18,
        "Brown long-grain": 35,
        "Brown basmati": 12,
        "Wild rice / blends": 45,
        "Parboiled (converted)": 20,
        "Instant/quick rice": 5,
        "Self Test": 0.166666667 // 10 seconds (10/60 minutes)
    },
    pasta: {
        "Angel hair / Capellini": 4,
        "Spaghetti": 8,
        "Linguine": 8,
        "Bucatini": 10,
        "Penne": 9,
        "Ziti": 6,
        "Rigatoni": 11,
        "Farfalle (bow ties)": 10,
        "Fusilli / Rotini": 8,
        "Macaroni (elbows)": 8,
        "Shells (conchiglie)": 8,
        "Pappardelle": 7,
        "Fettuccine": 6,
        "Lasagna noodles": 12,
        "Egg noodles (regular)": 8,
        "Fresh / refrigerated pasta": 1
    }
};

// DOM Elements
const categorySelect = document.getElementById('category-select');
const itemSelect = document.getElementById('item-select');
const timerMinutes = document.getElementById('timer-minutes');
const timerSeconds = document.getElementById('timer-seconds');
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const resetBtn = document.getElementById('reset-btn');
const alarmSound = document.getElementById('alarm-sound');
const timerCard = document.querySelector('.timer-card');

let countdownInterval;
let totalSecondsRemaining = 0;
let isRunning = false;

// Initialize Dropdowns
categorySelect.addEventListener('change', (e) => {
    const category = e.target.value;
    updateItemDropdown(category);
    resetTimer();
});

function updateItemDropdown(category) {
    itemSelect.innerHTML = '<option value="" disabled selected>Select variety...</option>';
    const items = cookingData[category];
    
    for (const item in items) {
        const option = document.createElement('option');
        option.value = items[item];
        option.textContent = item;
        itemSelect.appendChild(option);
    }
    
    itemSelect.disabled = false;
}

itemSelect.addEventListener('change', (e) => {
    const minutes = parseFloat(e.target.value);
    totalSecondsRemaining = Math.floor(minutes * 60);
    updateTimerDisplay();
    startBtn.disabled = false;
    resetBtn.disabled = false;
});

function updateTimerDisplay() {
    const mins = Math.floor(totalSecondsRemaining / 60);
    const secs = totalSecondsRemaining % 60;
    timerMinutes.textContent = String(mins).padStart(2, '0');
    timerSeconds.textContent = String(secs).padStart(2, '0');
    
    // Update document title for easy tracking
    document.title = `${timerMinutes.textContent}:${timerSeconds.textContent} - Rice & Pasta Timer`;
}

// Timer Controls
startBtn.addEventListener('click', () => {
    if (isRunning) return;
    
    isRunning = true;
    startBtn.disabled = true;
    stopBtn.disabled = false;
    categorySelect.disabled = true;
    itemSelect.disabled = true;
    document.body.classList.add('timer-running');
    
    countdownInterval = setInterval(() => {
        if (totalSecondsRemaining <= 0) {
            clearInterval(countdownInterval);
            timerFinished();
            return;
        }
        
        totalSecondsRemaining--;
        updateTimerDisplay();
    }, 1000);
});

stopBtn.addEventListener('click', () => {
    clearInterval(countdownInterval);
    isRunning = false;
    startBtn.disabled = false;
    stopBtn.disabled = true;
    document.body.classList.remove('timer-running');
});

resetBtn.addEventListener('click', resetTimer);

function resetTimer() {
    clearInterval(countdownInterval);
    isRunning = false;
    
    const minutes = parseFloat(itemSelect.value) || 0;
    totalSecondsRemaining = Math.floor(minutes * 60);
    
    updateTimerDisplay();
    
    startBtn.disabled = !itemSelect.value;
    stopBtn.disabled = true;
    resetBtn.disabled = !itemSelect.value;
    categorySelect.disabled = false;
    itemSelect.disabled = !categorySelect.value;
    document.body.classList.remove('timer-running');
}

function timerFinished() {
    isRunning = false;
    startBtn.disabled = true;
    stopBtn.disabled = true;
    document.body.classList.remove('timer-running');
    
    // Play sound
    alarmSound.play().catch(error => {
        console.error("Audio playback failed:", error);
        alert("Time is up!");
    });
    
    // Visual indicator
    timerCard.style.boxShadow = "0 0 40px var(--danger)";
    setTimeout(() => {
        timerCard.style.boxShadow = "";
    }, 5000);
}
