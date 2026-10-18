// FITNESS TRACKER — WORKOUT LIBRARY

// CREATE PROGRAMME
function createProgramme() {
  const name = prompt("Enter your programme name:");

  if (!name || !name.trim()) return;

  const weeksInput = prompt("How many weeks?", "8");
  if (weeksInput === null) return;

  const durationWeeks = Number(weeksInput);
  if (!Number.isInteger(durationWeeks) || durationWeeks < 1) {
    alert("Please enter a whole number of weeks (1 or more).");
    return;
  }

  const programmes = getProgrammes();

  const programme = {
    id: createId(),
    name: name.trim(),
    createdAt: new Date().toISOString(),
    schemaVersion: PROGRAMME_SCHEMA_VERSION,
    durationWeeks,
    currentWeek: 1,
    weeks: Array.from(
      { length: durationWeeks },
      (_, index) => createProgrammeWeek(index + 1)
    ),
    days: []
  };

  programme.days = programme.weeks[0].trainingDays;

  programmes.push(programme);
  saveProgrammes(programmes);

  renderLibrary();
}

// ACTIVATE PROGRAMME
function activateProgramme(id) {
  localStorage.setItem(ACTIVE_KEY, id);

  renderLibrary();
  renderActiveWorkout();
}

// DELETE PROGRAMME
function deleteProgramme(id) {
  if (!confirm("Delete this programme?")) return;

  const programmes = getProgrammes().filter(
    programme => programme.id !== id
  );

  saveProgrammes(programmes);

  if (getActiveProgrammeId() === id) {
    localStorage.removeItem(ACTIVE_KEY);
  }

  renderLibrary();
  renderActiveWorkout();
}

// DISPLAY LIBRARY
function renderLibrary() {
  const container = document.getElementById("programmeLibrary");

  if (!container) return;

  const programmes = getProgrammes();
  const activeId = getActiveProgrammeId();

  container.innerHTML = "";

  if (programmes.length === 0) {
    container.innerHTML = "<p>No programmes saved yet.</p>";
    return;
  }

  programmes.forEach(programme => {
    const card = document.createElement("div");
    card.className = "card";

    const title = document.createElement("h3");
    title.textContent = programme.name;

    const status = document.createElement("p");
    status.textContent =
      programme.id === activeId ? "🟠 Active Programme" : "Saved Programme";
// EDIT PROGRAMME BUTTON
    const editButton = document.createElement("button");
    editButton.textContent = "Edit";

    editButton.addEventListener("click", () => {
    openProgrammeEditor(programme.id);
    });
    const activateButton = document.createElement("button");
    activateButton.textContent =
      programme.id === activeId ? "Active" : "Activate";
    activateButton.disabled = programme.id === activeId;
    activateButton.addEventListener("click", () => {
      activateProgramme(programme.id);
    });

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => {
      deleteProgramme(programme.id);
    });

    card.append(title, status, editButton, activateButton, deleteButton);
    container.appendChild(card);
  });
}

// DISPLAY ACTIVE PROGRAMME ON WORKOUTS PAGE
// DISPLAY ACTIVE PROGRAMME ON WORKOUTS PAGE
function renderActiveWorkout() {
  const container = document.getElementById("activeWorkout");

  if (!container) return;

  const programmes = getProgrammes();
  const activeId = getActiveProgrammeId();

  const programme = programmes.find(
    item => item.id === activeId
  );

  container.innerHTML = "";

  if (!programme) {
    container.textContent =
      "No active programme. Activate one in your Library.";
    return;
  }

  // PROGRAMME HEADING
  const heading = document.createElement("h3");
  heading.textContent = programme.name;

  container.appendChild(heading);

  // NO WORKOUTS YET
  if (!programme.days || programme.days.length === 0) {
    const message = document.createElement("p");
    message.textContent =
      "This programme has no workouts yet. Add them in your Library.";

    container.appendChild(message);
    return;
  }

    // FIND WORKOUTS ALREADY COMPLETED IN THIS WEEK
  let history = [];

  try {
    history = JSON.parse(
      localStorage.getItem("fitness_workout_history") || "[]"
    );
  } catch {
    history = [];
  }

  const currentWeek =
    programme.weeks?.[programme.currentWeek - 1];

  const remainingWorkouts = programme.days.filter(workout => {
    return !history.some(session => {
      const sameProgramme =
        session.programmeId === programme.id;

      const sameWorkout =
        session.workoutId === workout.id;

      // Older History entries may not contain a week ID.
      const sameWeek =
        !session.weekId ||
        session.weekId === currentWeek?.id;

      return sameProgramme && sameWorkout && sameWeek;
    });
  });

  if (remainingWorkouts.length === 0) {
    const message = document.createElement("p");
    message.textContent =
      "All workouts in this week are complete.";

    container.appendChild(message);
    return;
  }

  // DISPLAY REMAINING WORKOUTS IN LIBRARY ORDER
  remainingWorkouts.forEach((workout, index) => {
    const workoutCard = document.createElement("div");
    workoutCard.className = "card";

    const workoutTitle = document.createElement("h3");
    workoutTitle.textContent =
      `${index + 1}. ${workout.name}`;

    workoutCard.appendChild(workoutTitle);

    // DISPLAY EXERCISES
    if (!workout.exercises || workout.exercises.length === 0) {
      const emptyMessage = document.createElement("p");
      emptyMessage.textContent = "No exercises added yet.";

      workoutCard.appendChild(emptyMessage);
    } else {
      workout.exercises.forEach(exercise => {
        const exerciseRow = document.createElement("div");
        exerciseRow.className = "exercise-row";

        const exerciseName = document.createElement("strong");
        exerciseName.textContent = exercise.name;

        const exerciseDetails = document.createElement("p");
        exerciseDetails.textContent =
          `${exercise.sets} sets × ${exercise.reps} reps` +
          (exercise.weight
            ? ` • ${exercise.weight} kg`
            : "");

        exerciseRow.append(exerciseName, exerciseDetails);
        workoutCard.appendChild(exerciseRow);
      });
    }

    // START WORKOUT BUTTON
    const startButton = document.createElement("button");
    startButton.className = "primary-button";
    startButton.textContent = "Start Workout";

    startButton.addEventListener("click", () => {
    startWorkout(workout.id);
});

    workoutCard.appendChild(startButton);
    container.appendChild(workoutCard);
  });
}

// CONNECT CREATE BUTTON
document.getElementById("createProgramme")
  ?.addEventListener("click", createProgramme);

// INITIALISE
renderLibrary();
renderActiveWorkout();

// OPEN PROGRAMME EDITOR
function openProgrammeEditor(id) {
  const programme = getProgrammes().find(
    programme => programme.id === id
  );

  if (!programme) return;

  // Remember which programme is being edited
  window.editingProgrammeId = id;

  // Display its name
  document.getElementById("editorProgrammeName").value = programme.name;

  // Open the editor page
  showPage("programmeEditor");

  // Display its workouts once the editor is connected
  if (typeof renderProgrammeEditor === "function") {
    renderProgrammeEditor();
  }
}
