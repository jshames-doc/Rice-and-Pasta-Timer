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
const itemLabel = document.getElementById('item-label');
const timerMinutes = document.getElementById('timer-minutes');
const timerSeconds = document.getElementById('timer-seconds');
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const resetBtn = document.getElementById('reset-btn');
const alarmSound = document.getElementById('alarm-sound');
const timerCard = document.querySelector('.timer-card');

const CURRENT_VERSION = '1.7';

// Nuclear Option: Check version and clear cache if needed
if (localStorage.getItem('appVersion') !== CURRENT_VERSION) {
    console.log(`New version detected: ${CURRENT_VERSION}. Clearing cache...`);

    // Unregister Service Workers
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(function (registrations) {
            for (let registration of registrations) {
                registration.unregister();
            }
        });
    }

    // Clear Cache Storage
    if ('caches' in window) {
        caches.keys().then(function (names) {
            for (let name of names) {
                caches.delete(name);
            }
        });
    }

    // Update version in localStorage
    localStorage.setItem('appVersion', CURRENT_VERSION);

    // Reload page (force get from server)
    window.location.reload(true);
}

let totalSecondsRemaining = 0;
let isRunning = false;
let timerWorker = null;
let audioContext = null;
let alarmBuffer = null;
let silenceSource = null;

// Register Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
            .then(registration => {
                console.log('ServiceWorker registration successful');
            })
            .catch(err => {
                console.log('ServiceWorker registration failed: ', err);
            });
    });
}

// Initialize Web Worker
if (window.Worker) {
    try {
        timerWorker = new Worker('timer-worker.js');
        timerWorker.onmessage = function (e) {
            if (e.data.status === 'TICK') {
                totalSecondsRemaining = e.data.secondsRemaining;
                updateTimerDisplay();
            } else if (e.data.status === 'DONE') {
                timerFinished();
            }
        };
    } catch (e) {
        console.warn('Web Worker initialization failed (likely due to file:// protocol restrictive security policies).', e);
        timerWorker = null; // Fallback will trigger in startBtn logic
    }
} else {
    console.warn('Web Workers not supported in this browser. Timer may be throttled in background.');
    // Fallback logic could go here, but for now we warn
}

// Initialize Audio Context and Preload Alarm
async function initAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    // Resume context if suspended
    if (audioContext.state === 'suspended') {
        await audioContext.resume();
    }

    // Preload Alarm Sound into Buffer
    if (!alarmBuffer) {
        try {
            const response = await fetch('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            const arrayBuffer = await response.arrayBuffer();
            alarmBuffer = await audioContext.decodeAudioData(arrayBuffer);
        } catch (e) {
            console.error('Failed to load alarm sound:', e);
        }
    }

    // Play Silent Buffer to Keep Engine Alive
    if (!silenceSource) {
        const buffer = audioContext.createBuffer(1, 22050, 22050); // 1s buffer
        silenceSource = audioContext.createBufferSource();
        silenceSource.buffer = buffer;
        silenceSource.loop = true;
        silenceSource.connect(audioContext.destination);
        silenceSource.start(0);
    }
}

// Request Notification Permission on first interaction
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

// Initialize Dropdowns
categorySelect.addEventListener('change', (e) => {
    const category = e.target.value;
    updateItemDropdown(category);
    resetTimer();
});

function updateItemDropdown(category) {
    if (category === 'manual') {
        itemLabel.textContent = "Select Time";
        itemSelect.innerHTML = '<option value="" disabled selected>Select time...</option>';

        // Generate 1-45 minutes
        for (let i = 1; i <= 45; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `${i} minute${i === 1 ? '' : 's'}`;
            itemSelect.appendChild(option);
        }
    } else {
        itemLabel.textContent = "Variety";
        itemSelect.innerHTML = '<option value="" disabled selected>Select variety...</option>';

        // Load from data
        const items = cookingData[category];
        for (const item in items) {
            const option = document.createElement('option');
            option.value = items[item];
            option.textContent = item;
            itemSelect.appendChild(option);
        }
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

    requestNotificationPermission();
    initAudioContext(); // Keep audio engine alive & load alarm

    isRunning = true;
    startBtn.disabled = true;
    stopBtn.disabled = false;
    categorySelect.disabled = true;
    itemSelect.disabled = true;
    document.body.classList.add('timer-running');

    if (timerWorker) {
        timerWorker.postMessage({
            command: 'START',
            seconds: totalSecondsRemaining
        });
    } else {
        // Fallback for no worker support
        window.countdownInterval = setInterval(() => {
            if (totalSecondsRemaining <= 0) {
                clearInterval(window.countdownInterval);
                timerFinished();
                return;
            }
            totalSecondsRemaining--;
            updateTimerDisplay();
        }, 1000);
    }
});

stopBtn.addEventListener('click', () => {
    if (timerWorker) {
        timerWorker.postMessage({ command: 'STOP' });
    } else {
        clearInterval(window.countdownInterval);
    }

    // Don't kill audio context here, keep it alive for next run
    isRunning = false;
    startBtn.disabled = false;
    stopBtn.disabled = true;
    document.body.classList.remove('timer-running');
});

resetBtn.addEventListener('click', resetTimer);

function resetTimer() {
    if (timerWorker) {
        timerWorker.postMessage({ command: 'RESET' });
    } else {
        clearInterval(window.countdownInterval);
    }

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

function showNotification() {
    if ('Notification' in window && Notification.permission === 'granted') {
        // Try to register a service worker registration specific notification if possible (for Android)
        // or just a standard Notification API call
        if (navigator.serviceWorker && navigator.serviceWorker.ready) {
            navigator.serviceWorker.ready.then(function (registration) {
                registration.showNotification('Rice & Pasta Timer', {
                    body: 'Your food is ready!',
                    icon: 'icon.svg',
                    vibrate: [200, 100, 200]
                });
            });
        } else {
            new Notification('Rice & Pasta Timer', {
                body: 'Your food is ready!',
                icon: 'icon.svg'
            });
        }
    }
}

function timerFinished() {
    isRunning = false;
    startBtn.disabled = true;
    stopBtn.disabled = true;
    document.body.classList.remove('timer-running');

    // Play Alarm using Web Audio API
    if (audioContext && alarmBuffer) {
        const source = audioContext.createBufferSource();
        source.buffer = alarmBuffer;
        source.loop = true; // Loop the alarm sound itself
        source.connect(audioContext.destination);
        source.start(0);

        // Stop after 3 seconds
        setTimeout(() => {
            source.stop();
        }, 3000);
    } else {
        console.error("Audio Context or Alarm Buffer missing!");
    }

    // Vibration pattern
    if (navigator.vibrate) {
        navigator.vibrate([500, 200, 500, 200, 500]);
    }

    // Show System Notification
    showNotification();

    // Visual indicator
    timerCard.style.boxShadow = "0 0 40px var(--danger)";
    setTimeout(() => {
        timerCard.style.boxShadow = "";
    }, 5000);
}
