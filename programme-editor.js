// FITNESS TRACKER — PROGRAMME EDITOR

function getEditingProgramme() {
  return getProgrammes().find(
    programme => programme.id === window.editingProgrammeId
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

// ADD WORKOUT
document.getElementById("addWorkout")
  ?.addEventListener("click", function() {
    const programme = getEditingProgramme();
    if (!programme) return;

    const name = prompt("Workout name (e.g. Full Body A):");
    if (!name || !name.trim()) return;

    programme.days.push({
      id: crypto.randomUUID(),
      name: name.trim(),
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

  container.innerHTML = "";

  programme.days.forEach(workout => {
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
    renameWorkoutButton.textContent = "Rename Workout";
    renameWorkoutButton.addEventListener("click", () => {
      const name = prompt("Workout name:", workout.name);
      if (!name || !name.trim()) return;

      workout.name = name.trim();
      saveEditedProgramme(programme);
      renderProgrammeEditor();
    });

    const deleteWorkoutButton = document.createElement("button");
    deleteWorkoutButton.textContent = "Delete Workout";
    deleteWorkoutButton.addEventListener("click", () => {
      if (!confirm(`Delete ${workout.name} and all its exercises?`)) return;

      programme.days = programme.days.filter(
        item => item.id !== workout.id
      );

      saveEditedProgramme(programme);
      renderProgrammeEditor();
    });

    card.append(
      heading,
      exerciseList,
      addExerciseButton,
      renameWorkoutButton,
      deleteWorkoutButton
    );

    container.appendChild(card);
  });
}
