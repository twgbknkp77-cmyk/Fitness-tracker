// FITNESS TRACKER — PROGRAMME EDITOR

// The week displayed in the editor.
// This is separate from the programme's actual currentWeek.
let editingWeekNumber = null;

// Used to reset the editor when a different programme is opened.
let weekSelectionProgrammeId = null;


// GET THE PROGRAMME CURRENTLY BEING EDITED
function getEditingProgramme() {
  return getProgrammes().find(
    programme => programme.id === window.editingProgrammeId
  );
}


// GET THE WEEK CURRENTLY DISPLAYED IN THE EDITOR
function getEditingWeek(programme = getEditingProgramme()) {
  if (!programme || !Array.isArray(programme.weeks)) {
    return null;
  }

  return programme.weeks.find(
    week => week.number === editingWeekNumber
  );
}


// SAVE PROGRAMME CHANGES
function saveEditedProgramme(programme) {
  const programmes = getProgrammes();

  const index = programmes.findIndex(
    item => item.id === programme.id
  );

  if (index === -1) return;

  programmes[index] = programme;
  saveProgrammes(programmes);

  // Keep the Workouts page synchronised.
  if (typeof renderActiveWorkout === "function") {
    renderActiveWorkout();
  }
}


// COPY WEEK 1'S STRUCTURE WHILE KEEPING EACH WEEK'S RECORDS SEPARATE
function copyWeekOneAcrossProgramme(programme) {
  const sourceWeek = programme?.weeks?.find(week => week.number === 1);
  if (!sourceWeek || sourceWeek.trainingDays.length === 0) return 0;

  programme.weeks
    .filter(week => week.number !== 1)
    .forEach(targetWeek => {
      targetWeek.trainingDays = sourceWeek.trainingDays.map(workout => ({
        ...workout,
        id: createId(),
        exercises: (workout.exercises || []).map(exercise => ({
          ...exercise,
          id: createId()
        }))
      }));
    });

  return programme.weeks.length - 1;
}


// SAVE PROGRAMME NAME
document.getElementById("saveProgrammeName")
  ?.addEventListener("click", function() {
    const programme = getEditingProgramme();

    if (!programme) return;

    const name = document
      .getElementById("editorProgrammeName")
      .value
      .trim();

    if (!name) {
      alert("Please enter a programme name.");
      return;
    }

    programme.name = name;

    saveEditedProgramme(programme);
    renderLibrary();

    alert("Programme name saved!");
  });


// ADD TRAINING DAY TO THE DISPLAYED EDITOR WEEK
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

  const container =
    document.getElementById("editorWorkouts");

  if (!programme || !container) return;

  /*
   * When a programme is first opened, begin on its actual
   * current training week. Changing editor weeks after this
   * does not change programme.currentWeek.
   */
  if (weekSelectionProgrammeId !== programme.id) {
    weekSelectionProgrammeId = programme.id;
    editingWeekNumber = programme.currentWeek || 1;
  }

  // Recover safely if the selected editor week no longer exists.
  if (!getEditingWeek(programme)) {
    editingWeekNumber = programme.currentWeek || 1;
  }

  const week = getEditingWeek(programme);

  if (!week) return;

  container.innerHTML = "";


  // WEEK SELECTOR
  const weekSelector = document.createElement("div");
  weekSelector.className = "week-selector";

  programme.weeks.forEach(weekOption => {
    const weekButton =
      document.createElement("button");

    weekButton.textContent =
      weekOption.number === programme.currentWeek
        ? `Week ${weekOption.number} • Current`
        : `Week ${weekOption.number}`;

    if (weekOption.number === editingWeekNumber) {
      weekButton.className = "primary-button";
    }

    weekButton.addEventListener("click", () => {
      // Only change the editor view.
      // Do not change programme.currentWeek.
      editingWeekNumber = weekOption.number;
      renderProgrammeEditor();
    });

    weekSelector.appendChild(weekButton);
  });

  container.appendChild(weekSelector);


  // SELECTED WEEK HEADING
  const weekHeading = document.createElement("h2");
  weekHeading.textContent =
    `Editing Week ${week.number}`;

  container.appendChild(weekHeading);

  const weekMessage = document.createElement("p");

  if (week.number === programme.currentWeek) {
    weekMessage.textContent =
      "This is your current training week.";
  } else {
    weekMessage.textContent =
      "You are editing this week only. Your training progress has not changed.";
  }

  container.appendChild(weekMessage);


  // COPY WEEK 1 THROUGH THE REST OF THE PROGRAMME
  if (week.number === 1 && programme.weeks.length > 1) {
    const copyWeekButton = document.createElement("button");
    copyWeekButton.type = "button";
    copyWeekButton.className = "copy-week-button";
    copyWeekButton.textContent = "Copy Week 1 to All Weeks";
    copyWeekButton.disabled = week.trainingDays.length === 0;

    copyWeekButton.addEventListener("click", () => {
      const populatedFutureWeeks = programme.weeks
        .slice(1)
        .some(item => item.trainingDays.length > 0);

      const warning = populatedFutureWeeks
        ? "This will replace the workouts already saved in Weeks 2 onward. Continue?"
        : `Copy Week 1 into Weeks 2 to ${programme.durationWeeks}?`;

      if (!confirm(warning)) return;

      copyWeekOneAcrossProgramme(programme);

      saveEditedProgramme(programme);
      renderProgrammeEditor();
      alert("Week 1 has been copied across the programme.");
    });

    container.appendChild(copyWeekButton);
  }


  // DISPLAY THE SELECTED WEEK'S TRAINING DAYS
  if (week.trainingDays.length === 0) {
    const emptyMessage = document.createElement("p");
    emptyMessage.textContent =
      "No training days have been added to this week.";

    container.appendChild(emptyMessage);
  }

  week.trainingDays.forEach(workout => {
    const card = document.createElement("div");
    card.className = "card";

    const heading = document.createElement("h2");
    heading.textContent = workout.name;

    const exerciseList = document.createElement("div");


    // DISPLAY EXERCISES
    workout.exercises.forEach(exercise => {
      const row = document.createElement("div");
      row.className = "exercise-row";

      const label = document.createElement("p");
      label.textContent =
        `${exercise.name} — ` +
        `${exercise.sets} × ${exercise.reps}` +
        (exercise.weight
          ? ` @ ${exercise.weight} kg`
          : "");


      // EDIT EXERCISE
      const editButton =
        document.createElement("button");

      editButton.textContent = "Edit";

      editButton.addEventListener("click", () => {
        const name = prompt(
          "Exercise name:",
          exercise.name
        );

        if (name === null || !name.trim()) return;

        const sets = prompt(
          "Number of sets:",
          exercise.sets
        );

        if (sets === null) return;

        const reps = prompt(
          "Repetitions:",
          exercise.reps
        );

        if (reps === null) return;

        const weight = prompt(
          "Weight in kg (optional):",
          exercise.weight || ""
        );

        if (weight === null) return;

        if (
          !Number.isInteger(Number(sets)) ||
          Number(sets) < 1 ||
          !Number.isInteger(Number(reps)) ||
          Number(reps) < 1 ||
          (
            weight.trim() !== "" &&
            (
              !Number.isFinite(Number(weight)) ||
              Number(weight) < 0
            )
          )
        ) {
          alert(
            "Please enter valid sets, reps and weight."
          );

          return;
        }

        exercise.name = name.trim();
        exercise.sets = Number(sets);
        exercise.reps = Number(reps);
        exercise.weight = weight.trim();

        saveEditedProgramme(programme);
        renderProgrammeEditor();
      });


      // REMOVE EXERCISE
      const deleteButton =
        document.createElement("button");

      deleteButton.textContent = "Remove";

      deleteButton.addEventListener("click", () => {
        if (
          !confirm(`Remove ${exercise.name}?`)
        ) {
          return;
        }

        workout.exercises =
          workout.exercises.filter(
            item => item.id !== exercise.id
          );

        saveEditedProgramme(programme);
        renderProgrammeEditor();
      });

      row.append(
        label,
        editButton,
        deleteButton
      );

      exerciseList.appendChild(row);
    });


    // ADD EXERCISE
    const addExerciseButton =
      document.createElement("button");

    addExerciseButton.textContent = "+ Add Exercise";

    addExerciseButton.addEventListener("click", () => {
      const name = prompt("Exercise name:");

      if (!name || !name.trim()) return;

      const sets = prompt(
        "Number of sets:",
        "3"
      );

      if (sets === null) return;

      const reps = prompt(
        "Repetitions:",
        "10"
      );

      if (reps === null) return;

      const weight = prompt(
        "Weight in kg (optional):",
        ""
      );

      if (weight === null) return;

      if (
        !Number.isInteger(Number(sets)) ||
        Number(sets) < 1 ||
        !Number.isInteger(Number(reps)) ||
        Number(reps) < 1 ||
        (
          weight.trim() !== "" &&
          (
            !Number.isFinite(Number(weight)) ||
            Number(weight) < 0
          )
        )
      ) {
        alert(
          "Please enter valid sets, reps and weight."
        );

        return;
      }

      workout.exercises.push({
        id: createId(),
        name: name.trim(),
        sets: Number(sets),
        reps: Number(reps),
        weight: weight.trim()
      });

      saveEditedProgramme(programme);
      renderProgrammeEditor();
    });


    // RENAME TRAINING DAY
    const renameWorkoutButton =
      document.createElement("button");

    renameWorkoutButton.textContent = "Rename Day";

    renameWorkoutButton.addEventListener(
      "click",
      () => {
        const name = prompt(
          "Training day name:",
          workout.name
        );

        if (!name || !name.trim()) return;

        workout.name = name.trim();

        saveEditedProgramme(programme);
        renderProgrammeEditor();
      }
    );


    const dayIndex =
      week.trainingDays.findIndex(
        item => item.id === workout.id
      );


    // MOVE TRAINING DAY UP
    const moveUpButton =
      document.createElement("button");

    moveUpButton.textContent = "↑ Move Up";
    moveUpButton.disabled = dayIndex === 0;

    moveUpButton.addEventListener("click", () => {
      if (dayIndex <= 0) return;

      week.trainingDays.splice(dayIndex, 1);

      week.trainingDays.splice(
        dayIndex - 1,
        0,
        workout
      );

      saveEditedProgramme(programme);
      renderProgrammeEditor();
    });


    // MOVE TRAINING DAY DOWN
    const moveDownButton =
      document.createElement("button");

    moveDownButton.textContent = "↓ Move Down";

    moveDownButton.disabled =
      dayIndex === week.trainingDays.length - 1;

    moveDownButton.addEventListener("click", () => {
      if (
        dayIndex >=
        week.trainingDays.length - 1
      ) {
        return;
      }

      week.trainingDays.splice(dayIndex, 1);

      week.trainingDays.splice(
        dayIndex + 1,
        0,
        workout
      );

      saveEditedProgramme(programme);
      renderProgrammeEditor();
    });


    // DELETE TRAINING DAY
    const deleteWorkoutButton =
      document.createElement("button");

    deleteWorkoutButton.textContent = "Delete Day";

    deleteWorkoutButton.addEventListener(
      "click",
      () => {
        if (
          !confirm(
            `Delete ${workout.name} and all its exercises?`
          )
        ) {
          return;
        }

        const deleteIndex =
          week.trainingDays.findIndex(
            item => item.id === workout.id
          );

        if (deleteIndex !== -1) {
          week.trainingDays.splice(
            deleteIndex,
            1
          );
        }

        saveEditedProgramme(programme);
        renderProgrammeEditor();
      }
    );


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
