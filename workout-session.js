// FITNESS TRACKER — WORKOUT SESSION

const SESSION_HISTORY_KEY = "fitness_workout_history";

let currentSession = null;

// START A WORKOUT
function startWorkout(workoutId) {
  const programme = getProgrammes().find(
    item => item.id === getActiveProgrammeId()
  );

  if (!programme) return;

  const workout = programme.days.find(
    item => item.id === workoutId
  );

  if (!workout) return;

  currentSession = {
    id: crypto.randomUUID(),
        programmeId: programme.id,
    programmeName: programme.name,

    weekId:
      programme.weeks?.[programme.currentWeek - 1]?.id || null,

    weekNumber:
      programme.currentWeek || 1,

    workoutId: workout.id,
    workoutName: workout.name,
    startedAt: new Date().toISOString(),

    exercises: workout.exercises.map(exercise => ({
      id: exercise.id,
      name: exercise.name,

      sets: Array.from(
        { length: exercise.sets },
        () => ({
          weight: Number(exercise.weight) || 0,
          reps: Number(exercise.reps) || 0,
          completed: false
        })
      )
    }))
  };

  renderWorkoutSession();
  showPage("workoutSession");
}

// DISPLAY WORKOUT SESSION
function renderWorkoutSession() {
  if (!currentSession) return;

  document.getElementById("sessionWorkoutName").textContent =
    currentSession.workoutName;

  document.getElementById("sessionProgrammeName").textContent =
    currentSession.programmeName;

  const container = document.getElementById("sessionExercises");
  container.innerHTML = "";

  currentSession.exercises.forEach((exercise, exerciseIndex) => {
    const card = document.createElement("div");
    card.className = "card";

    const heading = document.createElement("h2");
    heading.textContent = exercise.name;

    card.appendChild(heading);

    exercise.sets.forEach((set, setIndex) => {
      const row = document.createElement("div");
      row.className = "session-set-row";

      const label = document.createElement("span");
      label.textContent = `Set ${setIndex + 1}`;

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

      weightInput.addEventListener("change", () => {
        set.weight = Number(weightInput.value);
      });

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

      repsInput.addEventListener("change", () => {
        set.reps = Number(repsInput.value);
      });

      const completeLabel = document.createElement("label");
      completeLabel.textContent = "Done ";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = set.completed;

      checkbox.addEventListener("change", () => {
        set.completed = checkbox.checked;
        updateSessionProgress();
      });

      completeLabel.appendChild(checkbox);

      row.append(label, weightInput, repsInput, completeLabel);
      card.appendChild(row);
    });

    const addSetButton = document.createElement("button");
    addSetButton.textContent = "+ Add Set";

    addSetButton.addEventListener("click", () => {
      const previousSet = exercise.sets.at(-1);

      exercise.sets.push({
        weight: previousSet ? previousSet.weight : 0,
        reps: previousSet ? previousSet.reps : 0,
        completed: false
      });

      renderWorkoutSession();
    });

    card.appendChild(addSetButton);
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

  const completed = sets.filter(set => set.completed).length;

  document.getElementById("sessionProgress").textContent =
    `${completed} / ${sets.length} sets completed`;
}
// ADVANCE AFTER THE FINAL WORKOUT IN A WEEK
function advanceProgrammeIfWeekComplete(session, history) {
  const programmes = getProgrammes();

  const programmeIndex = programmes.findIndex(
    programme => programme.id === session.programmeId
  );

  if (programmeIndex === -1) return false;

  const programme = programmes[programmeIndex];

  const completedWeek = programme.weeks?.find(week =>
    session.weekId
      ? week.id === session.weekId
      : week.number === session.weekNumber
  );

  if (!completedWeek) return false;

  // Only advance from the programme's actual current week.
  if (completedWeek.number !== programme.currentWeek) {
    return false;
  }

  const trainingDays = completedWeek.trainingDays || [];

  if (trainingDays.length === 0) return false;

  const everyDayComplete = trainingDays.every(workout => {
    return history.some(historyItem => {
      const sameProgramme =
        historyItem.programmeId === programme.id;

      const sameWorkout =
        historyItem.workoutId === workout.id;

      const sameWeek =
        !historyItem.weekId ||
        historyItem.weekId === completedWeek.id;

      return sameProgramme && sameWorkout && sameWeek;
    });
  });

  if (!everyDayComplete) return false;

  // Stay on the final week once the programme is complete.
  if (programme.currentWeek >= programme.durationWeeks) {
    return false;
  }

  programme.currentWeek += 1;

  // Point the compatibility days list at the new current week.
  programme.days =
    programme.weeks[programme.currentWeek - 1].trainingDays;

  programmes[programmeIndex] = programme;
  saveProgrammes(programmes);

  // Open the newly activated week on the Workouts page.
  viewedWorkoutWeek = programme.currentWeek;
  expandedWorkoutId = null;

  return true;
}
// SAVE FINISHED WORKOUT
document.getElementById("finishWorkout")
  ?.addEventListener("click", () => {
    if (!currentSession) return;

    // Save any values still being edited.
    document.activeElement?.blur();

    const allSets = currentSession.exercises.flatMap(
      exercise => exercise.sets
    );

    const completedSets = allSets.filter(set => set.completed).length;

    if (completedSets === 0) {
      alert("Complete at least one set before finishing.");
      return;
    }

    if (!confirm("Finish and save this workout?")) return;

    const history = JSON.parse(
      localStorage.getItem(SESSION_HISTORY_KEY) || "[]"
    );

    history.push({
      ...currentSession,
      finishedAt: new Date().toISOString()
    });

    try {
      localStorage.setItem(
        SESSION_HISTORY_KEY,
        JSON.stringify(history)
      );
    } catch (error) {
      alert("Unable to save workout. Please try again.");
      return;
    }

        const movedToNextWeek =
      advanceProgrammeIfWeekComplete(
        currentSession,
        history
      );

    currentSession = null;

    renderActiveWorkout();

    if (movedToNextWeek) {
      alert(
        "Workout saved! The next week is now active."
      );
    } else {
      alert("Workout saved successfully!");
    }

    showPage("workouts");

// CANCEL WORKOUT
document.getElementById("cancelWorkout")
  ?.addEventListener("click", () => {
    if (!currentSession) return;

    if (!confirm("Discard this workout session?")) return;

    currentSession = null;
    showPage("workouts");
  });
