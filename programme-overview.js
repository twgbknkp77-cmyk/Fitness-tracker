// SPOT — PROGRAMME OVERVIEW
let overviewProgrammeId = null;
let overviewWeekNumber = 1;

function overviewHistory() {
  try {
    const history = JSON.parse(localStorage.getItem("fitness_workout_history") || "[]");
    return Array.isArray(history) ? history : [];
  } catch { return []; }
}

function overviewWorkoutComplete(programme, week, workout, history) {
  return history.some(session => session.programmeId === programme.id && session.workoutId === workout.id &&
    (!session.weekId || !week.id || session.weekId === week.id));
}

function openProgrammeOverview(programmeId) {
  const programme = getProgrammes().find(item => item.id === programmeId);
  if (!programme) return;
  overviewProgrammeId = programmeId;
  overviewWeekNumber = programme.currentWeek || 1;
  renderProgrammeOverview();
  showPage("programmeOverview");
}

function renderProgrammeOverview() {
  const programme = getProgrammes().find(item => item.id === overviewProgrammeId);
  const container = document.getElementById("programmeOverviewContent");
  if (!programme || !container) return;
  document.getElementById("programmeOverviewTitle").textContent = programme.name;
  const history = overviewHistory();
  const total = (programme.weeks || []).reduce((sum, week) => sum + (week.trainingDays || []).length, 0);
  const complete = (programme.weeks || []).reduce((sum, week) => sum + (week.trainingDays || []).filter(day => overviewWorkoutComplete(programme, week, day, history)).length, 0);
  const percent = total ? Math.round(complete / total * 100) : 0;
  container.innerHTML = `<div class="card overview-progress-card"><div><span>${complete} of ${total} workouts</span><strong>${percent}%</strong></div><div class="progress-track"><span style="width:${percent}%"></span></div></div>`;
  const selector = document.createElement("div"); selector.className = "overview-week-selector";
  (programme.weeks || []).forEach(week => {
    const button = document.createElement("button"); button.type="button"; button.textContent=`Week ${week.number}`;
    button.classList.toggle("active",week.number===overviewWeekNumber);
    if (week.number===overviewWeekNumber) button.dataset.selectedWeek = "true";
    button.onclick=()=>{overviewWeekNumber=week.number;renderProgrammeOverview();}; selector.appendChild(button);
  });
  container.appendChild(selector);
  requestAnimationFrame(() => selector.querySelector("[data-selected-week='true']")?.scrollIntoView({behavior:"smooth",inline:"center",block:"nearest"}));
  const week = programme.weeks?.[overviewWeekNumber-1];
  const list = document.createElement("div"); list.className="overview-day-list";
  const days=(week?.trainingDays||[]).map(day=>({day,done:overviewWorkoutComplete(programme,week,day,history)}));
  const remaining=days.filter(item=>!item.done); const completed=days.filter(item=>item.done);
  const appendGroup=(title,items)=>{
    if(!items.length)return; const heading=document.createElement("h2"); heading.className="workout-group-heading overview-group-heading"; heading.textContent=title; list.appendChild(heading);
    items.forEach(({day,done})=>{ const card=document.createElement("div"); card.className="card overview-day-card";
      card.innerHTML=`<div><h3>${day.name}</h3><p>${(day.exercises||[]).length} ${(day.exercises||[]).length===1?"exercise":"exercises"}</p></div><span class="overview-status ${done?"is-done":""}">${done?'<svg aria-hidden="true"><use href="#icon-check-smooth"></use></svg>':'<svg aria-hidden="true"><use href="#icon-arrow-right"></use></svg>'}</span>`;
      card.onclick=()=>{ if(programme.id===getActiveProgrammeId()){ window.workoutDetailReturnPage="programmeOverview";viewedWorkoutWeek=overviewWeekNumber;expandedWorkoutId=day.id;renderActiveWorkout();showPage("workouts"); } else openProgrammeEditor(programme.id); }; list.appendChild(card); });
  };
  if(overviewWeekNumber===programme.currentWeek&&remaining.length){appendGroup("Next Up",remaining.slice(0,1));appendGroup("Upcoming",remaining.slice(1));}
  else appendGroup("Upcoming",remaining);
  appendGroup("Completed",completed);
  if(!list.children.length) list.innerHTML="<div class='card empty-state-card'><p>No training days in this week.</p></div>";
  container.appendChild(list);
}

document.getElementById("programmeOverviewBack")?.addEventListener("click",()=>showPage("library"));
document.getElementById("programmeOverviewEdit")?.addEventListener("click",()=>{if(overviewProgrammeId)openProgrammeEditor(overviewProgrammeId);});
