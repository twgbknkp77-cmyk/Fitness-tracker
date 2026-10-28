// FITNESS TRACKER — PROGRAMME EDITOR

let editingWeekNumber = null;
let weekSelectionProgrammeId = null;
let editorWorkingProgramme = null;
let editorOriginalProgramme = null;
let editorIsEditing = false;
const expandedEditorDays = new Set();

function prepareProgrammeEditor(programmeId) {
  const stored = getProgrammes().find(programme => programme.id === programmeId);
  editorWorkingProgramme = stored ? JSON.parse(JSON.stringify(stored)) : null;
  editorOriginalProgramme = stored ? JSON.parse(JSON.stringify(stored)) : null;
  editorIsEditing = Boolean(stored?.isDraft);
}

function getEditingProgramme() {
  if (editorWorkingProgramme?.id !== window.editingProgrammeId) {
    prepareProgrammeEditor(window.editingProgrammeId);
  }
  return editorWorkingProgramme;
}

function getEditingWeek(programme = getEditingProgramme()) {
  return programme?.weeks?.find(week => week.number === editingWeekNumber) || null;
}

function saveEditedProgramme(programme) {
  editorWorkingProgramme = programme;
  if (!programme.isDraft && editorIsEditing) return;
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

let weekScopeResolver = null;

function chooseWeekScope(programme, week) {
  if (programme?.isDraft) {
    return Promise.resolve("future");
  }

  if (editorIsEditing) return Promise.resolve("current");

  if (week.number >= programme.durationWeeks) {
    return Promise.resolve("current");
  }

  const dialog = document.getElementById("weekScopeDialog");
  if (!dialog) return Promise.resolve("current");

  dialog.showModal();
  return new Promise(resolve => {
    weekScopeResolver = resolve;
  });
}

document.querySelectorAll("[data-week-scope]").forEach(button => {
  button.addEventListener("click", () => {
    const scope = button.dataset.weekScope;
    document.getElementById("weekScopeDialog")?.close();
    if (weekScopeResolver) weekScopeResolver(scope);
    weekScopeResolver = null;
  });
});

function finishWeekChange(programme, week, scope) {
  if (scope === "future") {
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
  edit.innerHTML = '<svg aria-hidden="true"><use href="#icon-edit"></use></svg>';
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

document.getElementById("addWorkout")?.addEventListener("click", async () => {
  const programme = getEditingProgramme();
  const week = getEditingWeek(programme);
  if (!programme || !week) return;
  const scope = await chooseWeekScope(programme, week);
  if (scope === "cancel") return;
  const workoutId = createId();
  week.trainingDays.push({
    id: workoutId,
    name: `Day ${week.trainingDays.length + 1}`,
    exercises: []
  });
  expandedEditorDays.add(workoutId);
  finishWeekChange(programme, week, scope);
});

async function changeProgrammeDuration(programme, change) {
  const nextDuration = programme.durationWeeks + change;

  if (nextDuration < 1 || nextDuration > 52) return;

  if (change < 0) {
    const finalWeek = programme.weeks[programme.weeks.length - 1];
    const hasTrainingDays = (finalWeek?.trainingDays || []).length > 0;

    if (
      hasTrainingDays &&
      !await showSpotConfirm(
        `Remove Week ${finalWeek.number}?`,
        "Its training days and exercises will also be removed.",
        { confirmText: "Remove Week", danger: true }
      )
    ) {
      return;
    }

    programme.weeks.pop();
  } else {
    programme.weeks.push(
      createProgrammeWeek(programme.weeks.length + 1)
    );
  }

  programme.durationWeeks = nextDuration;
  programme.currentWeek = Math.min(programme.currentWeek, nextDuration);
  editingWeekNumber = Math.min(editingWeekNumber || 1, nextDuration);
  programme.days = programme.weeks[programme.currentWeek - 1].trainingDays;

  saveEditedProgramme(programme);
  renderProgrammeEditor();
}

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

  const saveProgrammeButton = document.getElementById("saveProgramme");
  const discardChangesButton = document.getElementById("discardProgrammeChanges");
  const editActions = document.getElementById("editorEditActions");
  if (saveProgrammeButton) {
    saveProgrammeButton.textContent = programme.isDraft
      ? "Save Programme"
      : editorIsEditing ? "Save Changes" : "Edit Programme";
    saveProgrammeButton.hidden = !programme.isDraft && editorIsEditing;
  }
  if (discardChangesButton) discardChangesButton.hidden = false;
  if (editActions) editActions.hidden = programme.isDraft || !editorIsEditing;
  document.getElementById("programmeEditor")?.classList.toggle("editor-readonly", !programme.isDraft && !editorIsEditing);

  header.innerHTML = "";
  container.innerHTML = "";

  const nameCard = document.createElement("div");
  nameCard.className = "card editor-setup-card";

  const nameField = document.createElement("div");
  nameField.className = "editor-setup-field";
  const nameLabel = document.createElement("label");
  nameLabel.htmlFor = "editorProgrammeName";
  nameLabel.textContent = "Programme name";
  const nameInput = document.createElement("input");
  nameInput.id = "editorProgrammeName";
  nameInput.type = "text";
  nameInput.value = programme.name;
  nameInput.placeholder = "Programme name";
  nameInput.autocomplete = "off";
  nameInput.addEventListener("change", () => {
    const nextName = nameInput.value.trim();
    if (!nextName) {
      nameInput.value = programme.name;
      return;
    }
    programme.name = nextName;
    saveEditedProgramme(programme);
  });
  nameField.append(nameLabel, nameInput);

  const durationField = document.createElement("div");
  durationField.className = "editor-setup-field";
  const durationLabel = document.createElement("span");
  durationLabel.className = "editor-setup-label";
  durationLabel.textContent = "Programme length";
  const durationControl = document.createElement("div");
  durationControl.className = "programme-length-control";

  const removeWeek = document.createElement("button");
  removeWeek.type = "button";
  removeWeek.textContent = "−";
  removeWeek.setAttribute("aria-label", "Remove one week");
  removeWeek.disabled = programme.durationWeeks <= 1;
  removeWeek.addEventListener("click", () => {
    changeProgrammeDuration(programme, -1);
  });

  const durationValue = document.createElement("strong");
  durationValue.textContent = `${programme.durationWeeks} ${programme.durationWeeks === 1 ? "week" : "weeks"}`;

  const addWeek = document.createElement("button");
  addWeek.type = "button";
  addWeek.textContent = "+";
  addWeek.setAttribute("aria-label", "Add one week");
  addWeek.disabled = programme.durationWeeks >= 52;
  addWeek.addEventListener("click", () => {
    changeProgrammeDuration(programme, 1);
  });

  durationControl.append(removeWeek, durationValue, addWeek);
  durationField.append(durationLabel, durationControl);
  nameCard.append(nameField, durationField);
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
    option.textContent = `Week ${optionWeek.number}`;
    option.selected = optionWeek.number === editingWeekNumber;
    weekSelect.appendChild(option);
  });
  weekSelect.addEventListener("change", () => {
    editingWeekNumber = Number(weekSelect.value);
    renderProgrammeEditor();
  });
  weekCard.append(weekLabel, weekSelect);
  container.appendChild(weekCard);

  if (week.trainingDays.length === 0) {
    const empty = document.createElement("div");
    empty.className = "card empty-state-card";
    empty.textContent = "No training days have been added to this week.";
    container.appendChild(empty);
  }

  week.trainingDays.forEach((workout, workoutIndex) => {
    const card = document.createElement("div");
    card.className = "card editor-day-card";
    card.classList.toggle("is-collapsed", !expandedEditorDays.has(workout.id));
    card.dataset.workoutId = workout.id;
    card.draggable = programme.isDraft || editorIsEditing;
    const dayHeader = document.createElement("div");
    dayHeader.className = "editor-day-header";
    const handle = document.createElement("button");
    handle.type = "button";
    handle.className = "drag-handle";
    handle.textContent = "≡";
    handle.setAttribute("aria-label", `Hold and drag ${workout.name}`);
    const name = createEditableName(workout.name, `Rename ${workout.name}`, async nextName => {
      const scope = await chooseWeekScope(programme, week);
      if (scope === "cancel") return renderProgrammeEditor();
      workout.name = nextName;
      finishWeekChange(programme, week, scope);
    });
    const deleteDay = document.createElement("button");
    deleteDay.type = "button";
    deleteDay.className = "delete-day-button";
    deleteDay.setAttribute("aria-label", `Delete ${workout.name}`);
    deleteDay.innerHTML = '<svg aria-hidden="true"><use href="#icon-trash"></use></svg>';
    deleteDay.addEventListener("click", async () => {
      if (!await showSpotConfirm(
        `Delete ${workout.name}?`,
        "All exercises in this training day will also be removed.",
        { confirmText: "Delete Day", danger: true }
      )) return;
      const scope = await chooseWeekScope(programme, week);
      if (scope === "cancel") return;
      week.trainingDays.splice(workoutIndex, 1);
      finishWeekChange(programme, week, scope);
    });
    const expandDay = document.createElement("button");
    expandDay.type = "button";
    expandDay.className = "editor-expand-day";
    expandDay.setAttribute("aria-label", expandedEditorDays.has(workout.id) ? `Collapse ${workout.name}` : `Expand ${workout.name}`);
    expandDay.innerHTML = '<svg aria-hidden="true"><use href="#icon-arrow-right"></use></svg>';
    expandDay.addEventListener("click", () => {
      expandedEditorDays.has(workout.id)
        ? expandedEditorDays.delete(workout.id)
        : expandedEditorDays.add(workout.id);
      renderProgrammeEditor();
    });
    dayHeader.addEventListener("click", event => {
      if (!event.target.closest("button,input")) expandDay.click();
    });
    dayHeader.append(handle, name, deleteDay, expandDay);
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
      prescription.textContent = formatExercisePrescription(exercise);
      copy.append(exerciseName, prescription);
      if (exercise.note) {
        const note = document.createElement("p");
        note.className = "exercise-note";
        note.textContent = exercise.note;
        copy.appendChild(note);
      }
      const menu = createOverflowMenu(`${exercise.name} options`, [
        {
          label: "Edit exercise",
          run: () => editExercise(programme, week, workout, exercise)
        },
        {
          label: "Remove exercise",
          danger: true,
          run: async () => {
            if (!await showSpotConfirm(
              `Remove ${exercise.name}?`,
              "This exercise will be removed from the selected weeks.",
              { confirmText: "Remove", danger: true }
            )) return;
            const scope = await chooseWeekScope(programme, week);
            if (scope === "cancel") return;
            workout.exercises.splice(exerciseIndex, 1);
            finishWeekChange(programme, week, scope);
          }
        }
      ]);
      const star = document.createElement("button");
      star.type = "button";
      star.className = "exercise-star-button";
      star.classList.toggle("is-starred", Boolean(exercise.starred));
      star.innerHTML = '<svg aria-hidden="true"><use href="#icon-star-round"></use></svg>';
      star.setAttribute("aria-label", exercise.starred ? `Unstar ${exercise.name}` : `Star ${exercise.name}`);
      star.addEventListener("click", () => {
        const nextValue = !exercise.starred;
        const exerciseName = String(exercise.name || "").trim().toLowerCase();
        programme.weeks.filter(item => item.number >= week.number).forEach(item => {
          (item.trainingDays || []).forEach(day => (day.exercises || []).forEach(candidate => {
            if (String(candidate.name || "").trim().toLowerCase() === exerciseName) candidate.starred = nextValue;
          }));
        });
        saveEditedProgramme(programme);
        renderProgrammeEditor();
      });
      const actions = document.createElement("div");
      actions.className = "editor-exercise-actions";
      actions.append(star, menu);
      row.append(copy, actions);
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

  const readOnly = !programme.isDraft && !editorIsEditing;
  [...header.querySelectorAll("input, button"), ...container.querySelectorAll("input, button")]
    .forEach(control => { control.disabled = readOnly && !control.classList.contains("editor-expand-day"); });
  weekSelect.disabled = false;
}

let exerciseDialogContext = null;

function updateExerciseTypeFields() {
  const type = document.getElementById("exerciseTypeInput")?.value || "strength";
  const strengthFields = document.getElementById("strengthExerciseFields");
  const cardioFields = document.getElementById("cardioExerciseFields");
  const setsInput = document.getElementById("exerciseSetsInput");
  const repsInput = document.getElementById("exerciseRepsInput");
  const durationInput = document.getElementById("exerciseDurationInput");
  const nameLabel = document.getElementById("exerciseNameLabel");
  const nameInput = document.getElementById("exerciseNameInput");
  const noteInput = document.getElementById("exerciseNoteInput");
  const dialogTitle = document.getElementById("exerciseDialogTitle");
  const isEditing = Boolean(
    document.getElementById("exerciseDialogExerciseId")?.value
  );

  if (strengthFields) strengthFields.hidden = type !== "strength";
  if (cardioFields) cardioFields.hidden = type !== "cardio";
  if (setsInput) setsInput.required = type === "strength";
  if (repsInput) repsInput.required = type === "strength";
  if (durationInput) durationInput.required = type === "cardio";
  if (nameLabel) nameLabel.textContent = type === "cardio"
    ? "Activity name"
    : "Exercise name";
  if (nameInput) nameInput.placeholder = type === "cardio"
    ? "e.g. Treadmill"
    : "e.g. Bench Press";
  if (noteInput) noteInput.placeholder = type === "cardio"
    ? "e.g. 6% incline, steady pace"
    : "e.g. Slow lowering and keep elbows tucked";
  if (dialogTitle) dialogTitle.textContent = type === "cardio"
    ? `${isEditing ? "Edit" : "Add"} Cardio Activity`
    : `${isEditing ? "Edit" : "Add"} Exercise`;
}

document.getElementById("exerciseTypeInput")?.addEventListener(
  "change",
  updateExerciseTypeFields
);

function openExerciseDialog(programme, week, workout, exercise = null) {
  const dialog = document.getElementById("exerciseDialog");
  const form = document.getElementById("exerciseForm");
  if (!dialog || !form) return;

  form.reset();
  document.getElementById("exerciseDialogTitle").textContent =
    exercise ? "Edit Exercise" : "Add Exercise";
  document.getElementById("exerciseDialogWorkoutId").value = workout.id;
  document.getElementById("exerciseDialogExerciseId").value = exercise?.id || "";
  document.getElementById("exerciseTypeInput").value = exercise?.type || "strength";
  document.getElementById("exerciseNameInput").value = exercise?.name || "";
  document.getElementById("exerciseSetsInput").value = exercise?.sets || 3;
  document.getElementById("exerciseRepsInput").value =
    getExerciseRepTarget(exercise || { reps: 10 }).value;
  document.getElementById("exerciseWeightInput").value = exercise?.weight || "";
  document.getElementById("exerciseDurationInput").value =
    exercise?.durationMinutes || "";
  document.getElementById("exerciseNoteInput").value = exercise?.note || "";
  updateExerciseTypeFields();

  exerciseDialogContext = { programme, week, workout, exercise };
  dialog.showModal();
  document.getElementById("exerciseNameInput").focus();
}

function editExercise(programme, week, workout, exercise) {
  openExerciseDialog(programme, week, workout, exercise);
}

function addExerciseToDay(programme, week, workout) {
  openExerciseDialog(programme, week, workout);
}

document.getElementById("cancelExerciseDialog")?.addEventListener("click", () => {
  exerciseDialogContext = null;
  document.getElementById("exerciseDialog")?.close();
});

document.getElementById("exerciseForm")?.addEventListener("submit", async event => {
  event.preventDefault();
  if (!exerciseDialogContext) return;

  const name = document.getElementById("exerciseNameInput").value.trim();
  const type = document.getElementById("exerciseTypeInput").value;
  const sets = Number(document.getElementById("exerciseSetsInput").value);
  const repsTarget = parseExerciseRepTarget(
    document.getElementById("exerciseRepsInput").value
  );
  const weightText = document.getElementById("exerciseWeightInput").value.trim();
  const weight = weightText === "" ? "" : Number(weightText);
  const note = document.getElementById("exerciseNoteInput").value.trim();
  const durationMinutes = Number(
    document.getElementById("exerciseDurationInput").value
  );

  const invalidStrength = type === "strength" && (
    !Number.isInteger(sets) || sets < 1 ||
    !repsTarget ||
    (weightText !== "" && (!Number.isFinite(weight) || weight < 0))
  );
  const invalidCardio = type === "cardio" && (
    !Number.isInteger(durationMinutes) || durationMinutes < 1
  );

  if (!name || invalidStrength || invalidCardio) {
    await showSpotMessage(
      "Check the exercise",
      type === "cardio"
        ? "Please enter an activity name and valid target time."
        : "Please enter valid sets, reps such as 10 or 8-10, and weight."
    );
    return;
  }

  document.getElementById("exerciseDialog")?.close();

  const scope = await chooseWeekScope(
    exerciseDialogContext.programme,
    exerciseDialogContext.week
  );
  if (scope === "cancel") {
    exerciseDialogContext = null;
    return;
  }

  const values = type === "cardio"
    ? { name, type, durationMinutes, note }
    : {
        name,
        type,
        sets,
        reps: repsTarget.min,
        repsTarget: repsTarget.value,
        weight: weightText === "" ? "" : weight,
        note
      };
  if (exerciseDialogContext.exercise) {
    Object.assign(exerciseDialogContext.exercise, values);
  } else {
    exerciseDialogContext.workout.exercises.push({ id: createId(), ...values });
  }

  const { programme, week } = exerciseDialogContext;
  exerciseDialogContext = null;
  document.getElementById("exerciseDialog")?.close();
  finishWeekChange(programme, week, scope);
});

async function leaveProgrammeEditor() {
  const programme = getEditingProgramme();
  if (programme && !programme.isDraft && editorIsEditing) {
    const discard = await showSpotConfirm(
      "Discard unsaved changes?",
      "Your saved programme will remain unchanged.",
      { confirmText: "Discard", cancelText: "Keep Editing", danger: true }
    );
    if (!discard) return;
    editorWorkingProgramme = JSON.parse(JSON.stringify(editorOriginalProgramme));
    editorIsEditing = false;
  }
  if (!programme?.isDraft) {
    showPage("library");
    return;
  }
  document.getElementById("programmeExitDialog")?.showModal();
}

document.getElementById("programmeEditorBack")?.addEventListener(
  "click",
  leaveProgrammeEditor
);

document.getElementById("saveProgramme")?.addEventListener("click", async () => {
  const programme = getEditingProgramme();
  if (!programme) return;
  if (!programme.isDraft && !editorIsEditing) {
    editorOriginalProgramme = JSON.parse(JSON.stringify(programme));
    editorIsEditing = true;
    renderProgrammeEditor();
    return;
  }
  if (!programme.isDraft && editorIsEditing) {
    const week = getEditingWeek(programme);
    editorIsEditing = false;
    const scope = await chooseWeekScope(programme, week);
    editorIsEditing = true;
    if (scope === "cancel") return;
    if (scope === "future") {
      programme.weeks.filter(item => item.number > week.number).forEach(item => {
        item.trainingDays = cloneTrainingDays(week.trainingDays);
      });
    }
    editorIsEditing = false;
    const programmes = getProgrammes();
    const index = programmes.findIndex(item => item.id === programme.id);
    if (index >= 0) programmes[index] = programme;
    saveProgrammes(programmes);
    editorOriginalProgramme = JSON.parse(JSON.stringify(programme));
    renderLibrary();
    renderActiveWorkout();
    renderProgrammeEditor();
    return;
  }
  programme.isDraft = false;
  editorIsEditing = false;
  saveEditedProgramme(programme);
  showPage("library");
});

document.getElementById("discardProgrammeChanges")?.addEventListener("click", () => {
  if (!editorOriginalProgramme) return;
  editorWorkingProgramme = JSON.parse(JSON.stringify(editorOriginalProgramme));
  editorIsEditing = false;
  renderProgrammeEditor();
});

document.getElementById("commitProgrammeChanges")?.addEventListener("click", () => {
  document.getElementById("saveProgramme")?.click();
});

document.getElementById("cancelProgrammeExit")?.addEventListener("click", () => {
  document.getElementById("programmeExitDialog")?.close();
});

document.getElementById("saveProgrammeDraft")?.addEventListener("click", () => {
  document.getElementById("programmeExitDialog")?.close();
  showPage("library");
});

document.getElementById("discardProgrammeDraft")?.addEventListener("click", () => {
  const programme = getEditingProgramme();
  document.getElementById("programmeExitDialog")?.close();
  if (programme) {
    const programmes = getProgrammes().filter(item => item.id !== programme.id);
    saveProgrammes(programmes);
  }
  window.editingProgrammeId = null;
  renderLibrary();
  showPage("library");
});

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
  let originalOrder = null;
  handle.addEventListener("pointerdown", event => {
    holdTimer = setTimeout(() => {
      active = true;
      originalOrder = week.trainingDays.slice();
      card.classList.add("is-dragging");
      handle.setPointerCapture(event.pointerId);
    }, 350);
  });
  handle.addEventListener("pointermove", event => {
    if (!active) return;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest(".editor-day-card");
    if (!target || target === card) return;
    const dayCards = [...card.parentElement.querySelectorAll(".editor-day-card")];
    const before = new Map(dayCards.map(dayCard => [dayCard, dayCard.getBoundingClientRect().top]));
    const from = week.trainingDays.findIndex(item => item.id === workout.id);
    const to = week.trainingDays.findIndex(item => item.id === target.dataset.workoutId);
    if (from < 0 || to < 0) return;
    const [moved] = week.trainingDays.splice(from, 1);
    week.trainingDays.splice(to, 0, moved);
    target.parentNode.insertBefore(card, from < to ? target.nextSibling : target);
    dayCards.forEach(dayCard => {
      if (dayCard === card) return;
      const movement = before.get(dayCard) - dayCard.getBoundingClientRect().top;
      if (!movement) return;
      dayCard.animate(
        [{ transform: `translateY(${movement}px)` }, { transform: "translateY(0)" }],
        { duration: 190, easing: "cubic-bezier(.2,.75,.25,1)" }
      );
    });
  });
  const finish = async () => {
    clearTimeout(holdTimer);
    if (!active) return;
    active = false;
    card.classList.remove("is-dragging");
    const scope = await chooseWeekScope(programme, week);
    if (scope === "cancel") {
      week.trainingDays = originalOrder;
      renderProgrammeEditor();
      return;
    }
    finishWeekChange(programme, week, scope);
  };
  handle.addEventListener("pointerup", finish);
  handle.addEventListener("pointercancel", finish);
}

async function reorderDay(programme, week, sourceId, targetId) {
  const from = week.trainingDays.findIndex(item => item.id === sourceId);
  const to = week.trainingDays.findIndex(item => item.id === targetId);
  if (from < 0 || to < 0 || from === to) return;
  const scope = await chooseWeekScope(programme, week);
  if (scope === "cancel") return;
  const [moved] = week.trainingDays.splice(from, 1);
  week.trainingDays.splice(to, 0, moved);
  finishWeekChange(programme, week, scope);
}
