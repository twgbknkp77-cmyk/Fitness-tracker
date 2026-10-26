// FITNESS TRACKER — WORKOUT SESSION

const SESSION_HISTORY_KEY = "fitness_workout_history";
const ACTIVE_SESSION_KEY = "spot_active_workout_session_v1";

let currentSession = null;


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
    weekId: week?.id || null,
    weekNumber: programme.currentWeek || 1,
    workoutId: workout.id,
    workoutName: workout.name,
    startedAt,

    exercises: (workout.exercises || []).map(exercise => ({
      id: exercise.id,
      name: exercise.name,
      type: exercise.type || "strength",
      note: exercise.note || "",
      sessionNote: "",
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
    const card = document.createElement("div");
    card.className = "card session-exercise-card";
    card.classList.toggle("exercise-is-complete", Boolean(exercise.completed));
    card.classList.toggle("exercise-is-collapsed", Boolean(exercise.collapsed));

    const heading = document.createElement("h2");
    heading.textContent = exercise.name;

    const completeButton = document.createElement("button");
    completeButton.type = "button";
    completeButton.className = "exercise-complete-button";
    completeButton.textContent = exercise.completed ? "Done ✓" : "Done";
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
    completeButton.textContent = exercise.completed ? "Done ✓" : "Done";
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
    titleRow.append(heading);

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

    const partialSets = allSets.filter(set => {
      const hasWeight = set.weight !== "";
      const hasReps = set.reps !== "";
      return hasWeight !== hasReps;
    });

    if (partialSets.length > 0) {
      await showSpotMessage("Check your sets", "Complete both weight and reps for each entered set, or clear both fields.");
      return;
    }

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

    if (completedSets.length === 0 && completedCardio.length === 0) {
      await showSpotMessage("Nothing recorded yet", "Enter at least one result before finishing.");
      return;
    }

    if (completedCardio.length !== cardioExercises.length) {
      await showSpotMessage("Check cardio time", "Please enter a valid duration for each cardio activity.");
      return;
    }

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

    if (!await showSpotConfirm(
      "Finish this workout?",
      "Your results and notes will be saved to workout history.",
      { confirmText: "Finish Workout" }
    )) return;

    allSets.forEach(set => {
      set.completed =
        set.weight !== "" && set.reps !== "";
    });

    const history = getWorkoutSessionHistory();

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

    currentSession = null;
    clearActiveWorkoutSession();

    if (typeof renderActiveWorkout === "function") {
      renderActiveWorkout();
    }

    if (typeof updateDashboard === "function") {
      updateDashboard();
    }

    if (progression.advanced) {
      await showSpotMessage(
        "Workout saved",
        `Week complete — moving to Week ${progression.newWeek}.`
      );
    } else if (progression.programmeComplete) {
      await showSpotMessage("Programme complete", "You have completed the entire programme.");
    } else {
      await showSpotMessage("Workout saved", "Your results and notes are safely stored.");
    }

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
