// SPOT — WORKOUT HISTORY
function getSavedWorkoutHistory(){try{const value=JSON.parse(localStorage.getItem("fitness_workout_history")||"[]");return Array.isArray(value)?value:[]}catch{return[]}}
function saveWorkoutHistory(history){localStorage.setItem("fitness_workout_history",JSON.stringify(history));if(typeof updateDashboard==="function")updateDashboard()}
function historyDate(value){return new Date(value).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}
function setHistoryBack(label,run){const button=document.getElementById("workoutHistoryBack");button.setAttribute("aria-label",label);button.onclick=run}
function historyButton(text,run,className="history-view-button"){const button=document.createElement("button");button.type="button";button.className=className;button.textContent=text;button.onclick=run;return button}

function renderWorkoutHistory(){
 const container=document.getElementById("workoutHistoryList");if(!container)return;const history=getSavedWorkoutHistory();
 document.getElementById("workoutHistoryIntro").hidden=history.length>0;setHistoryBack("Back to Workouts",()=>showPage("workouts"));container.innerHTML="";
 const groups=new Map();history.forEach(session=>{const key=session.programmeRunId||session.programmeId||session.programmeName||"workouts";if(!groups.has(key))groups.set(key,[]);groups.get(key).push(session)});
 [...groups.values()].sort((a,b)=>new Date(b.at(-1)?.finishedAt)-new Date(a.at(-1)?.finishedAt)).forEach(sessions=>{
  sessions.sort((a,b)=>new Date(a.finishedAt)-new Date(b.finishedAt));const card=document.createElement("div");card.className="card history-session-card";
  const title=document.createElement("h3");title.textContent=sessions[0].programmeName||"Workout Block";const meta=document.createElement("p");meta.textContent=`Started ${historyDate(sessions[0].programmeRunStartedAt||sessions[0].startedAt||sessions[0].finishedAt)} • ${sessions.length} ${sessions.length===1?"workout":"workouts"}`;
  card.append(title,meta,historyButton("View",()=>viewWorkoutBlockHistory(sessions)));container.appendChild(card)
 })
}

function viewWorkoutBlockHistory(sessions){
 const container=document.getElementById("workoutHistoryList");setHistoryBack("Back to History",renderWorkoutHistory);container.innerHTML="";
 const summary=document.createElement("div");summary.className="card history-detail-summary";summary.innerHTML=`<h2>${sessions[0].programmeName||"Workout Block"}</h2><p>Started ${historyDate(sessions[0].programmeRunStartedAt||sessions[0].startedAt||sessions[0].finishedAt)}</p>`;container.appendChild(summary);
 [...sessions].sort((a,b)=>new Date(b.finishedAt)-new Date(a.finishedAt)).forEach(session=>{const card=document.createElement("div");card.className="card history-session-card";const title=document.createElement("h3");title.textContent=session.workoutName;const meta=document.createElement("p");meta.textContent=`${historyDate(session.finishedAt)}${session.weekNumber?` • Week ${session.weekNumber}`:""}`;card.append(title,meta,historyButton("View",()=>viewWorkoutHistoryDetails(session,sessions)));container.appendChild(card)})
}

function appendHistoryExercise(card,exercise){
 const currentlyStarred=getProgrammes().some(programme=>(programme.weeks||[]).some(week=>(week.trainingDays||[]).some(day=>(day.exercises||[]).some(item=>item.starred&&String(item.name||"").trim().toLowerCase()===String(exercise.name||"").trim().toLowerCase()))));
 const titleRow=document.createElement("div");titleRow.className="history-exercise-title";const title=document.createElement("h3");title.textContent=exercise.name;titleRow.appendChild(title);
 if(exercise.starred||currentlyStarred){const star=document.createElement("svg");star.classList.add("display-star");star.innerHTML='<use href="#icon-star-round"></use>';titleRow.appendChild(star)}card.appendChild(titleRow);
 if(exercise.sessionNote){const note=document.createElement("p");note.className="previous-session-note";note.textContent=exercise.sessionNote;card.appendChild(note)}
 if(exercise.type==="cardio"){const row=document.createElement("p");row.className="history-set-row";row.textContent=`${Number(exercise.durationMinutes)||0} min`;card.appendChild(row)}
 else (exercise.sets||[]).filter(set=>set.completed||set.weight!==""||set.reps!=="").forEach((set,index)=>{const row=document.createElement("p");row.className="history-set-row";row.textContent=`Set ${index+1}: ${Number(set.weight)||0} kg × ${Number(set.reps)||0} reps`;card.appendChild(row)});
 if(exercise.effort){const effort=document.createElement("p");effort.className="history-effort";effort.textContent=`Effort ${exercise.effort}/5`;card.appendChild(effort)}
}

function viewWorkoutHistoryDetails(session,blockSessions=[session]){
 const container=document.getElementById("workoutHistoryList");setHistoryBack("Back to Workout Block",()=>viewWorkoutBlockHistory(blockSessions));container.innerHTML="";
 const summary=document.createElement("div");summary.className="card history-detail-summary";summary.innerHTML=`<h2>${session.workoutName}</h2><p>${historyDate(session.finishedAt)}${session.weekNumber?` • Week ${session.weekNumber}`:""}</p>`;
 summary.appendChild(historyButton("Edit",()=>editWorkoutHistorySession(session,blockSessions),"history-edit-button"));container.appendChild(summary);
 (session.exercises||[]).forEach(exercise=>{const card=document.createElement("div");card.className="card history-exercise-card";appendHistoryExercise(card,exercise);container.appendChild(card)})
}

function editWorkoutHistorySession(session,blockSessions){
 const container=document.getElementById("workoutHistoryList");setHistoryBack("Cancel Editing",()=>viewWorkoutHistoryDetails(session,blockSessions));container.innerHTML="";
 const draft=JSON.parse(JSON.stringify(session));const heading=document.createElement("div");heading.className="card history-detail-summary";heading.innerHTML=`<h2>Edit ${session.workoutName}</h2>`;container.appendChild(heading);
 (draft.exercises||[]).forEach(exercise=>{const card=document.createElement("div");card.className="card history-exercise-card history-edit-card";const title=document.createElement("h3");title.textContent=exercise.name;card.appendChild(title);
  if(exercise.type==="cardio"){const label=document.createElement("label");label.textContent="Time (min)";const input=document.createElement("input");input.type="number";input.inputMode="numeric";input.value=exercise.durationMinutes??"";input.oninput=()=>exercise.durationMinutes=input.value===""?"":Number(input.value);label.appendChild(input);card.appendChild(label)}
  else (exercise.sets||[]).forEach((set,index)=>{const row=document.createElement("div");row.className="history-edit-set";const number=document.createElement("strong");number.textContent=String(index+1);const weight=document.createElement("input");weight.type="number";weight.inputMode="decimal";weight.value=set.weight??"";weight.setAttribute("aria-label",`Set ${index+1} weight`);weight.oninput=()=>set.weight=weight.value===""?"":Number(weight.value);const reps=document.createElement("input");reps.type="number";reps.inputMode="numeric";reps.value=set.reps??"";reps.setAttribute("aria-label",`Set ${index+1} reps`);reps.oninput=()=>set.reps=reps.value===""?"":Number(reps.value);row.append(number,weight,reps);card.appendChild(row)});
  const noteLabel=document.createElement("label");noteLabel.textContent="Notes";const note=document.createElement("textarea");note.rows=2;note.value=exercise.sessionNote||"";note.oninput=()=>exercise.sessionNote=note.value;noteLabel.appendChild(note);card.appendChild(noteLabel);
  const effortLabel=document.createElement("label");effortLabel.textContent="Effort";const effort=document.createElement("select");effort.innerHTML='<option value="">—</option><option>1</option><option>2</option><option>3</option><option>4</option><option>5</option>';effort.value=exercise.effort||"";effort.onchange=()=>exercise.effort=effort.value?Number(effort.value):null;effortLabel.appendChild(effort);card.appendChild(effortLabel);container.appendChild(card)
 });
 const actions=document.createElement("div");actions.className="history-edit-actions";actions.append(historyButton("Cancel",()=>viewWorkoutHistoryDetails(session,blockSessions),"history-cancel-button"),historyButton("Save Changes",()=>{const history=getSavedWorkoutHistory();const index=history.findIndex(item=>item.id===session.id||(item.finishedAt===session.finishedAt&&item.workoutId===session.workoutId));if(index>=0)history[index]=draft;saveWorkoutHistory(history);const blockIndex=blockSessions.findIndex(item=>item.id===session.id||(item.finishedAt===session.finishedAt&&item.workoutId===session.workoutId));if(blockIndex>=0)blockSessions[blockIndex]=draft;viewWorkoutHistoryDetails(draft,blockSessions)},"primary-button"));container.appendChild(actions)
}
