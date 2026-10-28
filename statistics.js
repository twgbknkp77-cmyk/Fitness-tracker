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
  average.innerHTML = `<span>Workouts per week</span><strong>${weeklyAverage}</strong>`;
  training.append(numberGrid, average);

  const consistency = document.createElement("section");
  consistency.className = "card statistics-section";
  consistency.innerHTML = "<h2>Consistency</h2>";
  const bars = document.createElement("div");
  bars.className = "consistency-chart";
  const now = new Date();
  const weekly=[];
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
    weekly.push({count,start});
  }
  const width=340,height=220,left=42,right=14,top=16,bottom=38; const max=Math.max(3,...weekly.map(item=>item.count));
  const plotHeight=height-top-bottom; const plotWidth=width-left-right; const barWidth=Math.max(12,plotWidth/weekly.length*.58);
  const y=value=>top+plotHeight-(value/max)*plotHeight;
  const columns=weekly.map((item,index)=>{const x=left+(index+.5)*plotWidth/weekly.length;const barTop=y(item.count);return `<g><rect class="consistency-column" x="${x-barWidth/2}" y="${barTop}" width="${barWidth}" height="${Math.max(2,height-bottom-barTop)}" rx="5"><title>${item.count} workouts · ${item.start.toLocaleDateString("en-GB",{day:"numeric",month:"short"})}</title></rect><text class="consistency-value" text-anchor="middle" x="${x}" y="${Math.max(top+10,barTop-5)}">${item.count}</text></g>`;}).join("");
  const ticks=[0,Math.ceil(max/2),max].map(value=>`<g><line class="progress-grid-line" x1="${left}" y1="${y(value)}" x2="${width-right}" y2="${y(value)}"></line><text class="axis-label" text-anchor="end" x="${left-7}" y="${y(value)+4}">${value}</text></g>`).join("");
  bars.innerHTML=`<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Workouts completed per week">${ticks}<line class="progress-axis" x1="${left}" y1="${top}" x2="${left}" y2="${height-bottom}"></line><line class="progress-axis" x1="${left}" y1="${height-bottom}" x2="${width-right}" y2="${height-bottom}"></line>${columns}<text class="axis-label" x="${left}" y="${height-10}">${weekly[0].start.toLocaleDateString("en-GB",{day:"numeric",month:"short"})}</text><text class="axis-label" text-anchor="end" x="${width-right}" y="${height-10}">Now</text><text class="axis-title" text-anchor="middle" transform="rotate(-90 11 ${top+plotHeight/2})" x="11" y="${top+plotHeight/2}">WORKOUTS</text></svg>`;
  consistency.appendChild(bars);

  const progress = document.createElement("section");
  progress.className = "card statistics-section statistics-link-section";
  progress.innerHTML = `<div><h2>Performance</h2><p>Review exercise numbers and records.</p></div>`;
  const progressButton = document.createElement("button");
  progressButton.className = "icon-button";
  progressButton.setAttribute("aria-label", "Open exercise progress");
  progressButton.innerHTML = '<svg aria-hidden="true"><use href="#icon-arrow-right"></use></svg>';
  progressButton.onclick = () => { renderExerciseStatistics(); showPage("exerciseStatistics"); };
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

  container.append(training, consistency, progress);
  animateStatisticNumbers(container);
}

const statisticsLabels = { "28": "4 Weeks", "90": "3 Months", "365": "1 Year", all: "All Time", programme: "Current Programme" };
function updateStatisticsFilterLabel() {
  const button = document.getElementById("statisticsFilterButton");
  if (button) {
    const label=statisticsLabels[statisticsRange]||"4 Weeks";
    button.setAttribute("aria-label",`Filter statistics: ${label}`);
    button.title=label;
  }
  document.querySelectorAll("#statisticsFilterDialog [data-range]").forEach(option=>option.classList.toggle("active",option.dataset.range===statisticsRange));
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

let exerciseStatMetric="weight";
let exerciseStatExercise="all";
let exerciseStatSort="name";
function exerciseStatRows() {
  const rows=[];
  filteredStatisticsHistory().forEach(session=>(session.exercises||[]).forEach(exercise=>{
    const completedSets=(exercise.sets||[]).filter(set=>set.completed!==false);
    rows.push({name:exercise.name,date:session.finishedAt,weight:Math.max(0,...completedSets.map(set=>Number(set.weight)||0)),reps:Math.max(0,...completedSets.map(set=>Number(set.reps)||0)),effort:Number(exercise.effort)||0});
  }));
  return rows;
}

function renderExerciseStatistics() {
  const container=document.getElementById("exerciseStatisticsContent"); if(!container)return;
  const rows=exerciseStatRows(); const names=[...new Set(rows.map(row=>row.name).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  if(exerciseStatExercise!=="all"&&!names.includes(exerciseStatExercise))exerciseStatExercise="all";
  const selection=document.getElementById("exerciseStatSelection"); if(selection)selection.textContent=exerciseStatExercise==="all"?"All Exercises":exerciseStatExercise;
  document.getElementById("exerciseStatMetric")?.toggleAttribute("hidden",exerciseStatExercise==="all");
  renderExerciseStatFilter(names);
  const unit=exerciseStatMetric==="weight"?" kg":exerciseStatMetric==="effort"?"/5":"";
  if(exerciseStatExercise==="all"){
    const summaries=names.map(name=>{const values=rows.filter(row=>row.name===name).sort((a,b)=>new Date(a.date)-new Date(b.date));const valid=metric=>values.filter(row=>row[metric]>0);const firstWeight=valid("weight")[0]?.weight||0;const latestWeight=valid("weight").at(-1)?.weight||0;return {name,sessions:values.length,latestWeight,bestWeight:Math.max(0,...values.map(row=>row.weight)),latestReps:valid("reps").at(-1)?.reps||0,bestReps:Math.max(0,...values.map(row=>row.reps)),latestEffort:valid("effort").at(-1)?.effort||0,bestEffort:Math.max(0,...values.map(row=>row.effort)),improvement:firstWeight?Math.round((latestWeight-firstWeight)/firstWeight*100):0};}).filter(item=>item.sessions);
    const sorters={name:(a,b)=>a.name.localeCompare(b.name),weight:(a,b)=>b.bestWeight-a.bestWeight,reps:(a,b)=>b.bestReps-a.bestReps,effort:(a,b)=>b.bestEffort-a.bestEffort,improvement:(a,b)=>b.improvement-a.improvement}; summaries.sort(sorters[exerciseStatSort]||sorters.name);
    container.innerHTML=summaries.length?`<div class="performance-list">${summaries.map(item=>`<button type="button" class="card performance-summary-card" data-exercise="${item.name.replaceAll('"','&quot;')}"><div class="performance-summary-heading"><span><strong>${item.name}</strong><small>${item.sessions} ${item.sessions===1?"session":"sessions"}</small></span><span class="performance-chevron"><svg aria-hidden="true"><use href="#icon-arrow-right"></use></svg></span></div><div class="performance-summary-grid"><span><small>Latest weight</small><strong>${item.latestWeight} kg</strong></span><span><small>Highest weight</small><strong>${item.bestWeight} kg</strong></span><span><small>Latest reps</small><strong>${item.latestReps}</strong></span><span><small>Highest reps</small><strong>${item.bestReps}</strong></span><span><small>Latest effort</small><strong>${item.latestEffort||"—"}</strong></span><span><small>Highest effort</small><strong>${item.bestEffort||"—"}</strong></span></div></button>`).join("")}</div>`:"<div class='card empty-state-card'><p>Complete an exercise to see its statistics.</p></div>";
    container.querySelectorAll("[data-exercise]").forEach(button=>button.addEventListener("click",()=>{exerciseStatExercise=button.dataset.exercise;renderExerciseStatistics();})); return;
  }
  const chosen=exerciseStatExercise; const values=rows.filter(row=>row.name===chosen&&row[exerciseStatMetric]>0).sort((a,b)=>new Date(a.date)-new Date(b.date));
  const latest=values.at(-1)?.[exerciseStatMetric]||0; const first=values[0]?.[exerciseStatMetric]||0; const best=Math.max(0,...values.map(row=>row[exerciseStatMetric])); const change=first?Math.round((latest-first)/first*100):0;
  container.innerHTML=`<div class="exercise-stat-grid"><div class="card"><span>Latest</span><strong>${latest}${unit}</strong></div><div class="card"><span>Best</span><strong>${best}${unit}</strong></div><div class="card"><span>Change</span><strong>${change>0?"+":""}${change}%</strong></div><div class="card"><span>Sessions</span><strong>${values.length}</strong></div></div><div class="card exercise-stat-history"><h2>Recent Sessions</h2>${values.slice(-8).reverse().map(row=>`<p><span>${new Date(row.date).toLocaleDateString("en-GB",{day:"numeric",month:"short"})}</span><strong>${row[exerciseStatMetric]}${unit}</strong></p>`).join("")||"<p>No results for this metric.</p>"}</div>`;
}
function renderExerciseStatFilter(names){
  const options=document.getElementById("exerciseStatOptions");if(!options)return;options.innerHTML="<h3>Show</h3>";
  ["all",...names].forEach(name=>{const button=document.createElement("button");button.type="button";button.textContent=name==="all"?"All Exercises":name;button.classList.toggle("active",name===exerciseStatExercise);button.onclick=()=>{exerciseStatExercise=name;document.getElementById("exerciseStatFilterDialog")?.close();renderExerciseStatistics();};options.appendChild(button);});
  const sortTitle=document.createElement("h3");sortTitle.textContent="Sort all exercises";options.appendChild(sortTitle);
  [["name","Name"],["weight","Highest Weight"],["reps","Highest Reps"],["effort","Highest Effort"],["improvement","Greatest Improvement"]].forEach(([value,label])=>{const button=document.createElement("button");button.type="button";button.textContent=label;button.classList.toggle("active",value===exerciseStatSort);button.onclick=()=>{exerciseStatSort=value;exerciseStatExercise="all";document.getElementById("exerciseStatFilterDialog")?.close();renderExerciseStatistics();};options.appendChild(button);});
}
document.getElementById("exerciseStatisticsBack")?.addEventListener("click",()=>showPage("statistics"));
document.getElementById("exerciseStatFilter")?.addEventListener("click",()=>{renderExerciseStatFilter([...new Set(exerciseStatRows().map(row=>row.name).filter(Boolean))].sort((a,b)=>a.localeCompare(b)));document.getElementById("exerciseStatFilterDialog")?.showModal();});
document.getElementById("closeExerciseStatFilter")?.addEventListener("click",()=>document.getElementById("exerciseStatFilterDialog")?.close());
document.querySelectorAll("#exerciseStatMetric [data-metric]").forEach(button=>button.addEventListener("click",()=>{exerciseStatMetric=button.dataset.metric;document.querySelectorAll("#exerciseStatMetric [data-metric]").forEach(item=>item.classList.toggle("active",item===button));renderExerciseStatistics();}));
