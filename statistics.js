// SPOT — PROFILE STATISTICS

const STATISTICS_FILTER_KEY = "spot_statistics_filter_v1";
let statisticsRange = localStorage.getItem(STATISTICS_FILTER_KEY) || "28";

function statisticsHistory() {
  try {
    const value = JSON.parse(localStorage.getItem("fitness_workout_history") || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function filteredStatisticsHistory() {
  const history = statisticsHistory();
  if (statisticsRange === "all") return history;
  if (statisticsRange === "programme") {
    const activeId = getActiveProgrammeId();
    return history.filter(session => session.programmeId === activeId);
  }
  const cutoff = Date.now() - Number(statisticsRange) * 86400000;
  return history.filter(session => new Date(session.finishedAt).getTime() >= cutoff);
}

function sessionTrainingVolume(session) {
  return (session.exercises || []).reduce((total, exercise) =>
    total + (exercise.sets || []).reduce((sum, set) => {
      if (set.completed === false) return sum;
      return sum + (Number(set.weight) || 0) * (Number(set.reps) || 0);
    }, 0), 0);
}

function sessionDurationMinutes(session) {
  const start = new Date(session.startedAt).getTime();
  const finish = new Date(session.finishedAt).getTime();
  return Number.isFinite(start) && Number.isFinite(finish)
    ? Math.max(0, Math.round((finish - start) / 60000))
    : 0;
}

function statisticCard(label, value) {
  const card = document.createElement("div");
  card.className = "statistic-number-card";
  card.innerHTML = `<span>${label}</span><strong data-stat-value="${value}">0</strong>`;
  return card;
}

function animateStatisticNumbers(container) {
  container.querySelectorAll("[data-stat-value]").forEach(element => {
    const target = Number(element.dataset.statValue) || 0;
    const start = performance.now();
    const duration = 450;
    const draw = now => {
      const progress = Math.min((now - start) / duration, 1);
      element.textContent = Math.round(target * (1 - Math.pow(1 - progress, 3))).toLocaleString();
      if (progress < 1) requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
  });
}

function renderStatistics() {
  const container = document.getElementById("statisticsContent");
  if (!container) return;
  const sessions = filteredStatisticsHistory().sort((a, b) => new Date(a.finishedAt) - new Date(b.finishedAt));
  const totalMinutes = sessions.reduce((sum, session) => sum + sessionDurationMinutes(session), 0);
  const dated = sessions.map(session => new Date(session.finishedAt).getTime()).filter(Number.isFinite);
  const spanWeeks = dated.length > 1 ? Math.max(1, (Math.max(...dated) - Math.min(...dated)) / 604800000) : 1;
  const weeklyAverage = sessions.length ? (sessions.length / spanWeeks).toFixed(1) : "0";
  const activeId = getActiveProgrammeId();
  const currentProgrammeSessions = sessions.filter(session => session.programmeId === activeId);

  container.innerHTML = "";

  const training = document.createElement("section");
  training.className = "card statistics-section";
  training.innerHTML = "<h2>Training</h2>";
  const numberGrid = document.createElement("div");
  numberGrid.className = "statistics-number-grid";
  numberGrid.append(
    statisticCard("Workouts", sessions.length),
    statisticCard("Minutes", totalMinutes)
  );
  const average = document.createElement("div");
  average.className = "statistics-wide-metric";
  average.innerHTML = `<span>Average per week</span><strong>${weeklyAverage}</strong>`;
  training.append(numberGrid, average);

  const consistency = document.createElement("section");
  consistency.className = "card statistics-section";
  consistency.innerHTML = "<h2>Consistency</h2>";
  const bars = document.createElement("div");
  bars.className = "consistency-bars";
  const now = new Date();
  for (let offset = 7; offset >= 0; offset -= 1) {
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    end.setDate(end.getDate() - offset * 7);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    const count = sessions.filter(session => {
      const time = new Date(session.finishedAt).getTime();
      return time >= start.getTime() && time <= end.getTime();
    }).length;
    const bar = document.createElement("span");
    bar.style.setProperty("--activity", String(Math.min(count / 5, 1)));
    bar.title = `${count} workouts`;
    bars.appendChild(bar);
  }
  consistency.appendChild(bars);

  const progress = document.createElement("section");
  progress.className = "card statistics-section statistics-link-section";
  progress.innerHTML = `<div><h2>Exercise Progress</h2><p>View your starred exercise trends on the Dashboard.</p></div>`;
  const progressButton = document.createElement("button");
  progressButton.className = "icon-button";
  progressButton.setAttribute("aria-label", "Open exercise progress");
  progressButton.innerHTML = '<svg aria-hidden="true"><use href="#icon-arrow-right"></use></svg>';
  progressButton.onclick = () => showPage("dashboard");
  progress.appendChild(progressButton);

  const records = document.createElement("section");
  records.className = "card statistics-section";
  records.innerHTML = "<h2>Records</h2>";
  const bestWeights = new Map();
  let highestVolume = 0;
  let longestCardio = 0;
  sessions.forEach(session => {
    highestVolume = Math.max(highestVolume, sessionTrainingVolume(session));
    (session.exercises || []).forEach(exercise => {
      if (exercise.type === "cardio") longestCardio = Math.max(longestCardio, Number(exercise.durationMinutes) || 0);
      if (!exercise.starred) return;
      const best = Math.max(0, ...(exercise.sets || []).map(set => Number(set.weight) || 0));
      bestWeights.set(exercise.name, Math.max(bestWeights.get(exercise.name) || 0, best));
    });
  });
  const recordList = document.createElement("div");
  recordList.className = "statistics-record-list";
  [...bestWeights.entries()].sort((a, b) => a[0].localeCompare(b[0])).forEach(([name, weight]) => {
    const row = document.createElement("p");
    row.innerHTML = `<span>${name}</span><strong>${weight} kg</strong>`;
    recordList.appendChild(row);
  });
  if (highestVolume) {
    const row = document.createElement("p");
    row.innerHTML = `<span>Highest workout volume</span><strong>${Math.round(highestVolume).toLocaleString()} kg</strong>`;
    recordList.appendChild(row);
  }
  if (longestCardio) {
    const row = document.createElement("p");
    row.innerHTML = `<span>Longest cardio session</span><strong>${longestCardio} min</strong>`;
    recordList.appendChild(row);
  }
  if (!recordList.children.length) recordList.innerHTML = "<p class='statistics-empty'>Complete workouts to build your records.</p>";
  records.appendChild(recordList);

  if (activeId && currentProgrammeSessions.length) {
    average.insertAdjacentHTML("beforeend", `<small>${currentProgrammeSessions.length} in your active programme</small>`);
  }
  container.append(training, consistency, progress, records);
  animateStatisticNumbers(container);
}

const statisticsLabels = { "28": "4 Weeks", "90": "3 Months", "365": "1 Year", all: "All Time", programme: "Current Programme" };
function updateStatisticsFilterLabel() {
  const button = document.getElementById("statisticsFilterButton");
  if (button) button.textContent = statisticsLabels[statisticsRange] || "4 Weeks";
}

document.getElementById("openStatistics")?.addEventListener("click", () => {
  updateStatisticsFilterLabel();
  renderStatistics();
  showPage("statistics");
});
document.getElementById("statisticsBack")?.addEventListener("click", () => showPage("profile"));
document.getElementById("statisticsFilterButton")?.addEventListener("click", () => document.getElementById("statisticsFilterDialog")?.showModal());
document.getElementById("closeStatisticsFilter")?.addEventListener("click", () => document.getElementById("statisticsFilterDialog")?.close());
document.querySelectorAll("#statisticsFilterDialog [data-range]").forEach(button => button.addEventListener("click", () => {
  statisticsRange = button.dataset.range;
  localStorage.setItem(STATISTICS_FILTER_KEY, statisticsRange);
  document.getElementById("statisticsFilterDialog")?.close();
  updateStatisticsFilterLabel();
  renderStatistics();
}));
updateStatisticsFilterLabel();
