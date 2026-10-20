// FITNESS TRACKER — PROGRAMME EDITOR

let editingWeekNumber = null;
let weekSelectionProgrammeId = null;
let weekScopeResolver = null;
let exerciseDialogContext = null;


// GET PROGRAMME BEING EDITED
function getEditingProgramme() {
  return getProgrammes().find(
    programme =>
      programme.id ===
      window.editingProgrammeId
  );
}


// GET WEEK BEING EDITED
function getEditingWeek(
  programme = getEditingProgramme()
) {
  return programme?.weeks?.find(
    week =>
      week.number ===
      editingWeekNumber
  ) || null;
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

  if (
    typeof renderActiveWorkout ===
    "function"
  ) {
    renderActiveWorkout();
  }

  if (
    typeof renderLibrary ===
    "function"
  ) {
    renderLibrary();
  }
}


// COPY A WEEK'S TRAINING DAYS
function cloneTrainingDays(trainingDays) {
  return trainingDays.map(workout => ({
    ...workout,

    id: createId(),

    exercises:
      (workout.exercises || [])
        .map(exercise => ({
          ...exercise,
          id: createId()
        }))
  }));
}


// CHOOSE WHERE A CHANGE SHOULD APPLY
function chooseWeekScope(programme, week) {
  if (
    week.number >=
    programme.durationWeeks
  ) {
    return Promise.resolve("current");
  }

  const dialog =
    document.getElementById(
      "weekScopeDialog"
    );

  if (!dialog) {
    return Promise.resolve("current");
  }

  dialog.showModal();

  return new Promise(resolve => {
    weekScopeResolver = resolve;
  });
}


// WEEK-CHOICE BUTTONS
document
  .querySelectorAll("[data-week-scope]")
  .forEach(button => {
    button.addEventListener(
      "click",
      () => {
        const scope =
          button.dataset.weekScope;

        document
          .getElementById(
            "weekScopeDialog"
          )
          ?.close();

        if (weekScopeResolver) {
          weekScopeResolver(scope);
        }

        weekScopeResolver = null;
      }
    );
  });


// FINISH AND SAVE A WEEK CHANGE
function finishWeekChange(
  programme,
  week,
  scope
) {
  if (scope === "future") {
    programme.weeks
      .filter(
        item =>
          item.number > week.number
      )
      .forEach(item => {
        item.trainingDays =
          cloneTrainingDays(
            week.trainingDays
          );
      });
  }

  saveEditedProgramme(programme);
  renderProgrammeEditor();
}


// CREATE AN ELLIPSIS MENU
function createOverflowMenu(
  label,
  actions
) {
  const menu =
    document.createElement("details");

  menu.className = "overflow-menu";

  const summary =
    document.createElement("summary");

  summary.textContent = "⋯";

  summary.setAttribute(
    "aria-label",
    label
  );

  const panel =
    document.createElement("div");

  panel.className =
    "overflow-menu-panel";

  actions.forEach(action => {
    const button =
      document.createElement("button");

    button.type = "button";
    button.textContent = action.label;

    if (action.danger) {
      button.className =
        "danger-action";
    }

    button.addEventListener(
      "click",
      action.run
    );

    panel.appendChild(button);
  });

  menu.append(summary, panel);

  return menu;
}


// CREATE AN EDITABLE NAME
function createEditableName(
  value,
  label,
  onSave
) {
  const wrap =
    document.createElement("div");

  wrap.className = "editable-name";

  const title =
    document.createElement("h2");

  title.textContent = value;

  const edit =
    document.createElement("button");

  edit.type = "button";

  edit.className =
    "icon-button edit-name-button";

  edit.textContent = "✎";

  edit.setAttribute(
    "aria-label",
    label
  );

  edit.addEventListener(
    "click",
    () => {
      const input =
        document.createElement("input");

      input.type = "text";
      input.value = title.textContent;

      input.setAttribute(
        "aria-label",
        label
      );

      let finished = false;

      const finish = save => {
        if (finished) return;

        finished = true;

        const nextName =
          input.value.trim();

        if (save && nextName) {
          onSave(nextName);
        } else {
          renderProgrammeEditor();
        }
      };

      input.addEventListener(
        "keydown",
        event => {
          if (event.key === "Enter") {
            finish(true);
          }

          if (event.key === "Escape") {
            finish(false);
          }
        }
      );

      input.addEventListener(
        "blur",
        () => finish(true)
      );

      wrap.replaceChildren(input);

      input.focus();
      input.select();
    }
  );

  wrap.append(title, edit);

  return wrap;
}


// ADD TRAINING DAY
document
  .getElementById("addWorkout")
  ?.addEventListener(
    "click",
    async () => {
      const programme =
        getEditingProgramme();

      const week =
        getEditingWeek(programme);

      if (!programme || !week) return;

      const scope =
        await chooseWeekScope(
          programme,
          week
        );

      if (scope === "cancel") return;

      week.trainingDays.push({
        id: createId(),

        name:
          `Day ${
            week.trainingDays.length + 1
          }`,

        exercises: []
      });

      finishWeekChange(
        programme,
        week,
        scope
      );
    }
  );


// DISPLAY PROGRAMME EDITOR
function renderProgrammeEditor() {
  const programme =
    getEditingProgramme();

  const container =
    document.getElementById(
      "editorWorkouts"
    );

  const header =
    document.getElementById(
      "editorProgrammeHeader"
    );

  if (
    !programme ||
    !container ||
    !header
  ) {
    return;
  }

  if (
    weekSelectionProgrammeId !==
    programme.id
  ) {
    weekSelectionProgrammeId =
      programme.id;

    editingWeekNumber =
      programme.currentWeek || 1;
  }

  if (!getEditingWeek(programme)) {
    editingWeekNumber =
      programme.currentWeek || 1;
  }

  const week =
    getEditingWeek(programme);

  if (!week) return;

  header.innerHTML = "";
  container.innerHTML = "";


  // PROGRAMME NAME
  const nameCard =
    document.createElement("div");

  nameCard.className =
    "card editor-name-card";

  nameCard.appendChild(
    createEditableName(
      programme.name,
      "Edit programme name",
      nextName => {
        programme.name = nextName;

        saveEditedProgramme(
          programme
        );

        renderProgrammeEditor();
      }
    )
  );

  header.appendChild(nameCard);


  // WEEK SELECTOR
  const weekCard =
    document.createElement("div");

  weekCard.className =
    "card editor-week-card";

  const weekLabel =
    document.createElement("label");

  weekLabel.htmlFor =
    "editorWeekSelect";

  weekLabel.textContent = "Editing";

  const weekSelect =
    document.createElement("select");

  weekSelect.id =
    "editorWeekSelect";

  programme.weeks.forEach(
    optionWeek => {
      const option =
        document.createElement(
          "option"
        );

      option.value =
        optionWeek.number;

      option.textContent =
        `Week ${optionWeek.number}` +
        (
          optionWeek.number ===
          programme.currentWeek
            ? " — Current"
            : ""
        );

      option.selected =
        optionWeek.number ===
        editingWeekNumber;

      weekSelect.appendChild(option);
    }
  );

  weekSelect.addEventListener(
    "change",
    () => {
      editingWeekNumber =
        Number(weekSelect.value);

      renderProgrammeEditor();
    }
  );

  weekCard.append(
    weekLabel,
    weekSelect
  );

  container.appendChild(weekCard);


  // EMPTY WEEK
  if (
    week.trainingDays.length === 0
  ) {
    const empty =
      document.createElement("div");

    empty.className =
      "card empty-state-card";

    empty.textContent =
      "No training days have been added to this week.";

    container.appendChild(empty);
  }


  // TRAINING DAY CARDS
  week.trainingDays.forEach(
    (workout, workoutIndex) => {
      const card =
        document.createElement("div");

      card.className =
        "card editor-day-card";

      card.dataset.workoutId =
        workout.id;

      card.draggable = true;


      // DAY HEADER
      const dayHeader =
        document.createElement("div");

      dayHeader.className =
        "editor-day-header";

      const handle =
        document.createElement("button");

      handle.type = "button";
      handle.className = "drag-handle";
      handle.textContent = "≡";

      handle.setAttribute(
        "aria-label",
        `Hold and drag ${workout.name}`
      );


      // RENAME DAY
      const name =
        createEditableName(
          workout.name,
          `Rename ${workout.name}`,
          async nextName => {
            const scope =
              await chooseWeekScope(
                programme,
                week
              );

            if (scope === "cancel") {
              renderProgrammeEditor();
              return;
            }

            workout.name = nextName;

            finishWeekChange(
              programme,
              week,
              scope
            );
          }
        );


      // DAY MENU
      const dayMenu =
        createOverflowMenu(
          `${workout.name} options`,
          [
            {
              label: "Delete day",
              danger: true,

              run: async () => {
                const confirmed =
                  confirm(
                    `Delete ${workout.name} and all its exercises?`
                  );

                if (!confirmed) return;

                const scope =
                  await chooseWeekScope(
                    programme,
                    week
                  );

                if (
                  scope === "cancel"
                ) {
                  return;
                }

                week.trainingDays.splice(
                  workoutIndex,
                  1
                );

                finishWeekChange(
                  programme,
                  week,
                  scope
                );
              }
            }
          ]
        );

      dayHeader.append(
        handle,
        name,
        dayMenu
      );

      card.appendChild(dayHeader);


      // EXERCISE LIST
      const exerciseList =
        document.createElement("div");

      exerciseList.className =
        "editor-exercise-list";

      (workout.exercises || [])
        .forEach(
          (
            exercise,
            exerciseIndex
          ) => {
            const row =
              document.createElement(
                "div"
              );

            row.className =
              "editor-exercise-row";

            const copy =
              document.createElement(
                "div"
              );

            const exerciseName =
              document.createElement(
                "strong"
              );

            exerciseName.textContent =
              exercise.name;

            const prescription =
              document.createElement(
                "p"
              );

            prescription.textContent =
              `${exercise.sets} × ` +
              `${exercise.reps}` +
              (
                exercise.weight
                  ? ` @ ${exercise.weight} kg`
                  : ""
              );

            copy.append(
              exerciseName,
              prescription
            );


            // EXERCISE MENU
            const menu =
              createOverflowMenu(
                `${exercise.name} options`,
                [
                  {
                    label:
                      "Edit exercise",

                    run: () => {
                      editExercise(
                        programme,
                        week,
                        workout,
                        exercise
                      );
                    }
                  },

                  {
                    label:
                      "Remove exercise",

                    danger: true,

                    run: async () => {
                      const confirmed =
                        confirm(
                          `Remove ${exercise.name}?`
                        );

                      if (!confirmed) {
                        return;
                      }

                      const scope =
                        await chooseWeekScope(
                          programme,
                          week
                        );

                      if (
                        scope === "cancel"
                      ) {
                        return;
                      }

                      workout.exercises
                        .splice(
                          exerciseIndex,
                          1
                        );

                      finishWeekChange(
                        programme,
                        week,
                        scope
                      );
                    }
                  }
                ]
              );

            row.append(copy, menu);

            exerciseList.appendChild(
              row
            );
          }
        );

      card.appendChild(exerciseList);


      // ADD EXERCISE BUTTON
      const addExercise =
        document.createElement(
          "button"
        );

      addExercise.type = "button";

      addExercise.className =
        "editor-add-exercise";

      addExercise.textContent =
        "+ Add Exercise";

      addExercise.addEventListener(
        "click",
        () => {
          addExerciseToDay(
            programme,
            week,
            workout
          );
        }
      );

      card.appendChild(addExercise);

      addDayDragEvents(
        card,
        handle,
        programme,
        week,
        workout
      );

      container.appendChild(card);
    }
  );
}


// OPEN ADD OR EDIT EXERCISE FORM
function openExerciseDialog(
  programme,
  week,
  workout,
  exercise = null
) {
  const dialog =
    document.getElementById(
      "exerciseDialog"
    );

  const form =
    document.getElementById(
      "exerciseForm"
    );

  if (!dialog || !form) return;

  form.reset();

  document
    .getElementById(
      "exerciseDialogTitle"
    )
    .textContent =
      exercise
        ? "Edit Exercise"
        : "Add Exercise";

  document
    .getElementById(
      "exerciseDialogWorkoutId"
    )
    .value = workout.id;

  document
    .getElementById(
      "exerciseDialogExerciseId"
    )
    .value = exercise?.id || "";

  document
    .getElementById(
      "exerciseNameInput"
    )
    .value = exercise?.name || "";

  document
    .getElementById(
      "exerciseSetsInput"
    )
    .value = exercise?.sets || 3;

  document
    .getElementById(
      "exerciseRepsInput"
    )
    .value = exercise?.reps || 10;

  document
    .getElementById(
      "exerciseWeightInput"
    )
    .value = exercise?.weight || "";

  exerciseDialogContext = {
    programme,
    week,
    workout,
    exercise
  };

  dialog.showModal();

  document
    .getElementById(
      "exerciseNameInput"
    )
    .focus();
}


// EDIT EXERCISE
function editExercise(
  programme,
  week,
  workout,
  exercise
) {
  openExerciseDialog(
    programme,
    week,
    workout,
    exercise
  );
}


// ADD EXERCISE
function addExerciseToDay(
  programme,
  week,
  workout
) {
  openExerciseDialog(
    programme,
    week,
    workout
  );
}


// CANCEL EXERCISE FORM
document
  .getElementById(
    "cancelExerciseDialog"
  )
  ?.addEventListener(
    "click",
    () => {
      exerciseDialogContext = null;

      document
        .getElementById(
          "exerciseDialog"
        )
        ?.close();
    }
  );


// SAVE EXERCISE FORM
document
  .getElementById("exerciseForm")
  ?.addEventListener(
    "submit",
    async event => {
      event.preventDefault();

      if (!exerciseDialogContext) {
        return;
      }

      const name =
        document
          .getElementById(
            "exerciseNameInput"
          )
          .value
          .trim();

      const sets =
        Number(
          document
            .getElementById(
              "exerciseSetsInput"
            )
            .value
        );

      const reps =
        Number(
          document
            .getElementById(
              "exerciseRepsInput"
            )
            .value
        );

      const weightText =
        document
          .getElementById(
            "exerciseWeightInput"
          )
          .value
          .trim();

      const weight =
        weightText === ""
          ? ""
          : Number(weightText);

      if (
        !name ||
        !Number.isInteger(sets) ||
        sets < 1 ||
        !Number.isInteger(reps) ||
        reps < 1 ||
        (
          weightText !== "" &&
          (
            !Number.isFinite(weight) ||
            weight < 0
          )
        )
      ) {
        alert(
          "Please enter a valid exercise, sets, reps and weight."
        );

        return;
      }

      document
        .getElementById(
          "exerciseDialog"
        )
        ?.close();

      const scope =
        await chooseWeekScope(
          exerciseDialogContext
            .programme,

          exerciseDialogContext
            .week
        );

      if (scope === "cancel") {
        exerciseDialogContext = null;
        return;
      }

      const values = {
        name,
        sets,
        reps,

        weight:
          weightText === ""
            ? ""
            : weight
      };

      if (
        exerciseDialogContext.exercise
      ) {
        Object.assign(
          exerciseDialogContext
            .exercise,

          values
        );
      } else {
        exerciseDialogContext
          .workout
          .exercises
          .push({
            id: createId(),
            ...values
          });
      }

      const {
        programme,
        week
      } = exerciseDialogContext;

      exerciseDialogContext = null;

      finishWeekChange(
        programme,
        week,
        scope
      );
    }
  );


// DAY DRAGGING
function addDayDragEvents(
  card,
  handle,
  programme,
  week,
  workout
) {
  card.addEventListener(
    "dragstart",
    event => {
      card.classList.add(
        "is-dragging"
      );

      event.dataTransfer
        .effectAllowed = "move";

      event.dataTransfer
        .setData(
          "text/plain",
          workout.id
        );
    }
  );

  card.addEventListener(
    "dragend",
    () => {
      card.classList.remove(
        "is-dragging"
      );
    }
  );

  card.addEventListener(
    "dragover",
    event => {
      event.preventDefault();
    }
  );

  card.addEventListener(
    "drop",
    event => {
      event.preventDefault();

      const sourceId =
        event.dataTransfer
          .getData("text/plain");

      reorderDay(
        programme,
        week,
        sourceId,
        workout.id
      );
    }
  );

  let holdTimer;
  let active = false;
  let originalOrder = null;

  handle.addEventListener(
    "pointerdown",
    event => {
      holdTimer = setTimeout(
        () => {
          active = true;

          originalOrder =
            week.trainingDays.slice();

          card.classList.add(
            "is-dragging"
          );

          handle.setPointerCapture(
            event.pointerId
          );
        },
        350
      );
    }
  );

  handle.addEventListener(
    "pointermove",
    event => {
      if (!active) return;

      const target =
        document
          .elementFromPoint(
            event.clientX,
            event.clientY
          )
          ?.closest(
            ".editor-day-card"
          );

      if (
        !target ||
        target === card
      ) {
        return;
      }

      const from =
        week.trainingDays
          .findIndex(
            item =>
              item.id === workout.id
          );

      const to =
        week.trainingDays
          .findIndex(
            item =>
              item.id ===
              target.dataset.workoutId
          );

      if (
        from < 0 ||
        to < 0
      ) {
        return;
      }

      const [moved] =
        week.trainingDays.splice(
          from,
          1
        );

      week.trainingDays.splice(
        to,
        0,
        moved
      );

      target.parentNode.insertBefore(
        card,

        from < to
          ? target.nextSibling
          : target
      );
    }
  );

  const finish =
    async () => {
      clearTimeout(holdTimer);

      if (!active) return;

      active = false;

      card.classList.remove(
        "is-dragging"
      );

      const scope =
        await chooseWeekScope(
          programme,
          week
        );

      if (scope === "cancel") {
        week.trainingDays =
          originalOrder;

        renderProgrammeEditor();

        return;
      }

      finishWeekChange(
        programme,
        week,
        scope
      );
    };

  handle.addEventListener(
    "pointerup",
    finish
  );

  handle.addEventListener(
    "pointercancel",
    finish
  );
}


// REORDER DAY ON DESKTOP
async function reorderDay(
  programme,
  week,
  sourceId,
  targetId
) {
  const from =
    week.trainingDays.findIndex(
      item => item.id === sourceId
    );

  const to =
    week.trainingDays.findIndex(
      item => item.id === targetId
    );

  if (
    from < 0 ||
    to < 0 ||
    from === to
  ) {
    return;
  }

  const scope =
    await chooseWeekScope(
      programme,
      week
    );

  if (scope === "cancel") return;

  const [moved] =
    week.trainingDays.splice(
      from,
      1
    );

  week.trainingDays.splice(
    to,
    0,
    moved
  );

  finishWeekChange(
    programme,
    week,
    scope
  );
}
