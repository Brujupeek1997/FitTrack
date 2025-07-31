document.addEventListener('DOMContentLoaded', function () {
    const options = { timeZone: 'Europe/Vienna', hour12: false };
    const viennaTime = new Date().toLocaleTimeString('en-US', options);
    const viennaDate = new Date().toLocaleDateString('en-US', { ...options, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    document.getElementById('current-time').textContent = `${viennaDate} ${viennaTime}`;

    setInterval(() => {
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', options);
        const dateString = now.toLocaleDateString('en-US', { ...options, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        document.getElementById('current-time').textContent = `${dateString} ${timeString}`;
    }, 60000);

    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const prefersDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (localStorage.getItem('darkMode') === 'enabled' || (localStorage.getItem('darkMode') === null && prefersDarkMode)) {
        document.body.classList.add('dark-mode');
    }

    darkModeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('darkMode', document.body.classList.contains('dark-mode') ? 'enabled' : 'disabled');
    });

    let weightData = JSON.parse(localStorage.getItem('weightData')) || [];

    const weightChartCtx = document.getElementById('weight-chart').getContext('2d');
    let weightChart = new Chart(weightChartCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Weight (kg)',
                data: [],
                borderColor: '#f97316',
                backgroundColor: 'rgba(249, 115, 22, 0.1)',
                borderWidth: 2,
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });

    updateDashboard();

    document.getElementById('daily-form').addEventListener('submit', function (e) {
        e.preventDefault();

        const weightInput = document.getElementById('weight');
        const moodInput = document.querySelector('input[name="mood"]:checked');
        const mood = moodInput ? moodInput.value : null;

        const hungerInput = document.getElementById('hunger');
        const activityInput = document.getElementById('activity');
        const notesInput = document.getElementById('notes');

        const weight = parseFloat(weightInput.value);
        const hunger = parseInt(hungerInput.value);
        const activity = parseInt(activityInput.value);
        const notes = notesInput.value;

        if (isNaN(weight)) {
            alert("Please enter a valid weight.");
            weightInput.focus();
            return;
        }


        const today = new Date().toISOString().split('T')[0];

        const existingEntryIndex = weightData.findIndex(entry => entry.date === today);

        const newEntry = {
            date: today,
            weight: weight,
            mood: mood,
            hunger: hunger,
            activity: activity,
            notes: notes
        };

        if (existingEntryIndex !== -1) {
            weightData[existingEntryIndex] = newEntry;
        } else {
            weightData.push(newEntry);
        }

        localStorage.setItem('weightData', JSON.stringify(weightData));

        updateDashboard();
        showMotivationMessage('success');
        this.reset();
    });


    function updateDashboard() {
        if (weightData.length === 0) return;

        weightData.sort((a, b) => new Date(a.date) - new Date(b.date));

        const latestEntry = weightData[weightData.length - 1];
        document.getElementById('current-weight').textContent = `${latestEntry.weight} kg`;

        if (weightData.length >= 2) {
            const prevEntry = weightData[weightData.length - 2];
            const change = latestEntry.weight - prevEntry.weight;
            const changeElement = document.getElementById('weight-change');

            if (change < 0) {
                changeElement.innerHTML = `<span class="text-green-500">▼ ${Math.abs(change).toFixed(1)} kg from yesterday</span>`;
            } else if (change > 0) {
                changeElement.innerHTML = `<span class="text-red-500">▲ ${Math.abs(change).toFixed(1)} kg from yesterday</span>`;
            } else {
                changeElement.innerHTML = `<span class="text-gray-500">No change from yesterday</span>`;
            }
        }

        if (weightData.length >= 8) {
            const weekAgoEntry = weightData[weightData.length - 8];
            const weeklyChange = latestEntry.weight - weekAgoEntry.weight;
            const weeklyChangeElement = document.getElementById('weekly-change');

            if (weeklyChange < 0) {
                weeklyChangeElement.innerHTML = `<span class="text-green-500">▼ ${Math.abs(weeklyChange).toFixed(1)} kg</span>`;
            } else if (weeklyChange > 0) {
                weeklyChangeElement.innerHTML = `<span class="text-red-500">▲ ${Math.abs(weeklyChange).toFixed(1)} kg</span>`;
            } else {
                weeklyChangeElement.innerHTML = `<span class="text-gray-500">0 kg</span>`;
            }
        }

        const totalLost = latestEntry.weight - weightData[0].weight;
        const totalLostElement = document.getElementById('total-lost');

        if (totalLost < 0) {
            totalLostElement.innerHTML = `<span class="text-green-500">▼ ${Math.abs(totalLost).toFixed(1)} kg</span>`;
        } else if (totalLost > 0) {
            totalLostElement.innerHTML = `<span class="text-red-500">▲ ${Math.abs(totalLost).toFixed(1)} kg</span>`;
        } else {
            totalLostElement.innerHTML = `<span class="text-gray-500">0 kg</span>`;
        }

        updateWeightChart();

        updateStreakCalendar();

        updateRecentEntries();

        showMotivationMessage('auto');
    }

    function updateWeightChart() {
        const displayData = weightData.slice(-30);

        const labels = displayData.map(entry => {
            const date = new Date(entry.date);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });

        const weights = displayData.map(entry => entry.weight);

        weightChart.data.labels = labels;
        weightChart.data.datasets[0].data = weights;
        weightChart.update();
    }

    function updateStreakCalendar() {
        const calendarEl = document.getElementById('streak-calendar');
        calendarEl.innerHTML = '';

        const today = new Date();
        const startDate = new Date();
        startDate.setDate(today.getDate() - 34); 

        for (let i = 0; i < 35; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);

            const dateString = date.toISOString().split('T')[0];
            const hasEntry = weightData.some(entry => entry.date === dateString);

            const dayEl = document.createElement('div');
            dayEl.className = 'streak-day text-sm';

            if (hasEntry) {
                dayEl.innerHTML = '✔️';
                dayEl.className += ' bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
            } else if (date > today) {
                dayEl.textContent = '';
                dayEl.className += ' bg-gray-100 dark:bg-gray-700';
            } else {
                dayEl.innerHTML = '❌';
                dayEl.className += ' bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
            }

            // Add tooltip with date
            dayEl.title = date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

            calendarEl.appendChild(dayEl);
        }
    }

    // Update recent entries for mobile view
    function updateRecentEntries() {
        const recentEntriesEl = document.getElementById('recent-entries');
        recentEntriesEl.innerHTML = '';

        // Show last 5 entries
        const displayData = weightData.slice(-5).reverse();

        displayData.forEach(entry => {
            const entryEl = document.createElement('div');
            entryEl.className = 'p-3 border rounded-lg border-gray-200 dark:border-gray-700';

            const date = new Date(entry.date);
            const dateString = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

            // Mood emoji
            let moodEmoji = '😐';
            if (entry.mood === 'happy') moodEmoji = '😃';
            if (entry.mood === 'sad') moodEmoji = '😞';

            entryEl.innerHTML = `
                        <div class="flex justify-between items-center">
                            <div class="font-medium">${dateString}</div>
                            <div class="text-xl">${moodEmoji}</div>
                        </div>
                        <div class="flex justify-between mt-2">
                            <div>${entry.weight} kg</div>
                            <div class="text-sm text-gray-500 dark:text-gray-400">Hunger: ${entry.hunger}/5</div>
                            <div class="text-sm text-gray-500 dark:text-gray-400">Activity: ${entry.activity} min</div>
                        </div>
                        ${entry.notes ? `<div class="mt-2 text-sm text-gray-700 dark:text-gray-300">${entry.notes}</div>` : ''}
                    `;

            recentEntriesEl.appendChild(entryEl);
        });
    }

    // Show motivational message
    function showMotivationMessage(type) {
        const motivationEl = document.getElementById('motivation-text');
        let message = '';
        let emoji = '💪';

        if (type === 'success') {
            message = "Great job logging your progress! Every day counts in your journey.";
            emoji = "🎉";
        } else if (weightData.length === 0) {
            message = "Welcome to FitTrack! Log your first entry to start your weight loss journey.";
            emoji = "👋";
        } else {
            const latestEntry = weightData[weightData.length - 1];
            const prevEntry = weightData.length >= 2 ? weightData[weightData.length - 2] : null;

            // Check for missed days
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayString = yesterday.toISOString().split('T')[0];

            const hasYesterdayEntry = weightData.some(entry => entry.date === yesterdayString);

            if (!hasYesterdayEntry && weightData.length > 1) {
                message = "You missed logging yesterday. Don't worry, just keep going today!";
                emoji = "👊";
            }
            // Check weight progress
            else if (prevEntry && latestEntry.weight < prevEntry.weight) {
                const loss = (prevEntry.weight - latestEntry.weight).toFixed(1);
                message = `🔥 Amazing! You're down ${loss}kg since last time! Keep it up!`;
                emoji = "🔥";
            }
            // Check mood
            else if (latestEntry.mood === 'sad') {
                message = "Even bad days are part of the journey. Stay strong and keep pushing forward!";
                emoji = "🤗";
            }
            // Check activity level
            else if (latestEntry.activity >= 60) {
                message = "Wow! Over 60 minutes of activity? You're killing it!";
                emoji = "🏋️‍♂️";
            }
            // Default motivational message
            else {
                const messages = [
                    "Consistency is key! You're doing great.",
                    "Small steps lead to big results. Keep going!",
                    "Your future self will thank you for this.",
                    "Progress, not perfection. Every day counts.",
                    "You're stronger than you think. Keep pushing!"
                ];
                message = messages[Math.floor(Math.random() * messages.length)];
            }
        }

        motivationEl.textContent = message;
        document.querySelector('#motivation-card .text-3xl').textContent = emoji;
    }
});