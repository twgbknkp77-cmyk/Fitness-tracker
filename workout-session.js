// FITNESS TRACKER — WORKOUT SESSION

const SESSION_HISTORY_KEY = "fitness_workout_history";
const ACTIVE_SESSION_KEY = "spot_active_workout_session_v1";

let currentSession = null;
let restTimerEndsAt = 0;
let restTimerRemaining = 0;
let restTimerInterval = null;
let restTimerPaused = false;
const REST_TIMER_CHOICE_KEY = "spot_rest_timer_choice_v1";
const SPOT_NOTIFICATIONS_KEY = "spot_notifications_enabled_v1";
let timerAudioContext = null;

function primeTimerAudio() {
  try {
    timerAudioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    if (timerAudioContext.state === "suspended") timerAudioContext.resume();
  } catch {}
}

function playTimerSound() {
  if (!timerAudioContext || timerAudioContext.state !== "running") return;
  [0, .18].forEach((delay, index) => {
    const oscillator=timerAudioContext.createOscillator(); const gain=timerAudioContext.createGain();
    oscillator.type="sine"; oscillator.frequency.value=index?880:660;
    gain.gain.setValueAtTime(.0001,timerAudioContext.currentTime+delay);
    gain.gain.exponentialRampToValueAtTime(.18,timerAudioContext.currentTime+delay+.015);
    gain.gain.exponentialRampToValueAtTime(.0001,timerAudioContext.currentTime+delay+.17);
    oscillator.connect(gain); gain.connect(timerAudioContext.destination);
    oscillator.start(timerAudioContext.currentTime+delay); oscillator.stop(timerAudioContext.currentTime+delay+.19);
  });
}

function timerNotificationEnabled() {
  return localStorage.getItem(SPOT_NOTIFICATIONS_KEY) === "true";
}

function showTimerFinishedAlert() {
  const toast=document.createElement("div"); toast.className="spot-timer-toast"; toast.textContent="Rest complete";
  document.body.appendChild(toast); requestAnimationFrame(()=>toast.classList.add("show"));
  setTimeout(()=>{toast.classList.remove("show");setTimeout(()=>toast.remove(),250);},2800);
  if (document.hidden && timerNotificationEnabled() && "Notification" in window && Notification.permission === "granted") {
    new Notification("Rest time complete", { icon:"icons/spot-icon-192.png", tag:"spot-rest-timer" });
  }
}

function completedSessionDuration(session) {
  const start = new Date(session.startedAt).getTime();
  const finish = new Date(session.finishedAt).getTime();
  return Number.isFinite(start) && Number.isFinite(finish)
    ? Math.max(0, Math.round((finish - start) / 60000)) : 0;
}

function completedSessionVolume(session) {
  return (session.exercises || []).reduce((total, exercise) => total +
    (exercise.sets || []).reduce((sum, set) => set.completed === false
      ? sum : sum + (Number(set.weight) || 0) * (Number(set.reps) || 0), 0), 0);
}

function completedSessionEffort(session) {
  const values = (session.exercises || []).map(exercise => Number(exercise.effort)).filter(value => value > 0);
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function completedCardioMinutes(session) {
  return (session.exercises || []).filter(exercise => exercise.type === "cardio")
    .reduce((total, exercise) => total + (Number(exercise.durationMinutes) || 0), 0);
}

function completionChange(current, previous, suffix = "") {
  if (!previous) return "—";
  const difference = current - previous;
  return `${difference > 0 ? "+" : ""}${Number.isInteger(difference) ? difference : difference.toFixed(1)}${suffix}`;
}

function renderWorkoutCompletionSummary(session, previousSession, progression) {
  const container = document.getElementById("workoutCompletionSummary");
  if (!container) return;
  const duration = completedSessionDuration(session);
  const volume = Math.round(completedSessionVolume(session));
  const effort = completedSessionEffort(session);
  const sets = (session.exercises || []).flatMap(exercise => exercise.sets || []).filter(set => set.completed).length;
  const oldDuration = previousSession ? completedSessionDuration(previousSession) : 0;
  const oldVolume = previousSession ? Math.round(completedSessionVolume(previousSession)) : 0;
  const oldEffort = previousSession ? completedSessionEffort(previousSession) : 0;
  const cardioMinutes = completedCardioMinutes(session);
  const oldCardioMinutes = previousSession ? completedCardioMinutes(previousSession) : 0;
  const cardioOnly = cardioMinutes > 0 && volume === 0;
  let insight = "Your first result for this workout is now saved.";
  if (previousSession) {
    const currentProgress = cardioOnly ? cardioMinutes : volume;
    const oldProgress = cardioOnly ? oldCardioMinutes : oldVolume;
    const percent = oldProgress ? Math.round(((currentProgress - oldProgress) / oldProgress) * 100) : 0;
    insight = percent > 0 ? `Training volume increased by ${percent}% from your previous session.`
      : percent < 0 ? `Training volume was ${Math.abs(percent)}% lower than your previous session.`
      : "Training volume matched your previous session.";
    if (cardioOnly) insight = percent > 0 ? `Cardio time increased by ${percent}% from your previous session.`
      : percent < 0 ? `Cardio time was ${Math.abs(percent)}% lower than your previous session.`
      : "Cardio time matched your previous session.";
    if (effort && oldEffort && effort < oldEffort) insight += " Average effort was lower.";
  }
  const next = progression?.advanced ? `Week complete — Week ${progression.newWeek} is now ready.`
    : progression?.programmeComplete ? "Programme complete." : "Your next workout is ready when you are.";
  container.innerHTML = `
    <div class="completion-hero"><span class="completion-check">✓</span><p>Workout Complete</p><h1>${session.workoutName}</h1><small>${new Date(session.finishedAt).toLocaleDateString("en-GB", {day:"numeric",month:"short",year:"numeric"})}</small></div>
    <div class="completion-metric-grid"><div><span>Duration</span><strong>${duration} min</strong></div><div><span>${cardioOnly ? "Cardio" : "Sets"}</span><strong>${cardioOnly ? `${cardioMinutes} min` : sets}</strong></div><div><span>${cardioOnly ? "Exercises" : "Volume"}</span><strong>${cardioOnly ? (session.exercises || []).length : `${volume.toLocaleString()} kg`}</strong></div><div><span>Avg effort</span><strong>${effort ? effort.toFixed(1) : "—"}</strong></div></div>
    <div class="card completion-comparison"><h2>Previous Session</h2>${previousSession ? `<div><span>${cardioOnly ? "Cardio time" : "Volume"}</span><strong>${cardioOnly ? `${oldCardioMinutes} min` : `${oldVolume.toLocaleString()} kg`}</strong><em>${cardioOnly ? completionChange(cardioMinutes,oldCardioMinutes," min") : completionChange(volume,oldVolume," kg")}</em></div><div><span>Duration</span><strong>${oldDuration} min</strong><em>${completionChange(duration,oldDuration," min")}</em></div><div><span>Average effort</span><strong>${oldEffort ? oldEffort.toFixed(1) : "—"}</strong><em>${oldEffort ? completionChange(effort,oldEffort) : "—"}</em></div>` : "<p>No previous session to compare yet.</p>"}</div>
    <p class="completion-insight">${insight}</p><p class="completion-next">${next}</p><button type="button" id="closeWorkoutSummary" class="primary-button">Done</button>`;
  document.getElementById("closeWorkoutSummary")?.addEventListener("click", () => showPage("workouts"));
  showPage("workoutComplete");
}

function formatRestTime(seconds) {
  const safe = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2,"0")}`;
}

function updateRestTimerDisplay() {
  const remaining = restTimerPaused ? restTimerRemaining : Math.max(0,(restTimerEndsAt-Date.now())/1000);
  const running = remaining > 0;
  const label = document.getElementById("restTimerLabel");
  const button = document.getElementById("openRestTimer");
  if (label) label.textContent = running ? formatRestTime(remaining) : "Timer";
  button?.classList.toggle("is-running",running);
  document.getElementById("restTimerDockIdle")?.toggleAttribute("hidden",running);
  document.getElementById("restTimerDockRunning")?.toggleAttribute("hidden",!running);
  document.getElementById("restTimerRunningActions")?.toggleAttribute("hidden",!running);
  document.getElementById("restTimerPresets")?.toggleAttribute("hidden",running);
  const pause = document.getElementById("pauseRestTimer");
  if (pause) pause.textContent = restTimerPaused ? "Resume" : "Pause";
  const dockPause = document.getElementById("dockPauseRestTimer");
  if (dockPause) {
    dockPause.setAttribute("aria-label",restTimerPaused?"Resume timer":"Pause timer");
    dockPause.innerHTML = restTimerPaused ? '<svg aria-hidden="true"><use href="#icon-play"></use></svg>' : '<svg aria-hidden="true"><use href="#icon-pause"></use></svg>';
  }
  if (!running && restTimerInterval) {
    clearInterval(restTimerInterval); restTimerInterval=null;
    if (!restTimerPaused && typeof navigator.vibrate==="function") navigator.vibrate([160,90,160]);
    if (!restTimerPaused) { playTimerSound(); showTimerFinishedAlert(); }
    button?.classList.add("timer-finished"); setTimeout(()=>button?.classList.remove("timer-finished"),900);
  }
}

function startRestTimer(seconds) {
  primeTimerAudio();
  restTimerRemaining=Number(seconds)||60; restTimerEndsAt=Date.now()+restTimerRemaining*1000; restTimerPaused=false;
  localStorage.setItem(REST_TIMER_CHOICE_KEY,String(seconds)); clearInterval(restTimerInterval);
  restTimerInterval=setInterval(updateRestTimerDisplay,250); updateRestTimerDisplay(); document.getElementById("restTimerDialog")?.close();
}

function endRestTimer() {
  clearInterval(restTimerInterval); restTimerInterval=null; restTimerRemaining=0; restTimerEndsAt=0; restTimerPaused=false;
  updateRestTimerDisplay(); document.getElementById("restTimerDialog")?.close();
}


// READ HISTORY SAFELY
function getWorkoutSessionHistory() {
  try {
    const history = JSON.parse(
      localStorage.getItem(SESSION_HISTORY_KEY) || "[]"
    );

    return Array.isArray(history) ? history : [];
  } catch {
    return [];
  }
}


// MATCH EXERCISES BY ID WHEN POSSIBLE, THEN BY NAME FOR OLDER DATA
function sessionExerciseName(name) {
  return String(name || "")
    .trim()
    .toLowerCase();
}


// FIND THE MOST RECENT RESULT FOR AN EXERCISE
function getPreviousExerciseResult(exercise, beforeTime) {
  const history = getWorkoutSessionHistory()
    .filter(session => {
      const finishedTime = new Date(session.finishedAt).getTime();

      return (
        Number.isFinite(finishedTime) &&
        finishedTime < beforeTime
      );
    })
    .sort(
      (a, b) =>
        new Date(b.finishedAt) -
        new Date(a.finishedAt)
    );

  for (const session of history) {
    const previousExercise = (
      Array.isArray(session.exercises)
        ? session.exercises
        : []
    ).find(item => {
      const sameId =
        exercise.id &&
        item.id &&
        exercise.id === item.id;

      const sameName =
        sessionExerciseName(item.name) ===
        sessionExerciseName(exercise.name);

      return sameId || sameName;
    });

    if (previousExercise) {
      return {
        finishedAt: session.finishedAt,
        note: previousExercise.sessionNote || "",
        effort: Number(previousExercise.effort) || null,
        durationMinutes: previousExercise.durationMinutes,
        sets: Array.isArray(previousExercise.sets)
          ? previousExercise.sets.filter(set => set.completed)
          : []
      };
    }
  }

  return null;
}

function saveActiveWorkoutSession() {
  if (!currentSession) return;

  try {
    currentSession.savedAt = new Date().toISOString();
    localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(currentSession));
  } catch {
    // The live session remains usable if device storage is temporarily full.
  }
}

function clearActiveWorkoutSession() {
  localStorage.removeItem(ACTIVE_SESSION_KEY);
}

function getSavedWorkoutSession() {
  try {
    const session = JSON.parse(localStorage.getItem(ACTIVE_SESSION_KEY));
    return session?.id && Array.isArray(session.exercises) ? session : null;
  } catch {
    return null;
  }
}


// CREATE ONE SET FOR A NEW SESSION
function createSessionSet(plannedWeight, plannedReps, plannedRepTarget = "") {
  const weight = Number(plannedWeight) || 0;
  const reps = Number(plannedReps) || 0;

  return {
    plannedWeight: weight,
    plannedReps: reps,
    plannedRepTarget: plannedRepTarget || String(reps),
    weight: "",
    reps: "",
    completed: false
  };
}


// START A WORKOUT
function startWorkout(workoutId) {
  const savedSession = getSavedWorkoutSession();
  if (savedSession) {
    currentSession = savedSession;
    renderWorkoutSession();
    showPage("workoutSession");
    return;
  }
  const programme = getProgrammes().find(
    item => item.id === getActiveProgrammeId()
  );

  if (!programme) return;

  const week =
    programme.weeks?.[programme.currentWeek - 1];

  const trainingDays =
    week?.trainingDays ||
    programme.days ||
    [];

  const workout = trainingDays.find(
    item => item.id === workoutId
  );

  if (!workout) return;

  const startedAt = new Date().toISOString();
  const startedTime = new Date(startedAt).getTime();

  currentSession = {
    id: createId(),
    programmeId: programme.id,
    programmeName: programme.name,
    programmeRunId: programme.activeRunId || programme.id,
    programmeRunStartedAt: programme.activeRunStartedAt || startedAt,
    weekId: week?.id || null,
    weekNumber: programme.currentWeek || 1,
    workoutId: workout.id,
    workoutName: workout.name,
    startedAt,

    exercises: (workout.exercises || []).map(exercise => ({
      id: exercise.id,
      name: exercise.name,
      starred: Boolean(exercise.starred),
      type: exercise.type || "strength",
      note: exercise.note || "",
      sessionNote: "",
      effort: null,
      completed: false,
      collapsed: false,
      targetSets: Number(exercise.sets) || 0,
      targetWeight: exercise.weight,
      targetRepLabel: getExerciseRepTarget(exercise).label,
      previousResult:
        getPreviousExerciseResult(exercise, startedTime),

      targetDurationMinutes: exercise.type === "cardio"
        ? Number(exercise.durationMinutes) || 0
        : undefined,
      durationMinutes: exercise.type === "cardio"
        ? ""
        : undefined,

      sets: exercise.type === "cardio" ? [] : Array.from(
        { length: Number(exercise.sets) || 0 },
        () => createSessionSet(
          exercise.weight,
          getExerciseRepTarget(exercise).min,
          getExerciseRepTarget(exercise).value
        )
      )
    }))
  };

  saveActiveWorkoutSession();
  renderWorkoutSession();
  showPage("workoutSession");
}


// SHOW THE HEAVIEST SET FROM THE MOST RECENT SESSION
function previousSessionBest(exercise) {
  const sets = exercise.previousResult?.sets || [];
  if (sets.length === 0) return null;

  return sets.reduce((best, set) => {
    const weight = Number(set.weight) || 0;
    const reps = Number(set.reps) || 0;
    const bestWeight = Number(best.weight) || 0;
    const bestReps = Number(best.reps) || 0;

    return (
      weight > bestWeight ||
      (weight === bestWeight && reps > bestReps)
    ) ? set : best;
  }, sets[0]);
}


// DISPLAY WORKOUT SESSION
function renderWorkoutSessionLegacy() {
  if (!currentSession) return;

  document.getElementById("sessionWorkoutName").textContent =
    currentSession.workoutName;

  document.getElementById("sessionProgrammeName").textContent =
    `${currentSession.programmeName} • Week ${currentSession.weekNumber}`;

  const container =
    document.getElementById("sessionExercises");

  container.innerHTML = "";

  currentSession.exercises.forEach(exercise => {
    if (!exercise.starred) {
      const wantedName = String(exercise.name || "").trim().toLowerCase();
      exercise.starred = getProgrammes().some(programme =>
        (programme.weeks || []).some(week =>
          (week.trainingDays || []).some(day =>
            (day.exercises || []).some(item =>
              item.starred && String(item.name || "").trim().toLowerCase() === wantedName
            )
          )
        )
      );
    }
    const card = document.createElement("div");
    card.className = "card session-exercise-card";
    card.classList.toggle("exercise-is-complete", Boolean(exercise.completed));
    card.classList.toggle("exercise-is-collapsed", Boolean(exercise.collapsed));

    const heading = document.createElement("h2");
    heading.textContent = exercise.name;
    if (exercise.starred) {
      const star = document.createElement("svg");
      star.classList.add("display-star");
      star.setAttribute("aria-label", "Starred exercise");
      star.innerHTML = '<use href="#icon-star-round"></use>';
      titleRow.append(heading, star);
    } else {
      titleRow.appendChild(heading);
    }

    const completeButton = document.createElement("button");
    completeButton.type = "button";
    completeButton.className = "exercise-complete-button";
    completeButton.textContent = "Done";
    completeButton.setAttribute(
      "aria-label",
      exercise.completed ? `Reopen ${exercise.name}` : `Complete ${exercise.name}`
    );
    completeButton.addEventListener("click", () => {
      exercise.completed = !exercise.completed;
      exercise.collapsed = exercise.completed;
      saveActiveWorkoutSession();
      renderWorkoutSession();
    });

    const previousHeading = document.createElement("p");
    previousHeading.className = "previous-session-heading";

    if (exercise.previousResult) {
      const date = new Date(
        exercise.previousResult.finishedAt
      ).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short"
      });

      previousHeading.textContent =
        `Last completed: ${date}`;
    } else {
      previousHeading.textContent =
        "No previous result for this exercise.";
    }

    card.append(heading, previousHeading);

    exercise.sets.forEach((set, setIndex) => {
      const row = document.createElement("div");
      row.className = "session-set-row";

      const label = document.createElement("strong");
      label.textContent = `Set ${setIndex + 1}`;

      const previous = document.createElement("span");
      previous.className = "previous-set-result";
      previous.textContent =
        `Last: ${previousSetText(exercise, setIndex)}`;

      const weightGroup = document.createElement("label");
      weightGroup.textContent = "Today kg";

      const weightInput = document.createElement("input");
      weightInput.type = "number";
      weightInput.inputMode = "decimal";
      weightInput.min = "0";
      weightInput.step = "0.5";
      weightInput.value = set.weight;
      weightInput.setAttribute(
        "aria-label",
        `${exercise.name} set ${setIndex + 1} weight in kilograms`
      );

      weightInput.addEventListener("input", () => {
        set.weight = Number(weightInput.value);
      });

      weightGroup.appendChild(weightInput);

      const repsGroup = document.createElement("label");
      repsGroup.textContent = "Today reps";

      const repsInput = document.createElement("input");
      repsInput.type = "number";
      repsInput.inputMode = "numeric";
      repsInput.min = "0";
      repsInput.step = "1";
      repsInput.value = set.reps;
      repsInput.setAttribute(
        "aria-label",
        `${exercise.name} set ${setIndex + 1} repetitions`
      );

      repsInput.addEventListener("input", () => {
        set.reps = Number(repsInput.value);
      });

      repsGroup.appendChild(repsInput);

      const completeLabel = document.createElement("label");
      completeLabel.className = "session-complete-label";
      completeLabel.textContent = "Done ";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = set.completed;

      checkbox.addEventListener("change", () => {
        set.completed = checkbox.checked;
        row.classList.toggle(
          "completed-set",
          set.completed
        );
        updateSessionProgress();
      });

      completeLabel.appendChild(checkbox);

      row.classList.toggle(
        "completed-set",
        set.completed
      );

      row.append(
        label,
        previous,
        weightGroup,
        repsGroup,
        completeLabel
      );

      if (exercise.sets.length > 1) {
        const removeSetButton =
          document.createElement("button");

        removeSetButton.type = "button";
        removeSetButton.className = "secondary-button";
        removeSetButton.textContent = "Remove";

        removeSetButton.addEventListener("click", () => {
          exercise.sets.splice(setIndex, 1);
          renderWorkoutSession();
        });

        row.appendChild(removeSetButton);
      }

      card.appendChild(row);
    });

    const addSetButton = document.createElement("button");
    addSetButton.type = "button";
    addSetButton.textContent = "+ Add Set";

    addSetButton.addEventListener("click", () => {
      const previousSet = exercise.sets.at(-1);

      exercise.sets.push(
        createSessionSet(
          previousSet?.weight || 0,
          previousSet?.reps || 0
        )
      );

      renderWorkoutSession();
    });

    card.appendChild(addSetButton);
    container.appendChild(card);
  });

  updateSessionProgress();
}


// COMPACT WORKOUT SESSION
function renderWorkoutSession() {
  if (!currentSession) return;

  document.getElementById("sessionWorkoutName").textContent =
    currentSession.workoutName;

  document.getElementById("sessionProgrammeName").textContent =
    `${currentSession.programmeName} • Week ${currentSession.weekNumber}`;

  const container = document.getElementById("sessionExercises");
  container.innerHTML = "";

  currentSession.exercises.forEach(exercise => {
    const card = document.createElement("div");
    card.className = "card session-exercise-card";
    card.classList.toggle("exercise-is-complete", Boolean(exercise.completed));
    card.classList.toggle("exercise-is-collapsed", Boolean(exercise.collapsed));

    const titleRow = document.createElement("div");
    titleRow.className = "session-exercise-title";

    const heading = document.createElement("h2");
    heading.textContent = exercise.name;

    const completeButton = document.createElement("button");
    completeButton.type = "button";
    completeButton.className = "exercise-complete-button";
    completeButton.textContent = "Done";
    completeButton.setAttribute(
      "aria-label",
      exercise.completed ? `Reopen ${exercise.name}` : `Complete ${exercise.name}`
    );
    completeButton.addEventListener("click", () => {
      exercise.completed = !exercise.completed;
      exercise.collapsed = exercise.completed;
      saveActiveWorkoutSession();
      renderWorkoutSession();
    });

    const menu = document.createElement("details");
    menu.className = "session-edit-menu";

    const summary = document.createElement("summary");
    summary.textContent = "Edit";
    summary.setAttribute("aria-label", `${exercise.name} options`);

    const menuPanel = document.createElement("div");
    menuPanel.className = "session-edit-panel";

    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.textContent = "Add set";
    addButton.addEventListener("click", () => {
      const last = exercise.sets.at(-1);
      exercise.sets.push(
        createSessionSet(
          last?.plannedWeight ?? last?.weight ?? 0,
          parseExerciseRepTarget(
            last?.plannedRepTarget ?? last?.plannedReps ?? last?.reps ?? 1
          )?.min || 1,
          last?.plannedRepTarget || String(last?.plannedReps ?? last?.reps ?? 1)
        )
      );
      renderWorkoutSession();
    });

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.textContent = "Remove last set";
    removeButton.disabled = exercise.sets.length <= 1;
    removeButton.addEventListener("click", () => {
      if (exercise.sets.length <= 1) return;
      exercise.sets.pop();
      renderWorkoutSession();
    });

    menuPanel.append(addButton, removeButton);
    menu.append(summary, menuPanel);
    card.appendChild(titleRow);

    const actionRow = document.createElement("div");
    actionRow.className = "session-exercise-actions";

    if (exercise.collapsed) {
      const editCompleted = document.createElement("button");
      editCompleted.type = "button";
      editCompleted.textContent = "Edit";
      editCompleted.addEventListener("click", () => {
        exercise.completed = false;
        exercise.collapsed = false;
        saveActiveWorkoutSession();
        renderWorkoutSession();
      });
      actionRow.append(completeButton, editCompleted);
      card.appendChild(actionRow);
      container.appendChild(card);
      return;
    }

    const previous = document.createElement("p");
    previous.className = "previous-session-heading";

    if (exercise.previousResult) {
      const date = new Date(exercise.previousResult.finishedAt)
        .toLocaleDateString("en-GB", { day: "numeric", month: "short" });
      const best = previousSessionBest(exercise);

      previous.textContent = exercise.type === "cardio"
        ? `Last: ${Number(exercise.previousResult.durationMinutes) || 0} min • ${date}`
        : best
          ? `Last: ${Number(best.weight) || 0} kg × ${Number(best.reps) || 0} • ${date}`
          : `Last completed • ${date}`;
    } else {
      previous.textContent = "No previous session";
    }

    if (exercise.type !== "cardio") {
      const target = document.createElement("p");
      target.className = "session-exercise-target";
      target.textContent =
        `Target: ${exercise.targetSets} sets × ${exercise.targetRepLabel} reps` +
        (exercise.targetWeight
          ? ` • ${exercise.targetWeight} kg`
          : "");
      card.appendChild(target);
    }

    if (exercise.note) {
      const note = document.createElement("p");
      note.className = "exercise-note session-exercise-note";
      note.textContent = exercise.note;
      card.appendChild(note);
    }

    card.appendChild(previous);

    if (exercise.previousResult?.note) {
      const lastNote = document.createElement("p");
      lastNote.className = "previous-session-note";
      lastNote.textContent = `Last session note: ${exercise.previousResult.note}`;
      card.appendChild(lastNote);
    }

    if (exercise.previousResult?.effort) {
      const lastEffort = document.createElement("p");
      lastEffort.className = "previous-session-effort";
      lastEffort.textContent = `Last effort: ${exercise.previousResult.effort}/5`;
      card.appendChild(lastEffort);
    }

    if (exercise.type === "cardio") {
      const cardioRow = document.createElement("div");
      cardioRow.className = "session-cardio-row";
      const durationLabel = document.createElement("label");
      durationLabel.textContent = "Time completed";
      const durationInput = document.createElement("input");
      durationInput.type = "number";
      durationInput.inputMode = "numeric";
      durationInput.min = "0";
      durationInput.step = "1";
      durationInput.value = exercise.durationMinutes;
      durationInput.addEventListener("input", () => {
        exercise.durationMinutes = durationInput.value === ""
          ? ""
          : Number(durationInput.value);
        updateSessionProgress();
      });
      const unit = document.createElement("span");
      unit.className = "input-unit";
      unit.textContent = "min";
      durationLabel.append(durationInput, unit);
      cardioRow.appendChild(durationLabel);
      card.appendChild(cardioRow);
    }

    exercise.sets.forEach((set, setIndex) => {
      const row = document.createElement("div");
      row.className = "session-set-row";

      const number = document.createElement("strong");
      number.textContent = String(setIndex + 1);

      const weightLabel = document.createElement("label");
      const weightInput = document.createElement("input");
      weightInput.type = "number";
      weightInput.inputMode = "decimal";
      weightInput.min = "0";
      weightInput.step = "0.5";
      weightInput.value = set.weight;
      weightInput.setAttribute("aria-label", `${exercise.name} set ${setIndex + 1} weight`);
      weightInput.addEventListener("input", () => {
        set.weight = weightInput.value === "" ? "" : Number(weightInput.value);
        updateSessionProgress();
      });
      const weightUnit = document.createElement("span");
      weightUnit.className = "input-unit";
      weightUnit.textContent = "kg";
      weightLabel.append(weightInput, weightUnit);

      const repsLabel = document.createElement("label");
      const repsInput = document.createElement("input");
      repsInput.type = "number";
      repsInput.inputMode = "numeric";
      repsInput.min = "0";
      repsInput.step = "1";
      repsInput.value = set.reps;
      repsInput.setAttribute("aria-label", `${exercise.name} set ${setIndex + 1} reps`);
      repsInput.addEventListener("input", () => {
        set.reps = repsInput.value === "" ? "" : Number(repsInput.value);
        updateSessionProgress();
      });
      const repsUnit = document.createElement("span");
      repsUnit.className = "input-unit";
      repsUnit.textContent = "reps";
      repsLabel.append(repsInput, repsUnit);

      row.append(number, weightLabel, repsLabel);
      card.appendChild(row);
    });

    const sessionNoteLabel = document.createElement("label");
    sessionNoteLabel.className = "session-note-field";
    sessionNoteLabel.textContent = "Notes";
    const sessionNoteInput = document.createElement("textarea");
    sessionNoteInput.rows = 2;
    sessionNoteInput.maxLength = 500;
    sessionNoteInput.placeholder = "Add a note for your next session";
    sessionNoteInput.value = exercise.sessionNote || "";
    sessionNoteInput.addEventListener("input", () => {
      exercise.sessionNote = sessionNoteInput.value;
      saveActiveWorkoutSession();
    });
    sessionNoteLabel.appendChild(sessionNoteInput);
    card.appendChild(sessionNoteLabel);

    const effort = document.createElement("fieldset");
    effort.className = "exercise-effort";
    const effortTitle = document.createElement("legend");
    effortTitle.textContent = "Effort";
    const effortButtons = document.createElement("div");
    effortButtons.className = "effort-buttons";
    for (let rating = 1; rating <= 5; rating += 1) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `effort-button effort-${rating}`;
      button.textContent = String(rating);
      button.setAttribute("aria-pressed", String(Number(exercise.effort) === rating));
      button.addEventListener("click", () => {
        exercise.effort = Number(exercise.effort) === rating ? null : rating;
        saveActiveWorkoutSession();
        renderWorkoutSession();
      });
      effortButtons.appendChild(button);
    }
    effort.append(effortTitle, effortButtons);
    card.appendChild(effort);

    actionRow.appendChild(completeButton);
    if (exercise.type !== "cardio") actionRow.appendChild(menu);
    else actionRow.classList.add("single-action");
    card.appendChild(actionRow);

    container.appendChild(card);
  });

  updateSessionProgress();
}


// UPDATE COMPLETED SET COUNT
function updateSessionProgress() {
  if (!currentSession) return;

  const sets = currentSession.exercises.flatMap(
    exercise => exercise.sets
  );

  const completed = sets.filter(set =>
    set.weight !== "" &&
    Number.isFinite(Number(set.weight)) &&
    set.reps !== "" &&
    Number.isInteger(Number(set.reps))
  ).length;

  const cardioCompleted = currentSession.exercises.filter(exercise =>
    exercise.type === "cardio" &&
    exercise.durationMinutes !== "" &&
    Number(exercise.durationMinutes) > 0
  ).length;
  const total = completed + cardioCompleted;

  document.getElementById("sessionProgress").textContent =
    `${total} ${total === 1 ? "result" : "results"} recorded`;
  saveActiveWorkoutSession();
}


// SAVE FINISHED WORKOUT
document
  .getElementById("finishWorkout")
  ?.addEventListener("click", async () => {
    if (!currentSession) return;

    document.activeElement?.blur();

    const allSets = currentSession.exercises.flatMap(
      exercise => exercise.sets
    );

    const completedSets = allSets.filter(set =>
      set.weight !== "" && set.reps !== ""
    );

    const cardioExercises = currentSession.exercises.filter(
      exercise => exercise.type === "cardio"
    );
    const completedCardio = cardioExercises.filter(exercise =>
      exercise.durationMinutes !== "" &&
      Number.isFinite(Number(exercise.durationMinutes)) &&
      Number(exercise.durationMinutes) > 0
    );

    const invalidCompletedSet = completedSets.some(set =>
      !Number.isFinite(Number(set.weight)) ||
      Number(set.weight) < 0 ||
      !Number.isInteger(Number(set.reps)) ||
      Number(set.reps) < 0
    );

    if (invalidCompletedSet) {
      await showSpotMessage("Check your results", "Please enter a valid weight and number of reps for every completed set.");
      return;
    }

    const blankSets = allSets.filter(set => set.weight === "" || set.reps === "").length;
    const missingCardio = cardioExercises.length - completedCardio.length;
    const missingEffort = currentSession.exercises.filter(exercise => !Number(exercise.effort)).length;
    const missingParts = [];
    if (blankSets) missingParts.push(`${blankSets} incomplete ${blankSets === 1 ? "set" : "sets"}`);
    if (missingCardio) missingParts.push(`${missingCardio} missing cardio ${missingCardio === 1 ? "time" : "times"}`);
    if (missingEffort) missingParts.push(`${missingEffort} missing effort ${missingEffort === 1 ? "rating" : "ratings"}`);

    let finishConfirmed = false;
    if (missingParts.length) {
      finishConfirmed = await showSpotConfirm(
        "Some information is missing",
        missingParts.join(" • "),
        { confirmText: "Finish Anyway", cancelText: "Go Back" }
      );
      if (!finishConfirmed) return;
    }

    if (!finishConfirmed && !await showSpotConfirm(
      "Finish this workout?",
      "Your results and notes will be saved to workout history.",
      { confirmText: "Finish Workout", cancelText: "Go Back" }
    )) return;

    allSets.forEach(set => {
      set.completed =
        set.weight !== "" && set.reps !== "";
    });

    const history = getWorkoutSessionHistory();
    const previousSession = [...history].reverse().find(session =>
      session.workoutId === currentSession.workoutId ||
      sessionExerciseName(session.workoutName) === sessionExerciseName(currentSession.workoutName)
    ) || null;

    const finishedSession = {
      ...currentSession,
      finishedAt: new Date().toISOString(),
      exercises: currentSession.exercises.map(exercise => {
        const { previousResult, ...savedExercise } = exercise;
        return savedExercise;
      })
    };

        history.push(finishedSession);

    try {
      localStorage.setItem(
        SESSION_HISTORY_KEY,
        JSON.stringify(history)
      );
    } catch {
      await showSpotMessage("Workout not saved", "Unable to save workout. Please try again.");
      return;
    }

    const progression =
      typeof advanceProgrammeAfterCompletedWorkout ===
      "function"
        ? advanceProgrammeAfterCompletedWorkout(
            currentSession.programmeId,
            currentSession.weekId
          )
        : { advanced: false };

    const completedSession = finishedSession;
    currentSession = null;
    clearActiveWorkoutSession();
    endRestTimer();

    if (typeof renderActiveWorkout === "function") {
      renderActiveWorkout();
    }

    if (typeof updateDashboard === "function") {
      updateDashboard();
    }

    renderWorkoutCompletionSummary(completedSession, previousSession, progression);
  });

document.getElementById("openRestTimer")?.addEventListener("click", () => {
  const lastChoice = localStorage.getItem(REST_TIMER_CHOICE_KEY) || "90";
  document.querySelectorAll("#restTimerPresets [data-seconds]").forEach(button => {
    button.classList.toggle("last-used", button.dataset.seconds === lastChoice);
  });
  updateRestTimerDisplay();
  document.getElementById("customRestTimer")?.setAttribute("hidden","");
  document.getElementById("restTimerDialog")?.showModal();
});
document.getElementById("setRestTimer")?.addEventListener("click", () => document.getElementById("openRestTimer")?.click());
document.querySelectorAll("#restTimerPresets [data-seconds]").forEach(button =>
  button.addEventListener("click", () => startRestTimer(button.dataset.seconds))
);
document.getElementById("closeRestTimer")?.addEventListener("click", () => document.getElementById("restTimerDialog")?.close());
document.getElementById("endRestTimer")?.addEventListener("click", endRestTimer);
document.getElementById("dockEndRestTimer")?.addEventListener("click", endRestTimer);
document.getElementById("addRestTimerTime")?.addEventListener("click", () => {
  if (restTimerPaused) restTimerRemaining += 30;
  else restTimerEndsAt += 30000;
  updateRestTimerDisplay();
});
document.getElementById("pauseRestTimer")?.addEventListener("click", () => {
  if (restTimerPaused) {
    restTimerEndsAt = Date.now() + restTimerRemaining * 1000;
    restTimerPaused = false;
  } else {
    restTimerRemaining = Math.max(0,(restTimerEndsAt-Date.now())/1000);
    restTimerPaused = true;
  }
  updateRestTimerDisplay();
});
document.getElementById("dockAddRestTimerTime")?.addEventListener("click", () => document.getElementById("addRestTimerTime")?.click());
document.getElementById("dockPauseRestTimer")?.addEventListener("click", () => {
  document.getElementById("pauseRestTimer")?.click();
});
document.getElementById("showCustomRestTimer")?.addEventListener("click",()=>{
  document.getElementById("restTimerPresets")?.setAttribute("hidden","");
  document.getElementById("customRestTimer")?.removeAttribute("hidden");
});
document.getElementById("startCustomRestTimer")?.addEventListener("click",async()=>{
  const input=document.getElementById("customRestSeconds"); const seconds=Number(input?.value);
  if(!Number.isInteger(seconds)||seconds<1||seconds>3600){await showSpotMessage("Check timer","Enter between 1 and 3600 seconds.");return;}
  startRestTimer(seconds);
});

const notificationToggle=document.getElementById("notificationsEnabled");
const notificationStatus=document.getElementById("notificationStatus");
function refreshNotificationSetting(){
  const supported="Notification" in window; const enabled=timerNotificationEnabled()&&supported&&Notification.permission==="granted";
  if(notificationToggle){notificationToggle.checked=enabled;notificationToggle.disabled=!supported;}
  if(notificationStatus)notificationStatus.textContent=!supported?"Notifications are not supported in this browser.":Notification.permission==="denied"?"Notifications are blocked in your phone settings.":enabled?"Timer alerts are enabled.":"Timer alerts are off.";
}
notificationToggle?.addEventListener("change",async()=>{
  if(!notificationToggle.checked){localStorage.setItem(SPOT_NOTIFICATIONS_KEY,"false");refreshNotificationSetting();return;}
  const permission=Notification.permission==="granted"?"granted":await Notification.requestPermission();
  localStorage.setItem(SPOT_NOTIFICATIONS_KEY,String(permission==="granted")); refreshNotificationSetting();
});
refreshNotificationSetting();

document.getElementById("saveAndExitWorkout")?.addEventListener("click", () => {
  saveActiveWorkoutSession();
  endRestTimer();
  document.getElementById("discardWorkoutDialog")?.close();
  currentSession = null;
  if (typeof renderActiveWorkout === "function") renderActiveWorkout();
  if (typeof updateDashboard === "function") updateDashboard();
  showPage("workouts");
});


// CANCEL WORKOUT
document
  .getElementById("cancelWorkout")
  ?.addEventListener("click", () => {
    if (!currentSession) return;

    document
      .getElementById("discardWorkoutDialog")
      ?.showModal();
  });

document
  .getElementById("keepWorkoutSession")
  ?.addEventListener("click", () => {
    document
      .getElementById("discardWorkoutDialog")
      ?.close();
  });

document
  .getElementById("confirmDiscardWorkout")
  ?.addEventListener("click", () => {
    document
      .getElementById("discardWorkoutDialog")
      ?.close();

    currentSession = null;
    clearActiveWorkoutSession();
    endRestTimer();
    showPage("workouts");
  });

document.getElementById("resumeSavedWorkout")?.addEventListener("click", () => {
  const saved = getSavedWorkoutSession();
  document.getElementById("resumeWorkoutDialog")?.close();
  if (!saved) return;
  currentSession = saved;
  renderWorkoutSession();
  showPage("workoutSession");
});

document.getElementById("discardSavedWorkout")?.addEventListener("click", () => {
  clearActiveWorkoutSession();
  document.getElementById("resumeWorkoutDialog")?.close();
});

window.addEventListener("beforeunload", saveActiveWorkoutSession);

setTimeout(() => {
  if (getSavedWorkoutSession() && !currentSession) {
    document.getElementById("resumeWorkoutDialog")?.showModal();
  }
}, 450);
