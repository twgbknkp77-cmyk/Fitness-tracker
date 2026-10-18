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

// WORKOUTS PAGE VIEW STATE
let viewedWorkoutWeek = null;
let viewedWorkoutProgrammeId = null;
let expandedWorkoutId = null;

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

  // Reset the view when a different programme is activated.
  if (viewedWorkoutProgrammeId !== programme.id) {
    viewedWorkoutProgrammeId = programme.id;
    viewedWorkoutWeek = programme.currentWeek || 1;
    expandedWorkoutId = null;
  }

  // Keep the viewed week within the programme's limits.
  if (
    !viewedWorkoutWeek ||
    viewedWorkoutWeek < 1 ||
    viewedWorkoutWeek > programme.durationWeeks
  ) {
    viewedWorkoutWeek = programme.currentWeek || 1;
  }

  const selectedWeek =
    programme.weeks?.[viewedWorkoutWeek - 1];

  const selectedDays =
    selectedWeek?.trainingDays || [];

  // PROGRAMME HEADING
  const heading = document.createElement("h3");
  heading.textContent = programme.name;

  container.appendChild(heading);

  // WEEK NAVIGATION
  const weekNavigation = document.createElement("div");
  weekNavigation.className = "week-navigation";

  const previousWeekButton = document.createElement("button");
  previousWeekButton.textContent = "← Previous";
  previousWeekButton.disabled = viewedWorkoutWeek === 1;

  previousWeekButton.addEventListener("click", () => {
    viewedWorkoutWeek -= 1;
    expandedWorkoutId = null;
    renderActiveWorkout();
  });

  const weekLabel = document.createElement("strong");
  weekLabel.textContent =
    `Week ${viewedWorkoutWeek} of ${programme.durationWeeks}`;

  const nextWeekButton = document.createElement("button");
  nextWeekButton.textContent = "Next →";
  nextWeekButton.disabled =
    viewedWorkoutWeek === programme.durationWeeks;

  nextWeekButton.addEventListener("click", () => {
    viewedWorkoutWeek += 1;
    expandedWorkoutId = null;
    renderActiveWorkout();
  });

  weekNavigation.append(
    previousWeekButton,
    weekLabel,
    nextWeekButton
  );

  container.appendChild(weekNavigation);

  const weekStatus = document.createElement("p");

  if (viewedWorkoutWeek === programme.currentWeek) {
    weekStatus.textContent = "Current week";
  } else {
    weekStatus.textContent =
      `Viewing Week ${viewedWorkoutWeek}`;
  }

  container.appendChild(weekStatus);

  // NO WORKOUTS IN THE SELECTED WEEK
  if (selectedDays.length === 0) {
    const message = document.createElement("p");
    message.textContent =
      "This week has no training days yet.";

    container.appendChild(message);
    return;
  }

  // LOAD WORKOUT HISTORY
  let history = [];

  try {
    history = JSON.parse(
      localStorage.getItem("fitness_workout_history") || "[]"
    );
  } catch {
    history = [];
  }

  // REMOVE COMPLETED DAYS FROM THIS WEEK
  const remainingWorkouts = selectedDays.filter(workout => {
    return !history.some(session => {
      const sameProgramme =
        session.programmeId === programme.id;

      const sameWorkout =
        session.workoutId === workout.id;

      // Older saved sessions may not contain a week ID.
      const sameWeek =
        !session.weekId ||
        session.weekId === selectedWeek?.id;

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

  // Expand the next unfinished workout by default.
  const expandedWorkoutStillExists =
    remainingWorkouts.some(
      workout => workout.id === expandedWorkoutId
    );

  if (!expandedWorkoutStillExists) {
    expandedWorkoutId = remainingWorkouts[0].id;
  }

  // DISPLAY DAYS IN LIBRARY ORDER
  remainingWorkouts.forEach((workout, index) => {
    const workoutCard = document.createElement("div");
    workoutCard.className = "card";

    const workoutTitle = document.createElement("h3");
    workoutTitle.textContent =
      `${index + 1}. ${workout.name}`;

    const toggleButton = document.createElement("button");
    const isExpanded = expandedWorkoutId === workout.id;

    toggleButton.textContent =
      isExpanded ? "Hide Details" : "View Details";

    toggleButton.addEventListener("click", () => {
      expandedWorkoutId =
        expandedWorkoutId === workout.id
          ? null
          : workout.id;

      renderActiveWorkout();
    });

    workoutCard.append(
      workoutTitle,
      toggleButton
    );

    if (isExpanded) {
      if (!workout.exercises || workout.exercises.length === 0) {
        const emptyMessage = document.createElement("p");
        emptyMessage.textContent =
          "No exercises added yet.";

        workoutCard.appendChild(emptyMessage);
      } else {
        workout.exercises.forEach(exercise => {
          const exerciseRow = document.createElement("div");
          exerciseRow.className = "exercise-row";

          const exerciseName =
            document.createElement("strong");
          exerciseName.textContent = exercise.name;

          const exerciseDetails =
            document.createElement("p");
          exerciseDetails.textContent =
            `${exercise.sets} sets × ${exercise.reps} reps` +
            (exercise.weight
              ? ` • ${exercise.weight} kg`
              : "");

          exerciseRow.append(
            exerciseName,
            exerciseDetails
          );

          workoutCard.appendChild(exerciseRow);
        });
      }

      // Only the actual current week can be started.
      if (viewedWorkoutWeek === programme.currentWeek) {
        const startButton =
          document.createElement("button");

        startButton.className = "primary-button";
        startButton.textContent = "Start Workout";

        startButton.addEventListener("click", () => {
          startWorkout(workout.id);
        });

        workoutCard.appendChild(startButton);
      } else {
        const viewingMessage =
          document.createElement("p");

        viewingMessage.textContent =
          "This week is available to view only.";

        workoutCard.appendChild(viewingMessage);
      }
    }

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
