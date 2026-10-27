// SPOT — WORKOUT HISTORY
function getSavedWorkoutHistory(){try{const h=JSON.parse(localStorage.getItem("fitness_workout_history")||"[]");return Array.isArray(h)?h:[]}catch{return[]}}
function historyDate(v){return new Date(v).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}
function setHistoryBack(label,run){const b=document.getElementById("workoutHistoryBack");b.setAttribute("aria-label",label);b.onclick=run}

function renderWorkoutHistory(){
 const c=document.getElementById("workoutHistoryList");if(!c)return;const history=getSavedWorkoutHistory();
 document.getElementById("workoutHistoryIntro").hidden=history.length>0;setHistoryBack("Back to Workouts",()=>showPage("workouts"));c.innerHTML="";
 const groups=new Map();history.forEach(s=>{const k=s.programmeRunId||s.programmeId||s.programmeName||"workouts";if(!groups.has(k))groups.set(k,[]);groups.get(k).push(s)});
 [...groups.values()].sort((a,b)=>new Date(b.at(-1)?.finishedAt)-new Date(a.at(-1)?.finishedAt)).forEach(sessions=>{
  sessions.sort((a,b)=>new Date(a.finishedAt)-new Date(b.finishedAt));const card=document.createElement("div");card.className="card history-session-card";
  const title=document.createElement("h3");title.textContent=sessions[0].programmeName||"Workout Block";const meta=document.createElement("p");meta.textContent=`Started ${historyDate(sessions[0].programmeRunStartedAt||sessions[0].startedAt||sessions[0].finishedAt)} • ${sessions.length} ${sessions.length===1?"workout":"workouts"}`;
  const button=document.createElement("button");button.className="history-view-button";button.textContent="View";button.onclick=()=>viewWorkoutBlockHistory(sessions);card.append(title,meta,button);c.appendChild(card)
 })
}

function viewWorkoutBlockHistory(sessions){
 const c=document.getElementById("workoutHistoryList");setHistoryBack("Back to History",renderWorkoutHistory);c.innerHTML="";
 const summary=document.createElement("div");summary.className="card history-detail-summary";summary.innerHTML=`<h2>${sessions[0].programmeName||"Workout Block"}</h2><p>Started ${historyDate(sessions[0].programmeRunStartedAt||sessions[0].startedAt||sessions[0].finishedAt)}</p>`;c.appendChild(summary);
 [...sessions].sort((a,b)=>new Date(b.finishedAt)-new Date(a.finishedAt)).forEach(s=>{const card=document.createElement("div");card.className="card history-session-card";const title=document.createElement("h3");title.textContent=s.workoutName;const meta=document.createElement("p");meta.textContent=`${historyDate(s.finishedAt)}${s.weekNumber?` • Week ${s.weekNumber}`:""}`;const button=document.createElement("button");button.className="history-view-button";button.textContent="View";button.onclick=()=>viewWorkoutHistoryDetails(s,sessions);card.append(title,meta,button);c.appendChild(card)})
}

function viewWorkoutHistoryDetails(session,blockSessions=[session]){
 const c=document.getElementById("workoutHistoryList");setHistoryBack("Back to Workout Block",()=>viewWorkoutBlockHistory(blockSessions));c.innerHTML="";
 const summary=document.createElement("div");summary.className="card history-detail-summary";summary.innerHTML=`<h2>${session.workoutName}</h2><p>${historyDate(session.finishedAt)}${session.weekNumber?` • Week ${session.weekNumber}`:""}</p>`;c.appendChild(summary);
 (session.exercises||[]).forEach(ex=>{const card=document.createElement("div");card.className="card history-exercise-card";const title=document.createElement("h3");title.textContent=ex.name;card.appendChild(title);if(ex.sessionNote){const p=document.createElement("p");p.className="previous-session-note";p.textContent=ex.sessionNote;card.appendChild(p)}if(ex.type==="cardio"){const p=document.createElement("p");p.className="history-set-row";p.textContent=`${Number(ex.durationMinutes)||0} min`;card.appendChild(p)}else(ex.sets||[]).filter(s=>s.completed).forEach((s,i)=>{const p=document.createElement("p");p.className="history-set-row";p.textContent=`Set ${i+1}: ${Number(s.weight)||0} kg × ${Number(s.reps)||0} reps`;card.appendChild(p)});if(ex.effort){const p=document.createElement("p");p.className="history-effort";p.textContent=`Effort ${ex.effort}/5`;card.appendChild(p)}c.appendChild(card)})
}
