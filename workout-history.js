// SPOT — WORKOUT HISTORY
function getSavedWorkoutHistory(){try{const value=JSON.parse(localStorage.getItem("fitness_workout_history")||"[]");return Array.isArray(value)?value:[]}catch{return[]}}
function saveWorkoutHistory(history){localStorage.setItem("fitness_workout_history",JSON.stringify(history));if(typeof updateDashboard==="function")updateDashboard()}
function historyDate(value){return new Date(value).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}
function historyReturnPage(){return window.workoutHistoryReturnPage||"profile"}
function setHistoryBack(label,run){const button=document.getElementById("workoutHistoryBack");button.setAttribute("aria-label",label);button.onclick=run}
function historyButton(text,run,className="history-view-button"){const button=document.createElement("button");button.type="button";button.className=className;button.textContent=text;button.onclick=run;return button}
function commentItems(value){return String(value||"").split(/\n+/).map(item=>item.trim()).filter(Boolean)}
function commentList(value){const list=document.createElement("ol");list.className="numbered-comment-list";commentItems(value).forEach(item=>{const row=document.createElement("li");row.textContent=item;list.appendChild(row)});return list}

async function copyWorkoutComments(text,button){try{await navigator.clipboard.writeText(text);button.classList.add("is-copied");setTimeout(()=>button.classList.remove("is-copied"),1000)}catch{}}
function commentCopyButton(text,label="Copy comment"){const button=document.createElement("button");button.type="button";button.className="note-copy-button icon-button";button.setAttribute("aria-label",label);button.innerHTML='<svg aria-hidden="true"><use href="#icon-copy"></use></svg>';button.onclick=()=>copyWorkoutComments(text,button);return button}
function renderWorkoutNotes(){
 const container=document.getElementById("workoutNotesList");if(!container)return;container.innerHTML="";document.getElementById("workoutNotesBack").onclick=()=>showPage(window.workoutNotesReturnPage||"profile");
 const sessions=getSavedWorkoutHistory().filter(session=>String(session.workoutNote||"").trim());const blocks=new Map();sessions.forEach(session=>{const key=session.programmeRunId||session.programmeId||session.programmeName||"workouts";if(!blocks.has(key))blocks.set(key,[]);blocks.get(key).push(session)});
 if(!blocks.size){container.innerHTML='<div class="card empty-state-card"><p>No saved comments yet.</p></div>';return}
 [...blocks.values()].sort((a,b)=>new Date(b.at(-1)?.finishedAt)-new Date(a.at(-1)?.finishedAt)).forEach(block=>{const card=document.createElement("article");card.className="card comment-block-card";const title=document.createElement("div");title.innerHTML=`<strong>${formatSpotTitle(block[0].programmeName||"Workout Block")}</strong><small>${block.length} ${block.length===1?"comment":"comments"}</small>`;const open=historyButton("View",()=>renderWorkoutCommentBlock(block));card.append(title,open);container.appendChild(card)})
}
function workoutCommentSessionKey(session){return session.id||`${session.workoutId||session.workoutName}-${session.finishedAt}`}
function renderWorkoutCommentBlock(sessions,editing=false){
 const container=document.getElementById("workoutNotesList");container.innerHTML="";document.getElementById("workoutNotesBack").onclick=editing?()=>renderWorkoutCommentBlock(sessions,false):renderWorkoutNotes;
 const toolbar=document.createElement("div");toolbar.className="comments-block-toolbar";toolbar.innerHTML=`<div><h2>${formatSpotTitle(sessions[0]?.programmeName||"Workout Comments")}</h2><small>Comments grouped by training week</small></div>`;
 const edit=document.createElement("button");edit.type="button";edit.className="icon-button outlined-icon-button";edit.setAttribute("aria-label",editing?"Save comments":"Edit comments");edit.innerHTML=`<svg aria-hidden="true"><use href="#${editing?"icon-check-smooth":"icon-edit"}"></use></svg>`;toolbar.appendChild(edit);container.appendChild(toolbar);
 const groups=new Map();sessions.forEach(session=>{const key=Number(session.weekNumber)||1;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(session)});
 const drafts=new Map(sessions.map(session=>[workoutCommentSessionKey(session),session.workoutNote||""]));
 [...groups.entries()].sort((a,b)=>a[0]-b[0]).forEach(([week,items])=>{items.sort((a,b)=>new Date(a.finishedAt)-new Date(b.finishedAt));const card=document.createElement("section");card.className="card comment-week-card";const heading=document.createElement("header");const weekText=items.map(item=>`${formatSpotTitle(item.workoutName||"Workout")}\n${item.workoutNote}`).join("\n\n");heading.innerHTML=`<div><small>Training week</small><h2>Week ${week}</h2></div>`;heading.appendChild(commentCopyButton(weekText,`Copy all Week ${week} comments`));card.appendChild(heading);items.forEach(item=>{const row=document.createElement("article");row.className="comment-entry";const content=document.createElement("div");content.className="comment-entry-copy";const workout=document.createElement("h3");workout.textContent=formatSpotTitle(item.workoutName||"Workout");const meta=document.createElement("small");meta.textContent=historyDate(item.finishedAt);content.append(workout,meta);if(editing){const field=document.createElement("textarea");field.rows=3;field.value=item.workoutNote||"";field.oninput=()=>drafts.set(workoutCommentSessionKey(item),field.value);content.appendChild(field)}else content.appendChild(commentList(item.workoutNote));row.appendChild(content);card.appendChild(row)});container.appendChild(card)});
 edit.onclick=()=>{if(!editing){renderWorkoutCommentBlock(sessions,true);return}const history=getSavedWorkoutHistory();history.forEach(item=>{const key=workoutCommentSessionKey(item);if(drafts.has(key))item.workoutNote=drafts.get(key).trim()});saveWorkoutHistory(history);const refreshed=history.filter(item=>sessions.some(original=>workoutCommentSessionKey(original)===workoutCommentSessionKey(item)));renderWorkoutCommentBlock(refreshed,false)};
 if(editing){const cancel=historyButton("Cancel",()=>renderWorkoutCommentBlock(sessions,false),"comments-edit-cancel");container.appendChild(cancel)}
}
document.getElementById("openWorkoutNotes")?.addEventListener("click",()=>{window.workoutNotesReturnPage="profile";renderWorkoutNotes();showPage("workoutNotes")});
document.getElementById("workoutNotesBack")?.addEventListener("click",()=>showPage(window.workoutNotesReturnPage||"profile"));

function renderWorkoutHistory(){
 const container=document.getElementById("workoutHistoryList");if(!container)return;const history=getSavedWorkoutHistory();
 document.getElementById("workoutHistoryIntro").hidden=history.length>0;const returnPage=historyReturnPage();setHistoryBack(returnPage==="profile"?"Back to Profile":"Back to Workouts",()=>showPage(returnPage));container.innerHTML="";
 const groups=new Map();history.forEach(session=>{const key=session.programmeRunId||session.programmeId||session.programmeName||"workouts";if(!groups.has(key))groups.set(key,[]);groups.get(key).push(session)});
 [...groups.values()].sort((a,b)=>new Date(b.at(-1)?.finishedAt)-new Date(a.at(-1)?.finishedAt)).forEach(sessions=>{
  sessions.sort((a,b)=>new Date(a.finishedAt)-new Date(b.finishedAt));const card=document.createElement("div");card.className="card history-session-card";
  const title=document.createElement("h3");title.textContent=sessions[0].programmeName||"Workout Block";const meta=document.createElement("p");meta.textContent=`Started ${historyDate(sessions[0].programmeRunStartedAt||sessions[0].startedAt||sessions[0].finishedAt)} • ${sessions.length} ${sessions.length===1?"workout":"workouts"}`;
  card.append(title,meta,historyButton("View",()=>viewWorkoutBlockHistory(sessions)));container.appendChild(card)
 })
}

function viewWorkoutBlockHistory(sessions){
 const container=document.getElementById("workoutHistoryList");setHistoryBack("Back to History",renderWorkoutHistory);container.innerHTML="";
 const summary=document.createElement("div");summary.className="card history-detail-summary";summary.innerHTML=`<h2>${formatSpotTitle(sessions[0].programmeName||"Workout Block")}</h2><p>Started ${historyDate(sessions[0].programmeRunStartedAt||sessions[0].startedAt||sessions[0].finishedAt)}</p>`;container.appendChild(summary);
 [...sessions].sort((a,b)=>new Date(b.finishedAt)-new Date(a.finishedAt)).forEach(session=>{const card=document.createElement("div");card.className="card history-session-card";const title=document.createElement("h3");title.textContent=formatSpotTitle(session.workoutName);const meta=document.createElement("p");meta.textContent=`${historyDate(session.finishedAt)}${session.weekNumber?` • Week ${session.weekNumber}`:""}`;card.append(title,meta,historyButton("View",()=>viewWorkoutHistoryDetails(session,sessions)));container.appendChild(card)})
}

function appendHistoryExercise(card,exercise){
 const currentlyStarred=getProgrammes().some(programme=>(programme.weeks||[]).some(week=>(week.trainingDays||[]).some(day=>(day.exercises||[]).some(item=>item.starred&&String(item.name||"").trim().toLowerCase()===String(exercise.name||"").trim().toLowerCase()))));
 const titleRow=document.createElement("div");titleRow.className="history-exercise-title";const title=document.createElement("h3");title.textContent=formatSpotTitle(exercise.name);titleRow.appendChild(title);
 if(exercise.starred||currentlyStarred){const star=document.createElement("svg");star.classList.add("display-star");star.innerHTML='<use href="#icon-star-round"></use>';titleRow.appendChild(star)}card.appendChild(titleRow);
 if(exercise.sessionNote){const note=document.createElement("p");note.className="previous-session-note";note.textContent=exercise.sessionNote;card.appendChild(note)}
 if(exercise.type==="cardio"){const row=document.createElement("p");row.className="history-set-row";row.textContent=`${Number(exercise.durationMinutes)||0} min`;card.appendChild(row)}
 else (exercise.sets||[]).filter(set=>set.completed||set.weight!==""||set.reps!=="").forEach((set,index)=>{const row=document.createElement("p");row.className="history-set-row";row.textContent=`Set ${index+1}: ${Number(set.weight)||0} kg × ${Number(set.reps)||0} reps`;card.appendChild(row)});
 if(exercise.effort){const effort=document.createElement("p");effort.className="history-effort";effort.textContent=`Effort ${exercise.effort}/5`;card.appendChild(effort)}
}

function viewWorkoutHistoryDetails(session,blockSessions=[session]){
 const container=document.getElementById("workoutHistoryList");setHistoryBack("Back to Workout Block",()=>viewWorkoutBlockHistory(blockSessions));container.innerHTML="";
 const summary=document.createElement("div");summary.className="card history-detail-summary";summary.innerHTML=`<h2>${formatSpotTitle(session.workoutName)}</h2><p>${historyDate(session.finishedAt)}${session.weekNumber?` • Week ${session.weekNumber}`:""}</p>`;
 summary.appendChild(historyButton("Edit",()=>editWorkoutHistorySession(session,blockSessions),"history-edit-button"));container.appendChild(summary);
 if(session.workoutNote){const note=document.createElement("div");note.className="card history-workout-note";note.innerHTML="<h3>Workout Comments</h3>";note.appendChild(commentList(session.workoutNote));container.appendChild(note)}
 (session.exercises||[]).forEach(exercise=>{const card=document.createElement("div");card.className="card history-exercise-card";appendHistoryExercise(card,exercise);container.appendChild(card)})
}

function editWorkoutHistorySession(session,blockSessions){
 const container=document.getElementById("workoutHistoryList");setHistoryBack("Cancel Editing",()=>viewWorkoutHistoryDetails(session,blockSessions));container.innerHTML="";
 const draft=JSON.parse(JSON.stringify(session));const heading=document.createElement("div");heading.className="card history-detail-summary";heading.innerHTML=`<h2>Edit ${formatSpotTitle(session.workoutName)}</h2>`;container.appendChild(heading);
 const workoutNoteLabel=document.createElement("label");workoutNoteLabel.className="card history-workout-note-edit";workoutNoteLabel.textContent="Workout Comment";const workoutNote=document.createElement("textarea");workoutNote.rows=3;workoutNote.value=draft.workoutNote||"";workoutNote.oninput=()=>draft.workoutNote=workoutNote.value;workoutNoteLabel.appendChild(workoutNote);container.appendChild(workoutNoteLabel);
 (draft.exercises||[]).forEach(exercise=>{const card=document.createElement("div");card.className="card history-exercise-card history-edit-card";const title=document.createElement("h3");title.textContent=formatSpotTitle(exercise.name);card.appendChild(title);
  if(exercise.type==="cardio"){const label=document.createElement("label");label.textContent="Time (min)";const input=document.createElement("input");input.type="number";input.inputMode="numeric";input.value=exercise.durationMinutes??"";input.oninput=()=>exercise.durationMinutes=input.value===""?"":Number(input.value);label.appendChild(input);card.appendChild(label)}
  else (exercise.sets||[]).forEach((set,index)=>{const row=document.createElement("div");row.className="history-edit-set";const number=document.createElement("strong");number.textContent=String(index+1);const weight=document.createElement("input");weight.type="number";weight.inputMode="decimal";weight.value=set.weight??"";weight.setAttribute("aria-label",`Set ${index+1} weight`);weight.oninput=()=>set.weight=weight.value===""?"":Number(weight.value);const reps=document.createElement("input");reps.type="number";reps.inputMode="numeric";reps.value=set.reps??"";reps.setAttribute("aria-label",`Set ${index+1} reps`);reps.oninput=()=>set.reps=reps.value===""?"":Number(reps.value);row.append(number,weight,reps);card.appendChild(row)});
  const noteLabel=document.createElement("label");noteLabel.textContent="Notes";const note=document.createElement("textarea");note.rows=2;note.value=exercise.sessionNote||"";note.oninput=()=>exercise.sessionNote=note.value;noteLabel.appendChild(note);card.appendChild(noteLabel);
  const effortLabel=document.createElement("label");effortLabel.textContent="Effort";const effort=document.createElement("select");effort.innerHTML='<option value="">—</option><option>1</option><option>2</option><option>3</option><option>4</option><option>5</option>';effort.value=exercise.effort||"";effort.onchange=()=>exercise.effort=effort.value?Number(effort.value):null;effortLabel.appendChild(effort);card.appendChild(effortLabel);container.appendChild(card)
 });
 const actions=document.createElement("div");actions.className="history-edit-actions";actions.append(historyButton("Cancel",()=>viewWorkoutHistoryDetails(session,blockSessions),"history-cancel-button"),historyButton("Save Changes",()=>{const history=getSavedWorkoutHistory();const index=history.findIndex(item=>item.id===session.id||(item.finishedAt===session.finishedAt&&item.workoutId===session.workoutId));if(index>=0)history[index]=draft;saveWorkoutHistory(history);const blockIndex=blockSessions.findIndex(item=>item.id===session.id||(item.finishedAt===session.finishedAt&&item.workoutId===session.workoutId));if(blockIndex>=0)blockSessions[blockIndex]=draft;viewWorkoutHistoryDetails(draft,blockSessions)},"primary-button"));container.appendChild(actions)
}
