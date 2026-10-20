// FITNESS TRACKER — PROGRAMME EDITOR

let editingWeekNumber = null;
let weekSelectionProgrammeId = null;

function getEditingProgramme() {
  return getProgrammes().find(programme => programme.id === window.editingProgrammeId);
}

function getEditingWeek(programme = getEditingProgramme()) {
  return programme?.weeks?.find(week => week.number === editingWeekNumber) || null;
}

function saveEditedProgramme(programme) {
  const programmes = getProgrammes();
  const index = programmes.findIndex(item => item.id === programme.id);
  if (index === -1) return;
  programmes[index] = programme;
  saveProgrammes(programmes);
  if (typeof renderActiveWorkout === "function") renderActiveWorkout();
  if (typeof renderLibrary === "function") renderLibrary();
}

function cloneTrainingDays(trainingDays) {
  return trainingDays.map(workout => ({
    ...workout,
    id: createId(),
    exercises: (workout.exercises || []).map(exercise => ({
      ...exercise,
      id: createId()
    }))
  }));
}

function shouldUpdateFutureWeeks(programme, week) {
  if (week.number >= programme.durationWeeks) return false;
  return confirm(
    `Apply this change to Week ${week.number} only, or to all upcoming weeks?\n\n` +
    "Press OK for this week and all upcoming weeks.\n" +
    "Press Cancel for this week only."
  );
}

function finishWeekChange(programme, week, updateFuture) {
  if (updateFuture) {
    programme.weeks
      .filter(item => item.number > week.number)
      .forEach(item => {
        item.trainingDays = cloneTrainingDays(week.trainingDays);
      });
  }
  saveEditedProgramme(programme);
  renderProgrammeEditor();
}

function createOverflowMenu(label, actions) {
  const menu = document.createElement("details");
  menu.className = "overflow-menu";
  const summary = document.createElement("summary");
  summary.textContent = "⋯";
  summary.setAttribute("aria-label", label);
  const panel = document.createElement("div");
  panel.className = "overflow-menu-panel";
  actions.forEach(action => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = action.label;
    if (action.danger) button.className = "danger-action";
    button.addEventListener("click", action.run);
    panel.appendChild(button);
  });
  menu.append(summary, panel);
  return menu;
}

function createEditableName(value, label, onSave) {
  const wrap = document.createElement("div");
  wrap.className = "editable-name";
  const title = document.createElement("h2");
  title.textContent = value;
  const edit = document.createElement("button");
  edit.type = "button";
  edit.className = "icon-button edit-name-button";
  edit.textContent = "✎";
  edit.setAttribute("aria-label", label);
  edit.addEventListener("click", () => {
    const input = document.createElement("input");
    input.type = "text";
    input.value = title.textContent;
    input.setAttribute("aria-label", label);
    let finished = false;
    const finish = save => {
      if (finished) return;
      finished = true;
      const nextName = input.value.trim();
      if (save && nextName) onSave(nextName);
      else renderProgrammeEditor();
    };
    input.addEventListener("keydown", event => {
      if (event.key === "Enter") finish(true);
      if (event.key === "Escape") finish(false);
    });
    input.addEventListener("blur", () => finish(true));
    wrap.replaceChildren(input);
    input.focus();
    input.select();
  });
  wrap.append(title, edit);
  return wrap;
}

function copyWeekOneAcrossProgramme(programme) {
  const source = programme?.weeks?.find(week => week.number === 1);
  if (!source || source.trainingDays.length === 0) return 0;
  programme.weeks
    .filter(week => week.number !== 1)
    .forEach(week => {
      week.trainingDays = cloneTrainingDays(source.trainingDays);
    });
  return programme.weeks.length - 1;
}

document.getElementById("addWorkout")?.addEventListener("click", () => {
  const programme = getEditingProgramme();
  const week = getEditingWeek(programme);
  if (!programme || !week) return;
  const updateFuture = shouldUpdateFutureWeeks(programme, week);
  week.trainingDays.push({
    id: createId(),
    name: `Day ${week.trainingDays.length + 1}`,
    exercises: []
  });
  finishWeekChange(programme, week, updateFuture);
});

function renderProgrammeEditor() {
  const programme = getEditingProgramme();
  const container = document.getElementById("editorWorkouts");
  const header = document.getElementById("editorProgrammeHeader");
  if (!programme || !container || !header) return;

  if (weekSelectionProgrammeId !== programme.id) {
    weekSelectionProgrammeId = programme.id;
    editingWeekNumber = programme.currentWeek || 1;
  }
  if (!getEditingWeek(programme)) editingWeekNumber = programme.currentWeek || 1;
  const week = getEditingWeek(programme);
  if (!week) return;

  header.innerHTML = "";
  container.innerHTML = "";

  const nameCard = document.createElement("div");
  nameCard.className = "card editor-name-card";
  nameCard.appendChild(createEditableName(programme.name, "Edit programme name", nextName => {
    programme.name = nextName;
    saveEditedProgramme(programme);
    renderProgrammeEditor();
  }));
  header.appendChild(nameCard);

  const weekCard = document.createElement("div");
  weekCard.className = "card editor-week-card";
  const weekLabel = document.createElement("label");
  weekLabel.htmlFor = "editorWeekSelect";
  weekLabel.textContent = "Editing";
  const weekSelect = document.createElement("select");
  weekSelect.id = "editorWeekSelect";
  programme.weeks.forEach(optionWeek => {
    const option = document.createElement("option");
    option.value = optionWeek.number;
    option.textContent = `Week ${optionWeek.number}` +
      (optionWeek.number === programme.currentWeek ? " — Current" : "");
    option.selected = optionWeek.number === editingWeekNumber;
    weekSelect.appendChild(option);
  });
  weekSelect.addEventListener("change", () => {
    editingWeekNumber = Number(weekSelect.value);
    renderProgrammeEditor();
  });
  weekCard.append(weekLabel, weekSelect);
  container.appendChild(weekCard);

  if (week.number === 1 && programme.weeks.length > 1) {
    const copy = document.createElement("button");
    copy.type = "button";
    copy.className = "copy-week-button";
    copy.textContent = "Copy Week 1 to All Weeks";
    copy.disabled = week.trainingDays.length === 0;
    copy.addEventListener("click", () => {
      const populated = programme.weeks.slice(1).some(item => item.trainingDays.length > 0);
      if (populated && !confirm("Replace the workouts already saved in Weeks 2 onward?")) return;
      copyWeekOneAcrossProgramme(programme);
      saveEditedProgramme(programme);
      renderProgrammeEditor();
    });
    container.appendChild(copy);
  }

  if (week.trainingDays.length === 0) {
    const empty = document.createElement("div");
    empty.className = "card empty-state-card";
    empty.textContent = "No training days have been added to this week.";
    container.appendChild(empty);
  }

  week.trainingDays.forEach((workout, workoutIndex) => {
    const card = document.createElement("div");
    card.className = "card editor-day-card";
    card.dataset.workoutId = workout.id;
    card.draggable = true;
    const dayHeader = document.createElement("div");
    dayHeader.className = "editor-day-header";
    const handle = document.createElement("button");
    handle.type = "button";
    handle.className = "drag-handle";
    handle.textContent = "≡";
    handle.setAttribute("aria-label", `Hold and drag ${workout.name}`);
    const name = createEditableName(workout.name, `Rename ${workout.name}`, nextName => {
      const updateFuture = shouldUpdateFutureWeeks(programme, week);
      workout.name = nextName;
      finishWeekChange(programme, week, updateFuture);
    });
    const dayMenu = createOverflowMenu(`${workout.name} options`, [{
      label: "Delete day",
      danger: true,
      run: () => {
        if (!confirm(`Delete ${workout.name} and all its exercises?`)) return;
        const updateFuture = shouldUpdateFutureWeeks(programme, week);
        week.trainingDays.splice(workoutIndex, 1);
        finishWeekChange(programme, week, updateFuture);
      }
    }]);
    dayHeader.append(handle, name, dayMenu);
    card.appendChild(dayHeader);

    const exerciseList = document.createElement("div");
    exerciseList.className = "editor-exercise-list";
    (workout.exercises || []).forEach((exercise, exerciseIndex) => {
      const row = document.createElement("div");
      row.className = "editor-exercise-row";
      const copy = document.createElement("div");
      const exerciseName = document.createElement("strong");
      exerciseName.textContent = exercise.name;
      const prescription = document.createElement("p");
      prescription.textContent = `${exercise.sets} × ${exercise.reps}` +
        (exercise.weight ? ` @ ${exercise.weight} kg` : "");
      copy.append(exerciseName, prescription);
      const menu = createOverflowMenu(`${exercise.name} options`, [
        {
          label: "Edit exercise",
          run: () => editExercise(programme, week, workout, exercise)
        },
        {
          label: "Remove exercise",
          danger: true,
          run: () => {
            if (!confirm(`Remove ${exercise.name}?`)) return;
            const updateFuture = shouldUpdateFutureWeeks(programme, week);
            workout.exercises.splice(exerciseIndex, 1);
            finishWeekChange(programme, week, updateFuture);
          }
        }
      ]);
      row.append(copy, menu);
      exerciseList.appendChild(row);
    });
    card.appendChild(exerciseList);

    const addExercise = document.createElement("button");
    addExercise.type = "button";
    addExercise.className = "editor-add-exercise";
    addExercise.textContent = "+ Add Exercise";
    addExercise.addEventListener("click", () => addExerciseToDay(programme, week, workout));
    card.appendChild(addExercise);

    addDayDragEvents(card, handle, programme, week, workout);
    container.appendChild(card);
  });
}

function readExerciseValues(existing = {}) {
  const name = prompt("Exercise name:", existing.name || "");
  if (!name?.trim()) return null;
  const sets = prompt("Number of sets:", existing.sets || "3");
  if (sets === null) return null;
  const reps = prompt("Repetitions:", existing.reps || "10");
  if (reps === null) return null;
  const weight = prompt("Weight in kg (optional):", existing.weight || "");
  if (weight === null) return null;
  if (!Number.isInteger(Number(sets)) || Number(sets) < 1 ||
      !Number.isInteger(Number(reps)) || Number(reps) < 1 ||
      (weight.trim() && (!Number.isFinite(Number(weight)) || Number(weight) < 0))) {
    alert("Please enter valid sets, reps and weight.");
    return null;
  }
  return { name: name.trim(), sets: Number(sets), reps: Number(reps), weight: weight.trim() };
}

function editExercise(programme, week, workout, exercise) {
  const values = readExerciseValues(exercise);
  if (!values) return;
  const updateFuture = shouldUpdateFutureWeeks(programme, week);
  Object.assign(exercise, values);
  finishWeekChange(programme, week, updateFuture);
}

function addExerciseToDay(programme, week, workout) {
  const values = readExerciseValues();
  if (!values) return;
  const updateFuture = shouldUpdateFutureWeeks(programme, week);
  workout.exercises.push({ id: createId(), ...values });
  finishWeekChange(programme, week, updateFuture);
}

function addDayDragEvents(card, handle, programme, week, workout) {
  card.addEventListener("dragstart", event => {
    card.classList.add("is-dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", workout.id);
  });
  card.addEventListener("dragend", () => card.classList.remove("is-dragging"));
  card.addEventListener("dragover", event => event.preventDefault());
  card.addEventListener("drop", event => {
    event.preventDefault();
    const sourceId = event.dataTransfer.getData("text/plain");
    reorderDay(programme, week, sourceId, workout.id);
  });

  let holdTimer;
  let active = false;
  handle.addEventListener("pointerdown", event => {
    holdTimer = setTimeout(() => {
      active = true;
      card.classList.add("is-dragging");
      handle.setPointerCapture(event.pointerId);
    }, 350);
  });
  handle.addEventListener("pointermove", event => {
    if (!active) return;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest(".editor-day-card");
    if (!target || target === card) return;
    const from = week.trainingDays.findIndex(item => item.id === workout.id);
    const to = week.trainingDays.findIndex(item => item.id === target.dataset.workoutId);
    if (from < 0 || to < 0) return;
    const [moved] = week.trainingDays.splice(from, 1);
    week.trainingDays.splice(to, 0, moved);
    target.parentNode.insertBefore(card, from < to ? target.nextSibling : target);
  });
  const finish = () => {
    clearTimeout(holdTimer);
    if (!active) return;
    active = false;
    card.classList.remove("is-dragging");
    finishWeekChange(programme, week, shouldUpdateFutureWeeks(programme, week));
  };
  handle.addEventListener("pointerup", finish);
  handle.addEventListener("pointercancel", finish);
}

function reorderDay(programme, week, sourceId, targetId) {
  const from = week.trainingDays.findIndex(item => item.id === sourceId);
  const to = week.trainingDays.findIndex(item => item.id === targetId);
  if (from < 0 || to < 0 || from === to) return;
  const [moved] = week.trainingDays.splice(from, 1);
  week.trainingDays.splice(to, 0, moved);
  finishWeekChange(programme, week, shouldUpdateFutureWeeks(programme, week));
}
