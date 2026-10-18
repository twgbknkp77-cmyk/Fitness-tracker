// FITNESS TRACKER — PROGRAMME EDITOR

function getEditingProgramme() {
  return getProgrammes().find(
    programme => programme.id === window.editingProgrammeId
  );
}

// REMEMBER WHICH WEEK IS OPEN
let editingWeekNumber = 1;

// GET THE WEEK CURRENTLY BEING EDITED
function getEditingWeek(programme = getEditingProgramme()) {
  if (!programme || !Array.isArray(programme.weeks)) {
    return null;
  }

  return programme.weeks.find(
    week => week.number === editingWeekNumber
  );
}

// SAVE CHANGES
function saveEditedProgramme(programme) {
  const programmes = getProgrammes();
  const index = programmes.findIndex(item => item.id === programme.id);

  if (index === -1) return;

  programmes[index] = programme;
  saveProgrammes(programmes);
}

// SAVE PROGRAMME NAME
document.getElementById("saveProgrammeName")
  ?.addEventListener("click", function() {
    const programme = getEditingProgramme();
    if (!programme) return;

    const name = document.getElementById("editorProgrammeName").value.trim();

    if (!name) {
      alert("Please enter a programme name.");
      return;
    }

    programme.name = name;
    saveEditedProgramme(programme);
    renderLibrary();
    renderActiveWorkout();

    alert("Programme name saved!");
  });

// ADD TRAINING DAY TO THE SELECTED WEEK
document.getElementById("addWorkout")
  ?.addEventListener("click", function() {
    const programme = getEditingProgramme();
    const week = getEditingWeek(programme);

    if (!programme || !week) return;

    const dayNumber = week.trainingDays.length + 1;

    week.trainingDays.push({
      id: createId(),
      name: `Day ${dayNumber}`,
      exercises: []
    });

    saveEditedProgramme(programme);
    renderProgrammeEditor();
  });

// DISPLAY PROGRAMME EDITOR
function renderProgrammeEditor() {
  const programme = getEditingProgramme();
  const container = document.getElementById("editorWorkouts");

  if (!programme || !container) return;

  // Start at Week 1 if the previously selected week does not exist.
  if (!getEditingWeek(programme)) {
  editingWeekNumber = 1;
  }

  const week = getEditingWeek(programme);

  if (!week) return;

  container.innerHTML = "";

  // WEEK SELECTOR
  const weekSelector = document.createElement("div");
  weekSelector.className = "week-selector";

  programme.weeks.forEach(weekOption => {
    const weekButton = document.createElement("button");

    weekButton.textContent = `Week ${weekOption.number}`;

    if (weekOption.number === editingWeekNumber) {
      weekButton.className = "primary-button";
    }

    weekButton.addEventListener("click", () => {
      editingWeekNumber = weekOption.number;
      renderProgrammeEditor();
    });

    weekSelector.appendChild(weekButton);
  });

  container.appendChild(weekSelector);

  // SELECTED WEEK HEADING
  const weekHeading = document.createElement("h2");
  weekHeading.textContent = `Week ${week.number}`;

  container.appendChild(weekHeading);

  // DISPLAY THE SELECTED WEEK'S TRAINING DAYS
  week.trainingDays.forEach(workout => {
    const card = document.createElement("div");
    card.className = "card";

    const heading = document.createElement("h2");
    heading.textContent = workout.name;

    const exerciseList = document.createElement("div");

    workout.exercises.forEach(exercise => {
      const row = document.createElement("div");
      row.className = "exercise-row";

      const label = document.createElement("p");
      label.textContent =
        `${exercise.name} — ${exercise.sets} × ${exercise.reps}` +
        (exercise.weight ? ` @ ${exercise.weight} kg` : "");

      const editButton = document.createElement("button");
      editButton.textContent = "Edit";
      editButton.addEventListener("click", () => {
        const name = prompt("Exercise name:", exercise.name);
        if (name === null || !name.trim()) return;

        const sets = prompt("Number of sets:", exercise.sets);
        if (sets === null) return;

        const reps = prompt("Repetitions:", exercise.reps);
        if (reps === null) return;

        const weight = prompt("Weight in kg (optional):", exercise.weight || "");
        if (weight === null) return;

        if (
          !Number.isInteger(Number(sets)) ||
          Number(sets) < 1 ||
          !Number.isInteger(Number(reps)) ||
          Number(reps) < 1 ||
          (weight.trim() !== "" && (
            !Number.isFinite(Number(weight)) ||
            Number(weight) < 0
          ))
        ) {
          alert("Please enter valid sets, reps and weight.");
          return;
        }

        exercise.name = name.trim();
        exercise.sets = Number(sets);
        exercise.reps = Number(reps);
        exercise.weight = weight.trim();

        saveEditedProgramme(programme);
        renderProgrammeEditor();
      });

      const deleteButton = document.createElement("button");
      deleteButton.textContent = "Remove";
      deleteButton.addEventListener("click", () => {
        if (!confirm(`Remove ${exercise.name}?`)) return;

        workout.exercises = workout.exercises.filter(
          item => item.id !== exercise.id
        );

        saveEditedProgramme(programme);
        renderProgrammeEditor();
      });

      row.append(label, editButton, deleteButton);
      exerciseList.appendChild(row);
    });

    const addExerciseButton = document.createElement("button");
    addExerciseButton.textContent = "+ Add Exercise";

    addExerciseButton.addEventListener("click", () => {
      const name = prompt("Exercise name:");
      if (!name || !name.trim()) return;

      const sets = prompt("Number of sets:", "3");
      if (sets === null) return;

      const reps = prompt("Repetitions:", "10");
      if (reps === null) return;

      const weight = prompt("Weight in kg (optional):", "");
      if (weight === null) return;

      if (
        !Number.isInteger(Number(sets)) ||
        Number(sets) < 1 ||
        !Number.isInteger(Number(reps)) ||
        Number(reps) < 1 ||
        (weight.trim() !== "" && (
          !Number.isFinite(Number(weight)) ||
          Number(weight) < 0
        ))
      ) {
        alert("Please enter valid sets, reps and weight.");
        return;
      }

      workout.exercises.push({
        id: crypto.randomUUID(),
        name: name.trim(),
        sets: Number(sets),
        reps: Number(reps),
        weight: weight.trim()
      });

      saveEditedProgramme(programme);
      renderProgrammeEditor();
    });

    const renameWorkoutButton = document.createElement("button");
    renameWorkoutButton.textContent = "Rename Day";
    renameWorkoutButton.addEventListener("click", () => {
    const name = prompt("Training day name:", workout.name);
      if (!name || !name.trim()) return;

      workout.name = name.trim();
      saveEditedProgramme(programme);
      renderProgrammeEditor();
    });
// MOVE TRAINING DAY UP
const moveUpButton = document.createElement("button");
moveUpButton.textContent = "↑ Move Up";

const dayIndex = week.trainingDays.findIndex(
  item => item.id === workout.id
);

moveUpButton.disabled = dayIndex === 0;

moveUpButton.addEventListener("click", () => {
  if (dayIndex <= 0) return;

  week.trainingDays.splice(dayIndex, 1);
  week.trainingDays.splice(dayIndex - 1, 0, workout);

  saveEditedProgramme(programme);
  renderProgrammeEditor();
});

// MOVE TRAINING DAY DOWN
const moveDownButton = document.createElement("button");
moveDownButton.textContent = "↓ Move Down";

moveDownButton.disabled =
  dayIndex === week.trainingDays.length - 1;

moveDownButton.addEventListener("click", () => {
  if (dayIndex >= week.trainingDays.length - 1) return;

  week.trainingDays.splice(dayIndex, 1);
  week.trainingDays.splice(dayIndex + 1, 0, workout);

  saveEditedProgramme(programme);
  renderProgrammeEditor();
});
    const deleteWorkoutButton = document.createElement("button");
    deleteWorkoutButton.textContent = "Delete Day";

    deleteWorkoutButton.addEventListener("click", () => {
      if (!confirm(`Delete ${workout.name} and all its exercises?`)) return;

    const dayIndex = week.trainingDays.findIndex(
      item => item.id === workout.id
    );

    if (dayIndex !== -1) {
    week.trainingDays.splice(dayIndex, 1);
    }

  saveEditedProgramme(programme);
  renderProgrammeEditor();
});

    card.append(
    heading,
    exerciseList,
    addExerciseButton,
    renameWorkoutButton,
    moveUpButton,
    moveDownButton,
    deleteWorkoutButton
);

    container.appendChild(card);
  });
}
