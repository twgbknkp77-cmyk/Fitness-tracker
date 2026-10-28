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
  const spanWeeks = dated.length > 1 ? Math.max(1, Math.ceil((Math.max(...dated) - Math.min(...dated)) / 604800000)) : 1;

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
  training.append(numberGrid);

  const consistency = document.createElement("section");
  consistency.className = "card statistics-section";
  const requestedWeeks=Number(statisticsRange); const weekCount=Number.isFinite(requestedWeeks)?Math.max(1,Math.ceil(requestedWeeks/7)):spanWeeks;
  const now = new Date();
  const weekly=[];
  for (let offset = weekCount-1; offset >= 0; offset -= 1) {
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
  const activeWeeks=weekly.filter(item=>item.count>0).length; let streak=0; for(let index=weekly.length-1;index>=0&&weekly[index].count>0;index-=1)streak+=1;
  const consistencyPercent=Math.round(activeWeeks/weekCount*100);
  consistency.innerHTML=`<div class="consistency-heading"><div><h2>Consistency</h2><p>Weeks with at least one completed workout</p></div><strong>${consistencyPercent}%</strong></div><div class="consistency-progress"><span style="width:${consistencyPercent}%"></span></div><div class="consistency-meta"><span><strong>${activeWeeks}/${weekCount}</strong><small>Active weeks</small></span><span><strong>${streak}</strong><small>Current streak</small></span></div>`;

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
let exerciseStatSortDirection="asc";
function exerciseStatRows() {
  const rows=[];
  filteredStatisticsHistory().forEach(session=>(session.exercises||[]).forEach(exercise=>{
    const completedSets=(exercise.sets||[]).filter(set=>set.completed!==false);
    rows.push({name:exercise.name,type:exercise.type||"strength",date:session.finishedAt,weight:Math.max(0,...completedSets.map(set=>Number(set.weight)||0)),reps:Math.max(0,...completedSets.map(set=>Number(set.reps)||0)),duration:Number(exercise.durationMinutes)||0,effort:Number(exercise.effort)||0});
  }));
  return rows;
}

function renderExerciseStatistics() {
  const container=document.getElementById("exerciseStatisticsContent"); if(!container)return;
  const rows=exerciseStatRows(); const names=[...new Set(rows.map(row=>row.name).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  if(exerciseStatExercise!=="all"&&!names.includes(exerciseStatExercise))exerciseStatExercise="all";
  const selection=document.getElementById("exerciseStatSelection"); if(selection)selection.textContent=exerciseStatExercise==="all"?"":exerciseStatExercise;
  document.querySelector(".exercise-stat-controls")?.classList.toggle("all-exercises",exerciseStatExercise==="all");
  document.getElementById("exerciseStatSpecificHeader")?.toggleAttribute("hidden",exerciseStatExercise==="all");
  document.getElementById("exerciseStatMetric")?.toggleAttribute("hidden",exerciseStatExercise==="all");
  renderExerciseStatFilter(names);
  if(exerciseStatExercise==="all"){
    const summaries=names.map(name=>{const values=rows.filter(row=>row.name===name).sort((a,b)=>new Date(a.date)-new Date(b.date));const valid=metric=>values.filter(row=>row[metric]>0);const cardio=values.some(row=>row.type==="cardio");const growthMetric=cardio?"duration":"weight";const first=valid(growthMetric)[0]?.[growthMetric]||0;const latest=valid(growthMetric).at(-1)?.[growthMetric]||0;return {name,cardio,sessions:values.length,latestWeight:valid("weight").at(-1)?.weight||0,bestWeight:Math.max(0,...values.map(row=>row.weight)),latestReps:valid("reps").at(-1)?.reps||0,bestReps:Math.max(0,...values.map(row=>row.reps)),latestDuration:valid("duration").at(-1)?.duration||0,bestDuration:Math.max(0,...values.map(row=>row.duration)),totalDuration:values.reduce((sum,row)=>sum+row.duration,0),latestEffort:valid("effort").at(-1)?.effort||0,bestEffort:Math.max(0,...values.map(row=>row.effort)),improvement:first?Math.round((latest-first)/first*100):0};}).filter(item=>item.sessions);
    const sorters={name:(a,b)=>a.name.localeCompare(b.name),weight:(a,b)=>a.bestWeight-b.bestWeight,reps:(a,b)=>a.bestReps-b.bestReps,duration:(a,b)=>a.bestDuration-b.bestDuration,effort:(a,b)=>a.bestEffort-b.bestEffort,improvement:(a,b)=>a.improvement-b.improvement}; summaries.sort((a,b)=>(sorters[exerciseStatSort]||sorters.name)(a,b)*(exerciseStatSortDirection==="desc"?-1:1));
    container.innerHTML=summaries.length?`<div class="performance-list">${summaries.map(item=>`<button type="button" class="card performance-summary-card" data-exercise="${item.name.replaceAll('"','&quot;')}"><div class="performance-summary-heading"><span><strong>${item.name}</strong><small>${item.sessions} ${item.sessions===1?"session":"sessions"}</small></span><span class="performance-chevron"><svg aria-hidden="true"><use href="#icon-arrow-right"></use></svg></span></div><div class="performance-summary-grid">${item.cardio?`<span><small>Latest time</small><strong>${item.latestDuration} min</strong></span><span><small>Longest time</small><strong>${item.bestDuration} min</strong></span><span><small>Total time</small><strong>${item.totalDuration} min</strong></span>`:`<span><small>Latest weight</small><strong>${item.latestWeight} kg</strong></span><span><small>Highest weight</small><strong>${item.bestWeight} kg</strong></span><span><small>Latest reps</small><strong>${item.latestReps}</strong></span><span><small>Highest reps</small><strong>${item.bestReps}</strong></span>`}<span><small>Latest effort</small><strong>${item.latestEffort||"—"}</strong></span><span><small>Highest effort</small><strong>${item.bestEffort||"—"}</strong></span><span class="performance-growth"><small>Growth</small><strong>${item.improvement>0?"+":""}${item.improvement}%</strong></span></div></button>`).join("")}</div>`:"<div class='card empty-state-card'><p>Complete an exercise to see its statistics.</p></div>";
    container.querySelectorAll("[data-exercise]").forEach(button=>button.addEventListener("click",()=>{exerciseStatExercise=button.dataset.exercise;renderExerciseStatistics();})); return;
  }
  const chosen=exerciseStatExercise;
  const isCardio=rows.some(row=>row.name===chosen&&row.type==="cardio"); if(isCardio&&!["duration","effort"].includes(exerciseStatMetric))exerciseStatMetric="duration"; if(!isCardio&&exerciseStatMetric==="duration")exerciseStatMetric="weight";
  const values=rows.filter(row=>row.name===chosen&&row[exerciseStatMetric]>0).sort((a,b)=>new Date(a.date)-new Date(b.date));
  const unit=exerciseStatMetric==="weight"?" kg":exerciseStatMetric==="effort"?"/5":exerciseStatMetric==="duration"?" min":"";
  document.querySelectorAll("#exerciseStatMetric [data-metric]").forEach(button=>{button.hidden=isCardio?!["duration","effort"].includes(button.dataset.metric):button.dataset.metric==="duration";button.classList.toggle("active",button.dataset.metric===exerciseStatMetric);});
  const latest=values.at(-1)?.[exerciseStatMetric]||0; const first=values[0]?.[exerciseStatMetric]||0; const best=Math.max(0,...values.map(row=>row[exerciseStatMetric])); const change=first?Math.round((latest-first)/first*100):0;
  container.innerHTML=`<div class="exercise-stat-grid"><div class="card"><span>Latest</span><strong>${latest}${unit}</strong></div><div class="card"><span>Best</span><strong>${best}${unit}</strong></div><div class="card"><span>Change</span><strong>${change>0?"+":""}${change}%</strong></div><div class="card"><span>Sessions</span><strong>${values.length}</strong></div></div><div class="card exercise-stat-history"><h2>Recent Sessions</h2>${values.slice(-8).reverse().map(row=>`<p><span>${new Date(row.date).toLocaleDateString("en-GB",{day:"numeric",month:"short"})}</span><strong>${row[exerciseStatMetric]}${unit}</strong></p>`).join("")||"<p>No results for this metric.</p>"}</div>`;
}
function renderExerciseStatFilter(names){
  const options=document.getElementById("exerciseStatOptions");if(!options)return;options.innerHTML="<h3>Sort exercises by</h3>";
  [["name","Name"],["weight","Weight"],["reps","Reps"],["duration","Cardio Time"],["effort","Effort"],["improvement","Growth"]].forEach(([value,label])=>{const button=document.createElement("button");button.type="button";button.textContent=label;button.classList.toggle("active",value===exerciseStatSort);button.onclick=()=>{exerciseStatSort=value;exerciseStatExercise="all";renderExerciseStatFilter(names);renderExerciseStatistics();};options.appendChild(button);});
  const direction=document.createElement("button");direction.type="button";direction.className="sort-direction-button";direction.textContent=exerciseStatSortDirection==="asc"?"↑ Low to High / A to Z":"↓ High to Low / Z to A";direction.onclick=()=>{exerciseStatSortDirection=exerciseStatSortDirection==="asc"?"desc":"asc";document.getElementById("exerciseStatFilterDialog")?.close();renderExerciseStatistics();};options.appendChild(direction);
}
document.getElementById("exerciseStatisticsBack")?.addEventListener("click",()=>showPage("statistics"));
document.getElementById("exerciseStatFilter")?.addEventListener("click",()=>{renderExerciseStatFilter([...new Set(exerciseStatRows().map(row=>row.name).filter(Boolean))].sort((a,b)=>a.localeCompare(b)));document.getElementById("exerciseStatFilterDialog")?.showModal();});
document.getElementById("closeExerciseStatFilter")?.addEventListener("click",()=>document.getElementById("exerciseStatFilterDialog")?.close());
document.getElementById("showAllPerformance")?.addEventListener("click",()=>{exerciseStatExercise="all";renderExerciseStatistics();});
document.querySelectorAll("#exerciseStatMetric [data-metric]").forEach(button=>button.addEventListener("click",()=>{exerciseStatMetric=button.dataset.metric;document.querySelectorAll("#exerciseStatMetric [data-metric]").forEach(item=>item.classList.toggle("active",item===button));renderExerciseStatistics();}));
